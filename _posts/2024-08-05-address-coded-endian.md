---
last_modified_at: Tue, 6 Aug 2024 13:40:37 -0700  # 93601d2 address-coded-endian-elaboration
layout: post
title:  Address-coded endian
tags: memory endian computer-architecture
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
least-significant byte of the word, and to load the adjacent byte (its peer in
the same aligned halfword) into the next eight bits of the result (8..15), and
to repeat this pattern for chunks of 16 bits, and 32 bits if needed.

This makes the address bits which don't correspond to the aligned address into
swizzle bits describing the endianness of the data.

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

Suppose you have `__big_endian`, `__little_endian`, and the default
qualification is agnostic.  If you cast a pointer to `__big_endian` or
`__little_endian` you would rewrite the low address bits to change its swizzle.

If you cast from a specific endian pointer to an agnostic pointer then you
would leave those bits alone.  Functions receiving such pointers would support
data in any endianness.

But things get hairy when you change the size of the data type.  If you cast
from `__big_endian uint32_t*` to `uint8_t*` then you'll end up pointing to the
last byte of the word -- the least-significant byte -- rather than the first.
Even a simple `memcpy()` would do the wrong thing.

So when you cast from a large type to a smaller type you have to clear any
swizzle bits which would be promoted to address bits.  You can still retain any
bits that were swizzle bits.

The real trouble is going the other way.  If you're casting to an agnostic
pointer then you have to invent a swizzle policy.  You could 'extend' the last
swizzle bit if there's still one available, but in the case of `uint8_t*` and
`void*` there is no information.

And then there's `uintptr_t`.  Maybe C has policies for this, but if it doesn't
then let's just suppose for now that casting to integer types is a cast to
`void*` and then to the integer type.  And then back the other way also via
`void*`.  The alternative (keeping the raw bit pattern of the original pointer)
risks allowing somebody to cast from a big-endian pointer to an int and then to
a byte pointer starting in the wrong place.

So casting from `uint32_t*` to `void*` and back can lose information, and by
implication (at least the way I stated it) casting to `uintptr_t` also loses
information.

Is that a problem?  Casting was always dangerous if you didn't know what you
were doing, but would this require people to know more about what they're doing
than before?

Perhaps there's a better way.

[NUXI]: <https://en.wikipedia.org/wiki/Endianness#Middle-endian>
