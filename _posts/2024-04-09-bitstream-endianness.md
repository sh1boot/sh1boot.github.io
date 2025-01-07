---
last_modified_at: Tue, 11 Jun 2024 17:41:44 -0700  # 79f5c7a tidy-up-headers-add-descriptions
layout: post
title:  On the endianness of bitstreams
description: Contrasting the benefits of big-endian and little-endian packing in bitstreams and observing that one consequence shows up in Zstandard.
tags: bitstream endian bit-parsing zstd zlib deflate
svg: true
---
Where I'm from conventional wisdom has always been that while it's an objective
fact that little endian is the one-true-and-correct endian, bit-streams should
always be packed as big-endian data.

It's a constant source of amusement (actually frustration) to see another data
format stumble with this because x86 is little endian and ARM is little endian,
and everything that matters is little endian, and somebody thinks they can
simplify something by doing their bit packing in little endian as well.

I don't think that's a good idea.

Consider three symbols, a, b, and c, of different bit lengths laid out in a
little-endian bit string:

<svg width="100%" height="50" viewbox="0 0 600 50">
  <defs>
    <g id="byte_le">
      <text x="11" y="12">0</text>
      <text x="165" y="12">7</text>
      <rect x="0" y="24" width="176" height="24" fill="none"/>
    </g>
    <g id="byte">
      <text x="165" y="12">0</text>
      <text x="11" y="12">7</text>
      <rect x="0" y="24" width="176" height="24" fill="none"/>
    </g>
    {% assign table = " a0 a1 a2 a3 a4 a5
                      : b0 b1 b2 b3
                      : c0 c1 c2 c3 c4 c5 c6 c7 c8" %}
    {%- assign rows = table | split: ":" -%}
    {%- for row in rows -%}
      {%- assign cells = row | split: " " -%}
      {%- for cell in cells -%}
        <g id="{{cell}}" class="block{{forloop.parentloop.index0}}">
          <rect x="0" y="24" width="22" height="24" />
          <text x="11" y="36"><tspan>{{cell | split: "" | first}}<tspan font-size="60%" dy="10%">{{cell | split: "" | last}}</tspan>
          </tspan></text>
        </g>
      {%- endfor -%}
    {%- endfor -%}
    <g id="_">
      <rect x="0" y="24" width="22" height="24" stroke-opacity="20%" />
    </g>
  </defs>

  <use href="#byte" x="0" y="0" />
  {%- assign bits = "b1 b0 a5 a4 a3 a2 a1 a0" | split: " " -%}
  {%- for bit in bits -%}
    <use href="#{{bit}}" x="{{forloop.index0 | times: 22 | plus: 0}}" y="0" />
  {%- endfor -%}

  <use href="#byte" x="200" y="0" />
  {%- assign bits = "c5 c4 c3 c2 c1 c0 b3 b2" | split: " " -%}
  {%- for bit in bits -%}
    <use href="#{{bit}}" x="{{forloop.index0 | times: 22 | plus: 200}}" y="0" />
  {%- endfor -%}

  <use href="#byte" x="400" y="0" />
  {%- assign bits = "_ _ _ _ _ c6 c7 c8" | split: " " -%}
  {%- for bit in bits -%}
    <use href="#{{bit}}" x="{{forloop.index0 | times: 22 | plus: 400}}" y="0" />
  {%- endfor -%}
</svg>

Wait, what?  That looks wrong.

Well, yeah.  The convention is to write our bytes out in big-endian order, but
we're describing a little-endian bit string, which makes things look disjoint.
Here's the same layout but with the least-significant bit of each byte written
on the left:

<svg width="100%" height="50" viewbox="0 0 600 50">
  <use href="#byte_le" x="0" y="0" />
  {%- assign bits = "a0 a1 a2 a3 a4 a5 b0 b1" | split: " " -%}
  {%- for bit in bits -%}
    <use href="#{{bit}}" x="{{forloop.index0 | times: 22 | plus: 0}}" y="0" />
  {%- endfor -%}

  <use href="#byte_le" x="200" y="0" />
  {%- assign bits = "b2 b3 c0 c1 c2 c3 c4 c5" | split: " " -%}
  {%- for bit in bits -%}
    <use href="#{{bit}}" x="{{forloop.index0 | times: 22 | plus: 200}}" y="0" />
  {%- endfor -%}

  <use href="#byte_le" x="400" y="0" />
  {%- assign bits = "c6 c7 c8 _ _ _ _ _ " | split: " " -%}
  {%- for bit in bits -%}
    <use href="#{{bit}}" x="{{forloop.index0 | times: 22 | plus: 400}}" y="0" />
  {%- endfor -%}
</svg>

The implication for little-endian is that if you read just the first byte of
the bitstream then you get the least-significant bits of some symbol first
(depending on its size you may have all the bit of that symbol and the low bits
of the symbol after it, but let's not get ahead of ourselves).  If there are
more significant bits to be read in, as is the case with symbols b and c above,
then they'll be in the next byte.

This is consistent with a little-endian architecture where loading a word at
that address means you can just shift the relevant bits into place.

Now looking at [Deflate][], for example, it's notionally described as a
little-endian format but when it comes to stuffing Huffman codes into the
bitstream the codes are expressed in reverse order from the way they're
constructed.

This is because the first bits you can extract are the least-significant bits,
and with variable-length codes you can't know how big the symbol is (how many
bits you need to decode it) until you've interpreted a portion of the prefix.
So the prefix here must be the least-significant bits, which you decode early
in order to figure out the length of the whole code.

This makes building Huffman tables a bit of a headache (which in the case of
zlib this is done fairly frequently) because equivalent codes with unused
suffixes jump around throughout the table, and it means you can't pull more
bits than you need and use magnitude comparison to decide which family of code
lengths a symbol belongs to (which is normally a thing you can do with
[canonical Huffman][], like zlib uses).

Here's the same data packed as a big-endian bit stream:

<svg width="100%" height="50" viewbox="0 0 600 50">
  <use href="#byte" x="0" y="0" />
  {%- assign bits = "a5 a4 a3 a2 a1 a0 b3 b2" | split: " " -%}
  {%- for bit in bits -%}
    <use href="#{{bit}}" x="{{forloop.index0 | times: 22 | plus: 0}}" y="0" />
  {%- endfor -%}

  <use href="#byte" x="200" y="0" />
  {%- assign bits = "b1 b0 c8 c7 c6 c5 c4 c3" | split: " " -%}
  {%- for bit in bits -%}
    <use href="#{{bit}}" x="{{forloop.index0 | times: 22 | plus: 200}}" y="0" />
  {%- endfor -%}

  <use href="#byte" x="400" y="0" />
  {%- assign bits = "c2 c1 c0 _ _ _ _ _ " | split: " " -%}
  {%- for bit in bits -%}
    <use href="#{{bit}}" x="{{forloop.index0 | times: 22 | plus: 400}}" y="0" />
  {%- endfor -%}
</svg>

(going back to the original convention because it makes sense this time)

Now the next byte always contains the most significant bits of the next symbol.
Meaning for canonical Huffman that the prefix must be the most significant bits
and so the most significant bits must code the length of the symbol.

Now if you read at least enough bits to decode any symbol, then comparing those
bits with a threshold will work, and that can tell you how long the symbol is
without a lookup table and in other coding schemes (eg., arithmetic or range
coding) it may tell you the value of the symbol as well.

The joke is that there's nothing inherently better about big-endian bit
packing, but it just means that if you want to go little-endian then you should
read your bitstream starting from the far end (the higher addresses) where the
most-significant bits are.

So recently, when I was digging through [Zstd][], I was amused to see that
while it's yet another coding system using a little-endian packing, it does
indeed start at the far end!

I haven't analysed it that deeply.  I don't really know how [ANS][] works and I
can't assert that it would all come out in the conventional order by turning
the whole thing into a big-endian format.  I just found it amusing.  So I wrote
this post.

[Deflate]: <https://en.wikipedia.org/wiki/Deflate>
[Zstd]: <https://en.wikipedia.org/wiki/Zstd>
[Canonical Huffman]: <https://en.wikipedia.org/wiki/Canonical_Huffman_code>
[ANS]: <https://en.wikipedia.org/wiki/Asymmetric_numeral_systems>
