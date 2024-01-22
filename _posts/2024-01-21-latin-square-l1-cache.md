---
layout: post
title:  "A Latin-Square-based L1 cache layout"
categories: cache
draft: true
---
{% include svg.html %}

If I were going to build some kind of fantasy machine, I would not fuss about
making it fast.  That's what people do when they don't have any other ideas.
Mine would just be quirky.

One of the quirks I thought would be interesting was to arrange the L1 cache as
a solution to a [latin square][] problem, and plumb it in such a way as to
answer specific constant-stride vector loads in a single operation.  This would
open up a variety of fast two-dimensional addressing modes.

Clearly memory DRAM fetches still need to be in somewhat contiguous chunks, and
this makes contemplating cache eviction strategies uncomfortable in the context
of weird strides, but I'll save that for another time.

Here I'll just describe a memory layout.

The general idea is to slice memory into several concurrently-addressable
SRAMs.  The usual constraint on a memory is that it can only read or write data
at one address on a given cycle.  So if you slice your 64-bit word into two
32-bit words in separate SRAMs you might then be able to read 32-bits from one
SRAM and 32-bits from another SRAM at a different address in the same clock
cycle.  But each memory only has half the data.

With a latin square memory, you slice storage into, eg., 16 memories, so you
have 16 different places you can access at the same time, which don't need to
be contiguous, and you arrange these memories in a two-dimensional grid -- a
square -- such that no row or column contains more than one instance of that memory.

This means that that entire row, _or column_, can be accessed concurrently.  In
a normal chunky memory only the row can be accessed concurrently -- and
normally only on an aligned boundary, giving the data alignment constraints of
the old days.

Here's a solution:
<svg width="100%" height="400" viewbox="0 0 400 400">
  <defs>
    <mask id="mask40"><rect x="0" y="0" width="40" height="40" fill="white" fill-opacity="1.0" /></mask>
    {% for n in (0..7) %}
      <g id="mem{{n}}"><rect width="40" height="40" /><text x="20" y="20" mask="url(#mask40)">m{{n}}</text></g>
    {% endfor %}
  </defs>
  <g id="bitrev_xor">
    {% assign table = "0 1 2 3 4 5 6 7
                      :4 5 6 7 0 1 2 3
                      :2 3 0 1 6 7 4 5
                      :6 7 4 5 2 3 0 1
                      :1 0 3 2 5 4 7 6
                      :5 4 7 6 1 0 3 2
                      :3 2 1 0 7 6 5 4
                      :7 6 5 4 3 2 1 0" %}
    {% assign pass = "0 1 2 3 4 5 6 7" | split: " " %} {% for m in pass %}
      <g class="block{{m}}">
      {% assign rows = table | split: ":" %} {% for row in rows %}
      {% assign cells = row | split: " " %} {% for cell in cells %} {% if cell == m %}
      <use href="#mem{{cell}}"  x="{{forloop.index0 | times: 40 | plus: 40}}" y="{{forloop.parentloop.index0 | times: 40 | plus: 40}}" />
      {% endif %} {% endfor %} {% endfor %}
      </g>
    {% endfor %}
  </g>
</svg>

Here, if you number the rows 0..7 top to bottom, and the columns 0..7 left to
right, then the memory number at each position is the column number
exclusive-ored with the bit-reversed row number.

Observe that each row and each column contains 8 different memories.  Any
rectangle 1x8 or 8x1 at any whole position touches each memory only once.  This
also holds for 2x4 and 4x2.  With more memories you can get more rectangle
options.

If you extend this square in a repeating pattern in both directions, then the
property continues at arbitrary offsets _iff_ only one axis is offset from
natural alignment (product of its length on that axis) at a time.

What stands out is the collision of the corners if you try to straddle four
tiles at once.  There are many latin square solutions, so Can we do better than
this?

Hmm...

Well, there's the diagonal stripe solution, but that gets us no sub-rectangles
at all!

<svg width="100%" height="400" viewbox="0 0 400 400">
  <g id="diagonal">
    {% assign table = "0 1 2 3 4 5 6 7
                      :1 2 3 4 5 6 7 0
                      :2 3 4 5 6 7 0 1
                      :3 4 5 6 7 0 1 2
                      :4 5 6 7 0 1 2 3
                      :5 6 7 0 1 2 3 4
                      :6 7 0 1 2 3 4 5
                      :7 0 1 2 3 4 5 6" %}
    {% assign pass = "0 1 2 3 4 5 6 7" | split: " " %} {% for m in pass %}
      <g class="block{{m}}">
      {% assign rows = table | split: ":" %} {% for row in rows %}
      {% assign cells = row | split: " " %} {% for cell in cells %} {% if cell == m %}
      <use href="#mem{{cell}}"  x="{{forloop.index0 | times: 40 | plus: 40}}" y="{{forloop.parentloop.index0 | times: 40 | plus: 40}}" />
      {% endif %} {% endfor %} {% endfor %}
      </g>
    {% endfor %}
  </g>
</svg>

I believe, though I'm not certain, that there's no solution giving
arbitrary-offset rectangles wider and taller than 1.

So let's just stick with the first one.

Now the trick is to figure out how to map this rectangle into linear memory in
a way that's useful for handling image data.

And to figure out, for a given (x,y) and shape, what are the proper addresses
for each of the memories involved.

And to figure out what the proper permutation is to bring that data back into
the expected order in a vector register.

TODO: discuss all that... but I'm going to upload this now because I've been
amusing myself with css.

[latin square]: https://en.wikipedia.org/wiki/Latin_square
[fantasy console]: https://en.wikipedia.org/wiki/Fantasy_console
