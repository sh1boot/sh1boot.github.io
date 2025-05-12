---
last_modified_at: Sat, 10 May 2025 14:36:26 -0700  # b6e4134 update-bit-sliced-matmul
layout: post
title:  Bit-sliced matrix multiply
description: A rearrangement of a SIMD multiplication instruction which allows efficient implementation of matrix multiplication of less than eight-bit precision.
tags: matrix-multiply bit-slicing low-precision 8-bit needs-example needs-work
svg: true
---

There's a matrix multiplication in the middle of a lot of popular
things, right now, and it's in an operation which frequently tolerates
remarkably low precision.

In the SIMD world precision usually bottoms out at 8-bit.  You don't
save much CPU time by trying to get less precise than that, except for
marginal savings in how often you have to mitigate overflows.

But here's an operation which I think should exist.  Like matrix
multiply, but one argument is a vector of 8-bit values, and the other
argument is a vector of 64 1-bit values.

Rather than calculating a vector of eight-bit-by-eight-bit multiplies
with 16-bit results, it computes a vector of _sums_ of
one-bit-by-eight-bit multiplies, with eleven-bit results.

In other words, a vector of conditional sums of eight different
eight-bit inputs.

<svg width="100%" viewbox="0 0 800 608">
  <defs>
  {% for n in (0..7) -%}
    <g id="a{{n}}"><rect width="80" height="40" /><text x="40" y="20">a{{n}}</text></g>
  {% endfor -%}
  {% for n in (0..7) -%}
    <g id="b{{n}}"><rect width="10" height="40" /><text x="5" y="20" font-size="smaller">{{n}}</text></g>
    <g id="c{{n}}"><rect width="10" height="40" /><text x="5" y="20" font-size="smaller">{{n}}</text></g>
    <g id="d{{n}}"><rect width="10" height="40" /><text x="5" y="20" font-size="smaller">{{n}}</text></g>
  {% endfor -%}
  <g id="etc"><rect width="10" height="40" /><text x="5" y="20">&hellip;</text></g>
  </defs>
  <text x="40" y="40">Vsrc0</text>
  <text x="40" y="100">Vsrc1</text>
  <text x="40" y="580">Vdst</text>
  <text x="110" y="10">b</text>
  <text x="200" y="10">c</text>
  <text x="290" y="10">d</text>

  <text x="135" y="140">b</text>
  <text x="315" y="140">c</text>
  <text x="495" y="140">d</text>

  <text x="115" y="520">&plus;</text>
  <text x="295" y="520">&plus;</text>
  <text x="475" y="520">&plus;</text>
  {% for n in (0..7) -%}
    <text x="150" y="{{n | times: 50 | plus: 170}}">&times;</text>
    <text x="330" y="{{n | times: 50 | plus: 170}}">&times;</text>
    <text x="510" y="{{n | times: 50 | plus: 170}}">&times;</text>
    <text x="700" y="{{n | times: 50 | plus: 170}}">&hellip;</text>
  {% endfor -%}

  {% for n in (0..7) -%}
    <use href="#etc" x="{{n | times: 10 | plus: 340}}" y="20" />
    <use href="#etc" x="{{n | times: 10 | plus: 430}}" y="20" />
    <use href="#etc" x="{{n | times: 10 | plus: 520}}" y="20" />
    <use href="#etc" x="{{n | times: 10 | plus: 610}}" y="20" />
    <use href="#etc" x="{{n | times: 10 | plus: 700}}" y="20" />
  {% endfor -%}

  {% for n in (0..7) -%}
    <g class="blockgroup{{n | plus: 8}}">
    <use href="#b{{n}}" x="{{n | times: 10 | plus: 70}}" y="20" />
    <use href="#b{{n}}" x="130" y="{{n | times: 50 | plus: 150}}" />
    </g>
    <g class="blockgroup{{n | plus: 8}}">
    <use href="#c{{n}}" x="{{n | times: 10 | plus: 160}}" y="20" />
    <use href="#c{{n}}" x="310" y="{{n | times: 50 | plus: 150}}" />
    </g>
    <g class="blockgroup{{n | plus: 8}}">
    <use href="#d{{n}}" x="{{n | times: 10 | plus: 250}}" y="20" />
    <use href="#d{{n}}" x="490" y="{{n | times: 50 | plus: 150}}" />
    </g>
  {% endfor -%}

  {% for n in (0..7) -%}
    <g class="blockgroup{{n}}">
    <use href="#a{{n}}" x="{{n | times: 90 | plus: 70}}" y="80" />
    <use href="#a{{n}}" x="160" y="{{n | times: 50 | plus: 150}}" />
    <use href="#a{{n}}" x="340" y="{{n | times: 50 | plus: 150}}" />
    <use href="#a{{n}}" x="520" y="{{n | times: 50 | plus: 150}}" />
    </g>
  {% endfor -%}
  <line x1="110" y1="550" x2="245" y2="550" />
  <line x1="290" y1="550" x2="425" y2="550" />
  <line x1="470" y1="550" x2="605" y2="550" />
  <rect x="80"  y="560" width="50" height="40" />
  <text x="105" y="580">00000</text>
  <rect x="130" y="560" width="110" height="40" class="blockgroup0" />
  <rect x="260" y="560" width="50" height="40" />
  <text x="285" y="580">00000</text>
  <rect x="310" y="560" width="110" height="40" class="blockgroup1" />
  <rect x="440" y="560" width="50" height="40" />
  <text x="465" y="580">00000</text>
  <rect x="490" y="560" width="110" height="40" class="blockgroup2" />
  <rect x="620" y="560" width="50" height="40" />
  <text x="645" y="580">00000</text>
  <rect x="670" y="560" width="110" height="40" />
