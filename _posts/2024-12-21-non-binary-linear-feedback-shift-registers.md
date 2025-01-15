---
last_modified_at: Fri, 27 Dec 2024 15:48:07 -0800  # 869bb19 reduce-folding-in-nblfsr
layout: post
title:  Non-binary Linear Feedback Shift Registers
mathjax: true
tags: number-theory random
---

There's way too much documentation about binary [LFSRs][LFSR] out there,
and not a whole lot on doing the same with other bases.  Here are some
tables for other bases so things can be thrown together without too much
thought.

In the binary case one has a selection of taps which are either used or
not used, and the next bit (digit) in the sequence is the parity of the
taps one chose.

To extend this to base b, one can multiply each tap by an integer
between 0 and b-1 (zero meaning the tap is unused), and add these up
mod b, and that's the next digit.

```python
def nblfsr(punctured=True):
  base = 3
  poly = [0, 0, 0, 1, 2]
  shift = [1, 0, 0, 0, 0]

  while True:
    yield shift[0]
    x = sum(map(operator.mul, shift, poly)) % base
    shift = [x] + shift[:-1]
    if not punctured and x == 1 and not any(map(bool, shift[1:])):
      yield 0
```

Remembering the caveat that the all-zeroes pattern cannot occur in the
sequence, a generator like this can produce a pseudorandom string in any
alphabet with a period $b^n-1$.  Such sequences are _almost_ a [de
Bruijn sequence][], where every possible length-n string is produced
exactly once in the minimum number of steps possible.

I've also used it where I wanted a sequence where the new value is the
previous value multiplied by 3, but with a small perturbation to ensure
that after $b^n-1$ steps it wraps to follow a different path until all
values (except for zero) are visited.  This was as a team combination
thing, in an arbitrary number of dimensions, or something like that, I
think.

So here are some tables of viable polynomials in some other bases, just
to help fill the gap.  Not a comprehensive list but a quick scan
yielding a few options from "sparse" to "dense" concentration of taps.
Depending on the implementation one might want the lightest taps (fewest
multiplies, fewest additions), or if those costs aren't important then
one might prefer the potentially more chaotic results from a denser mix.


## Converting to a de Bruijn sequence

The one missing output sequence is the all-zeroes case.  This seems to
be known as a "punctured" de Bruijn sequence.

If we simply wait until the output is _nearly_ all zeroes, and insert an
extra zero, then we can fill that gap.  And then to get back on track we
need to recognise all-zeroes and output something other than another
zero (which would be the natural consequence).

For base b there are b-1 cases where this run of n-1 zeroes case
appears.  Pick one (only one) of them, and insert the all-zeroes case in
the sequence (ie., insert one more zero), and then carry on to what the
next step would have been before the insertion; which will be the
product of the last non-zero shifted out by the value of the last tap in
the feedback polynomial.

It's quite clumsy and not a thing I would want to bother with except
that it might help with the following...

## Extending to $p^n$ bases

If you need a generator with a base which is some power of a prime then
you could use a prime generator which is n times longer and then combine
groups of n digits into a single value.

However, one must be careful about the way sets of small values are
mapped to larger values and the way the sequence is stepped.  Either
step the sequence in groups of n, so that the logical shift register
structure is maintained, or use single steps and a more convoluted
mapping which still looks like a shift register afterwards.

When stepping in ones there's going to be some mathematical relationship
between nearby values as a single value in the long shift register is
going to move around and be re-used in the remapped shift register.
This makes it a weaker PRNG.

When using steps greater than one care must be taken to ensure that the
step is co-prime with the period of the generator.  Only if it is
co-prime can the shift register visit every possible state for a
bijective mapping.

Otherwise, one would need to implement linear $\mathrm{GF}(p^n)$
arithmetic and either repeat the search, or find some polynomials using
mathematics I haven't learned.  I haven't got around to doing either of
those things.

Also if I did the search I wolud then need to specify the multiplication
and addition operations more explicitly because they're not the same as
for prime bases.

## Extending to other bases

One can merge de Bruijn sequences of the same size but co-prime bases by
effectively running them in parallel and splicing the outputs from
sequences $u$ (base $b_u$) and $v$ (base $b_v$) as ${b_u}{x_v} + x_u$.
The taps can either be drawn from separate shift registers for each
base, or derived from the combined output using division and modulo by
$b_u$.

What _doesn't_ work so well is trying to merge LFSR sequences this way.
The trouble is that their periods are all in the form $p^n-1$, and that
minus one makes it difficult to find coprime periods (all maximal
non-binary periods are even).

Wikipedia links a [reference][shift register generation] for
constructing de Bruijn sequences for arbitrary bases, but I'm not going
to read all that.

## Jumping around

Setting the de Bruijn modification aside because I don't know how to account for that... you should be able to trivially construct a matrix representing the state change of the shift register (now a vector) to the next iteration.  then just raise that matrix to the appropriate power (a series of squaring operations and conditional multiplications according to the bit pattern of the power) to get a matrix which will take you as far as you need to go.

Typically I like to have a solution handy for jumping ahead by the period of the generator times the golden ratio.  You can use that to maximally distribute an arbitrary number of generators.

## Example code

[example code][].

## Tables

In the tables below, several different polynomials are listed for the given parameters, each enclosed in `{}`.  The right-most value is the multiplier for the
oldest output, and the leftmost value is the multiplier for the most
recent output.  The next result is:

$$
x_{n+1} = \sum_{i=0}^{l-1} x_{n-i} p_i \mod b
$$

<style>
  td:nth-child(-n+3) {
    width: min-content;
    text-align: right;
  }
  td:nth-child(4) {
    width: 100%;
    text-align: left;
  }
</style>
{% capture fold -%}<details markdown="0">{%comment%}<summary>more...</summary>{%endcomment%}{%- endcapture %}
{% capture endfold -%}</details>{%- endcapture %}
| base | stages | period | polynomials |
|------|--------|--------|-------------|
{% include nblfsr_table_1.md %}

[LFSR]: <https://en.wikipedia.org/wiki/LFSR>
[de Bruijn sequence]: <https://en.wikipedia.org/wiki/de_Bruijn_sequence>
[shift register generation]: <https://books.google.com/books?id=sd9AqHeeHh4C&pg=PA174>
[example code]: <https://github.com/sh1boot/nblfsr/blob/main/generator.py>
