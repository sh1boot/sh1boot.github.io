---
layout: post
title:  A Latin-Square-based L1 cache layout
description: Using a solution to the Latin Squares problem as a memory slicing scheme to address convenient access to 2D memory patterns.
categories: cache, memory, hardware design
svg: true
draft: true
---
If I were going to build some kind of fantasy machine I would not fuss about
making it high-performance.  Mine would just be a mash-up of random things I
found interesting at some point.

One such random thing which I've worked with in the past and found interesting
is vector access to data on both axes of a two-dimensional buffer.  This can be
achieved by arranging independent memories as a solution to a [latin square][]
problem.

At some point long ago I decided it might be interesting to reason through
applying this as an L1 cache mapping.  There are reasons why that's not a very
good idea, but it amuses me and that alone makes it a good-enough idea.  It
re-frames the problem as answering a family of 2D gather operations much more
quickly.

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

With a latin square memory, you slice storage into, eg., eight memories so you
have eight different places you can access at the same time, places which no
longer need to be contiguous, and you arrange these memories in a
two-dimensional grid -- a square -- such that no row or column contains more
than one instance of that memory.

This means that that entire row, _or column_, can be accessed concurrently.  In
a normal single-SRAM memory only the row can be accessed concurrently -- and
normally only on an aligned boundary, giving the data alignment constraints of
the old days.  Even just splitting it into pairs of memories means being able
to satisfy at least some unaligned accesses.

Here we'll try splitting it into eight.  Like so:
<svg width="100%" height="400" viewbox="0 0 400 400">
  <defs>
    <clipPath id="clip40"><rect x="0" y="0" width="40" height="40" /></clipPath>
    {% for n in (0..15) %}
      <g id="mem{{n}}"><rect width="40" height="40" /><text x="20" y="20" clip-path="url(#clip40)">m{{n}}</text></g>
    {% endfor %}
    <g id="axes8">
    {% for n in (0..7) %}
    <text x="{{forloop.index0 | times: 40 | plus: 60}}" y="20">{{n}}</text>
    <text x="20" y="{{forloop.index0 | times: 40 | plus: 60}}">{{n}}</text>
    {% endfor %}
    </g>
    <g id="axes9">
    {% for n in (0..8) %}
    <text x="{{forloop.index0 | times: 40 | plus: 60}}" y="20">{{n}}</text>
    <text x="20" y="{{forloop.index0 | times: 40 | plus: 60}}">{{n}}</text>
    {% endfor %}
    </g>
  </defs>
  <use href="#axes8" />
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
      <g class="blockgroup{{m}}">
      {% assign rows = table | split: ":" %} {% for row in rows %}
      {% assign cells = row | split: " " %} {% for cell in cells %} {% if cell == m %}
      <use href="#mem{{cell}}"  x="{{forloop.index0 | times: 40 | plus: 40}}" y="{{forloop.parentloop.index0 | times: 40 | plus: 40}}" />
      {% endif %} {% endfor %} {% endfor %}
      </g>
    {% endfor %}
  </g>
</svg>

In this configuration the memory number at each position is the column number
exclusive-ored with the bit-reversed row number.

Observe that each row and each column contains 8 different memories.  Any
rectangle 1x8 or 8x1 at any whole position touches each memory only once.
There are also some 2x4 and 4x2 sub-rectangle positions which work, but not all
of them.  With more memories you can get more rectangle options.

Generally you can address any rectangle at its natural alignment on both axes,
plus one additional axis of freedom on top of that.

In the case of 8x1 and 1x8 that means anywhere at all.  But if you have a 2x4
or 4x2 you can slide arbitrarily on the vertical or horizontal axis away from
natural alignment, but not always both.  Sometimes you get conflicts in the
corners.

Are there better solutions?

Hmm...

Well, there's the diagonal stripe solution, but that gets us no sub-rectangles
at all!
<svg width="100%" height="400" viewbox="0 0 400 400">
  <use href="#axes8" />
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
      <g class="blockgroup{{m}}">
      {% assign rows = table | split: ":" %} {% for row in rows %}
      {% assign cells = row | split: " " %} {% for cell in cells %} {% if cell == m %}
      <use href="#mem{{cell}}"  x="{{forloop.index0 | times: 40 | plus: 40}}" y="{{forloop.parentloop.index0 | times: 40 | plus: 40}}" />
      {% endif %} {% endfor %} {% endfor %}
      </g>
    {% endfor %}
  </g>
</svg>

