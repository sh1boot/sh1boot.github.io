---
last_modified_at: Mon, 5 Aug 2024 16:24:02 -0700  # 784e533 address-coded-endian
layout: post
title:  Address-coded endian
categories: memory, hardware design, endian
svg: true
---
Many years ago I found in an old Arm manual a description of the permutation
that would happen to a 32-bit word loaded from an un-aligned offset.  I don't
recall what the pattern was, but it looked like the barrel shifter had been
repurposed to handle sub-word addressing of bytes and then masking deferred
because it was a full-width read, even though the address was rounded down.

I thought I might be able to do something more useful.  So I did.  Years later
I even got to implement it in a 3D pipeline, and when I did this I realised the
permutation logic was even cheaper than I'd imagined.  In fact it simplified
other logic around it for further PPA savings.

My approach is to always take the address as the address of the
least-significant byte of the word, and to load the adjacent byte into the next
eight bits of the result (8..15), and to repeat this pattern for chunks of 16
bits, and 32 bits if needed.

<svg viewbox="0 0 800 496">
  <defs>
    {%- for byte in (0..9) -%}
      <g id="b{{byte}}" class="block{{byte}}">
        <rect x="0" y="0" width="32" height="32"/>
        <text x="16" y="16">b{{byte}}</text>
      </g>
    {%- endfor -%}
    <g id="b_">
      <rect x="0" y="0" width="32" height="32"/>
      <text x="16" y="16">&hellip;</text>
    </g>
  </defs>
  <text x="72" y="12" style="text-anchor:end">address:</text>
  {% for i in (0..21) -%}
  <text x="{{i|times:32|plus:96}}" y="12">{{i}}</text>
  {%- endfor %}
  <text x="72" y="38" style="text-anchor:end">data:</text>
  {% for i in (0..9) -%}
  <use href="#b{{i}}" x="{{i|times:32|plus:80}}" y="22"/>
  {%- endfor %}
  {% for i in (10..21) -%}
  <use href="#b_" x="{{i|times:32|plus:80}}" y="22"/>
  {%- endfor %}

  <use href="#b{{i}}" x="{{i|times:32|plus:80}}" y="0"/>
  <text x="72" y="88" style="text-anchor:end">bits:</text>
  <text x="80" y="88" style="text-anchor:start">63</text>
  <text x="336" y="88" style="text-anchor:end">0</text>
  <text x="512" y="88" style="text-anchor:start">15</text>
  <text x="576" y="88" style="text-anchor:end">0</text>
  <text x="736" y="88" style="text-anchor:start">7</text>
  <text x="768" y="88" style="text-anchor:end">0</text>

  {% assign table = "7 6 5 4 3 2 1 0
                    :6 7 4 5 2 3 0 1
                    :5 4 7 6 1 0 3 2
                    :4 5 6 7 0 1 2 3
                    :3 2 1 0 7 6 5 4
                    :2 3 0 1 6 7 4 5
                    :1 0 3 2 5 4 7 6
                    :0 1 2 3 4 5 6 7
                    :_ _ _ _ _ _ 9 8
                    :_ _ _ _ _ _ 8 9" %}
  {% assign rows = table | split: ":" %}{% for row in rows -%}
    {% capture y%}{{forloop.index0|times:40|plus:96}}{%endcapture-%}
    <text x="76" y="{{y|plus:16}}" style="text-anchor:end;font-family:monospace">ld [{{forloop.index0}}]:</text>
    <text x="508" y="{{y|plus:16}}" style="text-anchor:end;font-family:monospace">ldh [{{forloop.index0}}]:</text>
    <text x="732" y="{{y|plus:16}}" style="text-anchor:end;font-family:monospace">ldb [{{forloop.index0}}]:</text>
    {% assign cells = row | split: " " %}{% for cell in cells -%}
      {% capture j%}{{forloop.index0}}{%endcapture-%}
      <use href="#b{{cell}}" x="{{j|times:32|plus:80}}" y="{{y}}"/>
      {% if forloop.index0 >= 6 -%}
        <use href="#b{{cell}}" x="{{j|minus:6|times:32|plus:512}}" y="{{y}}"/>
        {% if forloop.index0 >= 7 -%}
        <use href="#b{{cell}}" x="{{j|minus:7|times:32|plus:736}}" y="{{y}}"/>
        {%- endif %}
      {%- endif %}
    {%- endfor %}
  {%- endfor %}
</svg>

Masking and zero/sign extension is orthogonal.  Using masking instructions like
`ldw`, `ldh`, or `ldb` clears away the unwanted parts of the word and yields a
result "as-if" at the rounded-down word/halfword/byte address specified, but
swizzled to place the addressed byte in the least-significant bits.

If you use an aligned address, padded with zeroes, then you get a little-endian
read.  If you pad with all-ones then you get a big-endian read.  If you use a
mixture of padding bits then you get a [middle-endian][NUXI] operation.

What you _don't_ get is a contiguous fixed-endian read at an unaligned address.
Unaligned reads are what have become the convention in the modern world.  At
the same time as we became good at avoiding those, hardware became good at
offering them, and now everybody's addicted to them all over again.

Still, it's potentially useful in some application-specific tasks handling a
mix of little endian (the correct one) with network byte order (the [bit
parsing](/bitstream-endianness/) one).

What I found a little challenging about the concept was mulling over how to
manage pointer types and casting as a C language extension.

If you have a data type attribute `__big_endian`, and another
`__little_endian`, and a default case which is agnostic, the compiler can
deduce address fiddles associated with at least _some_ casting operations
between pointers.  If you cast from, say, `__big_endian uint32_t*` to the
agnostic `void*`, as would happen with a call to `memcpy()` you _must_ clear
those low-order bits during the cast because that function will act as if it
were a byte copy starting at the given address, so you want to start at the
first byte in memory rather than the least significant byte.

But when you cast from `__big_endian uint32_t*` to `uint32_t*` it might be
better to retain the low-order bits (the swizzle bits) rather than treat it as
a cast to the default endian so that a single function can take a pointer to
words (and even arrays of words) of arbitrary byte order.

So I think the compiler should clear some bits when casting from a big endian
type to a _smaller_ agnostic or little-endian type (where `void` is the
smallest type), and set those bits when casting from agnostic to a big endian
type.  Casting _to_ a specific-endian pointer modifies the bits, casting to an
agnostic pointer only modifies bits where the sizes don't match.

Does it all fall down at some point, I wonder?  I don't recall.  Casting was
always dangerous if you didn't know what you were doing, but does this require
people to know more about what they're doing than before?

[NUXI]: <https://en.wikipedia.org/wiki/Endianness#Middle-endian>