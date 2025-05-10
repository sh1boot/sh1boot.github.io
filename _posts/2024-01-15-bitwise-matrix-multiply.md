---
last_modified_at: Sat, 15 Feb 2025 00:38:19 -0800  # 79e252a lots-of-tagging-work
layout: post
title:  Bit-sliced matrix multiply
description: A rearrangement of a SIMD multiplication instruction which allows efficient implementation of matrix multiplication of less than eight-bit precision.
tags: matrix-multiply bit-slicing low-precision 8-bit needs-example needs-work
svg: true
---

There's a matrix multiplication in the middle of a lot of popular
things, right now, and it's an operation which frequently tolerates
remarkably low precision.

In the SIMD world precision usually bottoms out at 8-bit.  You don't
save much CPU time by trying to get less precise than that, except for
marginal savings in how often you have to mitigate overflows.

But here's an operation which I think should exist.  Like matrix
multiply in a SIMD instruction, but one argument is a vector of 8-bit
values, and the other argument is a vector of 64 1-bit values.

Now, rather than calculating a vector of eight-bit-by-eight-bit
multiplies with 16-bit results, it computes a vector of _sums_ of
one-bit-by-eight-bit multiplies, with eleven-bit results.

In other words, a vector of conditional sums of eight different
eight-bit inputs.

<svg width="100%" height="608" viewbox="0 0 800 608">
  <defs>
  {% for n in (0..7) -%}
    <g id="a{{n}}"><rect width="80" height="40" class="blockgroup{{n | plus: 0}}" /><text x="40" y="20">a{{n}}</text></g>
  {% endfor -%}
  {% for n in (0..7) -%}
    <g id="b{{n}}"><rect width="10" height="40" class="blockgroup{{n | plus: 8}}" /><text x="5" y="20" font-size="smaller">{{n}}</text></g>
    <g id="c{{n}}"><rect width="10" height="40" class="blockgroup{{n | plus: 8}}" /><text x="5" y="20" font-size="smaller">{{n}}</text></g>
    <g id="d{{n}}"><rect width="10" height="40" class="blockgroup{{n | plus: 8}}" /><text x="5" y="20" font-size="smaller">{{n}}</text></g>
  {% endfor -%}
  <g id="etc"><rect width="10" height="40" /><text x="5" y="20">&hellip;</text></g>
  </defs>
  <text x="40" y="40">Vsrc0</text>
  <text x="40" y="100">Vsrc1</text>
  <text x="110" y="10">b</text>
  <text x="200" y="10">c</text>
  <text x="290" y="10">d</text>
  {% for n in (0..7) -%}
    <use href="#b{{n}}" x="{{n | times: 10 | plus: 70}}" y="20" />
    <use href="#c{{n}}" x="{{n | times: 10 | plus: 160}}" y="20" />
    <use href="#d{{n}}" x="{{n | times: 10 | plus: 250}}" y="20" />
    <use href="#etc" x="{{n | times: 10 | plus: 340}}" y="20" />
    <use href="#etc" x="{{n | times: 10 | plus: 430}}" y="20" />
    <use href="#etc" x="{{n | times: 10 | plus: 520}}" y="20" />
    <use href="#etc" x="{{n | times: 10 | plus: 610}}" y="20" />
    <use href="#etc" x="{{n | times: 10 | plus: 700}}" y="20" />
    <use href="#a{{n}}" x="{{n | times: 90 | plus: 70}}" y="80" />
  {% endfor -%}

  <text x="135" y="140">b</text>
  <text x="315" y="140">c</text>
  <text x="495" y="140">d</text>
  {% for n in (0..7) -%}
    <use href="#b{{n}}" x="130" y="{{n | times: 50 | plus: 150}}" />
    <text x="150" y="{{n | times: 50 | plus: 170}}">&times;</text>
    <use href="#a{{n}}" x="160" y="{{n | times: 50 | plus: 150}}" />

    <use href="#c{{n}}" x="310" y="{{n | times: 50 | plus: 150}}" />
    <text x="330" y="{{n | times: 50 | plus: 170}}">&times;</text>
    <use href="#a{{n}}" x="340" y="{{n | times: 50 | plus: 150}}" />

    <use href="#d{{n}}" x="490" y="{{n | times: 50 | plus: 150}}" />
    <text x="510" y="{{n | times: 50 | plus: 170}}">&times;</text>
    <use href="#a{{n}}" x="520" y="{{n | times: 50 | plus: 150}}" />

    <text x="700" y="{{n | times: 50 | plus: 170}}">&hellip;</text>
  {% endfor -%}
  <text x="115" y="520">&plus;</text>
  <text x="295" y="520">&plus;</text>
  <text x="475" y="520">&plus;</text>
  <line x1="110" y1="550" x2="245" y2="550" />
  <line x1="290" y1="550" x2="425" y2="550" />
  <line x1="470" y1="550" x2="605" y2="550" />
  <text x="40" y="580">Vdst</text>
  <rect x="80"  y="560" width="50" height="40" />
  <rect x="130" y="560" width="110" height="40" class="blockgroup0" />
  <rect x="260" y="560" width="50" height="40" />
  <rect x="310" y="560" width="110" height="40" class="blockgroup1" />
  <rect x="440" y="560" width="50" height="40" />
  <rect x="490" y="560" width="110" height="40" class="blockgroup2" />
  <rect x="620" y="560" width="50" height="40" />
  <rect x="670" y="560" width="110" height="40" />
</svg>

So you take one of your input matrices and slice it into bitplanes, and
then for each bitplane you perform the matrix multiplications with
conditional additions rather than multiplication.  You get eight
"multiply-accumulate" operations done for the price of one multiply in
eight-bit precision.  And you get smaller intermediate values so you can
accumulate a few extra rounds without overflow mitigation.  And
potentially lower latency, but you're not going to appreciate that in a
SIMD instruction.

To get the same precision takes eight iterations, over each of the eight
planes of the input, with shifts and adds to merge the results, _but_
you gain the opportunity to quit after fewer iterations for a
proportional saving in overall run time if you don't need the full 8-bit
precision.

It seems to fit neatly into a SIMD architecture, but I'll have to go
into that detail a bit later on...

TODO: fill all this in.