</svg>
(As an additional detail the pragmatist might want an accumulating
version of this, which also adds in the previous value of `Vdst`.)

So you take one of your input matrices and slice it into bitplanes.  So
that plane n represents a packed bitmap of bit n of each value in the
original matrix.

Now for each bit-plane you perform the matrix multiplications with
an instruction using conditional additions rather than multiplication.
You get eight multiply-accumulate operations done for the price of one
multiply-accumulate in eight-bit precision with smaller intermediates
and rarer overflow conditions; but only considering one bit of one of
the inputs.

In order to get the full precision one started with it's necessary to
repeat the operation for each bit-plane, and then shift and add the
results together.  But those additions happen outside of the innermost
loop so that cost is amortised, and the smaller intermediates may offset
that cost entirely.

But more importantly; if you only need five or six bits of precision,
then just quit early and save the remaining CPU time.

It seems to fit neatly into a SIMD architecture, but I'll have to go
into that detail when I have more time for it.

TODO: fill all this in.

### Beyond 64-bit

The instruction illustrated above distributes eight eight-bit values
across what might be taken as the full length of the vector.  If the
vector type is much longer than 64 bits this can create a
locality-of-refence problem in its implementation, and it may be
preferable to break off and use a new set of eight-bit values after
64-bits -- making this a self-contained 64x64-bit operation vectorised
across many 64-bit chunks.

Separate 64-bit splat instructions can redistribute the initial values
as far as needed, or other rows or columns can be spliced in as needed
if the original matrices are not especially wide, so that the potential
gains are not overshadowed by alignment padding.

### Number encodings other than two's complement

For signed data it would be an easy default to take the most significant
bit as having a negative weight and then all the other bits building
the weight back towards zero.  This isn't the only way to distribute the
weights.

Base -2 can be used, for example, with weights 1, -2, 4, -8, etc., which
can represent arbitrary signed values but in a way that the high bits
become zero for small values even if they're negative.  This can be
helpful for things like run-length encoding individual planes to avoid
large chunks of redundant work.

Since the bit weights are applied outside the inner loop, they don't
necessarily have to be powers of two, either.  They can be scaled for
better approximation of other distributions, or to bear some redundancy
so that lossy techniques may be tolerable in the above
chunking/optimisation/compression.