Or exclusive-or without the bit-reverse.  The sub-rectangle situation there
looks pretty dire, too:
<svg width="100%" height="400" viewbox="0 0 400 400">
  <use href="#axes8" />
  <g id="diagonal">
    {% assign table = "0 1 2 3 4 5 6 7
                      :1 0 3 2 5 4 7 6
                      :2 3 0 1 6 7 4 5
                      :3 2 1 0 7 6 5 4
                      :4 5 6 7 0 1 2 3
                      :5 4 7 6 1 0 3 2
                      :6 7 4 5 2 3 0 1
                      :7 6 5 4 3 2 1 0" %}
    {% assign pass = "0 1 2 3 4 5 6 7" | split: " " %} {% for m in pass %}
      <g class="blockgroup{{m}}">
      {% assign rows = table | split: ":" %} {% for row in rows %}
      {% assign cells = row | split: " " %} {% for cell in cells %} {% if cell == m %}
      <use href="#mem{{cell}}"  x="{{forloop.index0 | times: 40 | plus: 40}}" y="{{forloop.parentloop.index0 | times: 40 | plus: 40}}" />
      {% endif %} {% endfor %} {% endfor %}
      </g>
    {% endfor %}
  </g>
</svg>

This one doesn't help in any way, but I wanted to try to draw a base-3 solution
just to see what it looked like:
<svg width="100%" height="440" viewbox="0 0 440 440">
  <use href="#axes9" />
  <g id="diagonal">
    {% assign table = "0 1 2 3 4 5 6 7 8 
                      :3 4 5 6 7 8 0 1 2 
                      :6 7 8 0 1 2 3 4 5 
                      :1 2 0 4 5 3 7 8 6 
                      :4 5 3 7 8 6 1 2 0 
                      :7 8 6 1 2 0 4 5 3 
                      :2 0 1 5 3 4 8 6 7 
                      :5 3 4 8 6 7 2 0 1 
                      :8 6 7 2 0 1 5 3 4" %}
    {% assign pass = "0 1 2 3 4 5 6 7 8" | split: " " %} {% for m in pass %}
      <g class="blockgroup{{m}}">
      {% assign rows = table | split: ":" %} {% for row in rows %}
      {% assign cells = row | split: " " %} {% for cell in cells %} {% if cell == m %}
      <use href="#mem{{cell}}"  x="{{forloop.index0 | times: 40 | plus: 40}}" y="{{forloop.parentloop.index0 | times: 40 | plus: 40}}" />
      {% endif %} {% endfor %} {% endfor %}
      </g>
    {% endfor %}
  </g>
</svg>

It turns out that a full-sized sub-rectangle at an arbitrary offset is
impossible.  Changing the constraints might help, but I like the features we
started with, so I'm sticking with it.

Now the trick is to figure out how to map this rectangle into linear memory in
a way that's useful for handling image data.

And to figure out, for a given (x,y) and shape, what are the proper addresses
for each of the memories involved.

And to figure out what the proper permutation is to bring that data back into
the expected order in a vector register.

TODO: discuss all that...

### Physical memory mapping ###

TODO

### Address generation ###

Given `N` banks (assumed to be a power of two), mapped into a grid `M` wide
(assumed to be a multiple of `N`) we might map the coordinates and banks this
way:

```c
inline uint32_t bitrev(uint32_t x, int N) {
  return __builtin_bitreverse32(x) >> (32 - N);
}

inline uint8_t bank(int x, int y) {
  return bitrev(x % N, N) ^ (y % N);
}

inline size_t addr(int x, int y) {
  return (y + (x / N)) * M + (x / N);
}
```

However, for a SIMD-like access we do not want to calculate `N` different
addresses and figure out which banks they go to after the fact.

That is to say, this will not do (it will not synthesise nicely):

```c
void addr(size_t (&addrs)[N], int x, int y, int width) {
  for (int i = 0; i * width < N; ++i) {
    for (int j = 0; j < width; ++j) {
      int xx = x + j, yy = y + i;
      addrs[bank(xx, yy)] = addr(xx, yy);
    }
  }
}
```

Rather, we want to calculate directly the appropriate address:
```c
void addr(size_t (&addrs)[N], int x, int y, int width) {
  for (int i = 0; i < N; ++i) {
    addrs[i] = /* TODO: something here */;
  }
}
```

### Linearising/rasterising the data ###

Given answers from every bank for a vector access, we can calculate which input
belongs in which SIMD lane like so:
```c++
template <typename T>
void unswizzle(T (&output)[N], T const (&input)[N], int x, int y, int width) {
  for (int i = 0; (i * width) < N; ++i) {
    for (int j = 0; j < width; ++j) {
      int xx = x + j, yy = y + i;
      output[N] = input[bank(xx, yy)];
    }
  }
}
```
This can be simplifed, but we can leave that to the tools to figure out.

This pre-supposes conventional raster order is what's desired.  That's not
necessarily a given, but the above function can be adapted as needed.

### Applications ###

TODO

[latin square]: https://en.wikipedia.org/wiki/Latin_square
[fantasy console]: https://en.wikipedia.org/wiki/Fantasy_console
