---
last_modified_at: Fri, 27 Dec 2024 15:48:07 -0800  # 869bb19 reduce-folding-in-nblfsr
layout: post
title:  Non-binary Linear Feedback Shift Registers
mathjax: true
tags: number-theory random
---

There's way too much documentation about binary [LFSRs][LFSR] out there,
and not a whole lot on doing the same with other bases.  So I've put
together some tables and a few notes so everybody can throw something
together without to much effort.

In the binary case one has a selection of taps which are either used or
not used, and the next bit (digit) in the sequence is the parity of the
taps one chose to use.

To extend this to base b, one can multiply each tap by an integer
between 0 and b-1 (zero meaning the tap is unused), and add these up
mod b, and that's the next digit:

```python
def lfsr5(punctured=False):
  base = 5
  poly = [1, 4, 3]
  shift = [1, 0, 0]

  while True:
    yield shift[0]
    x = sum(map(operator.mul, shift, poly)) % base
    shift = [x] + shift[:-1]
    if not punctured and x == 1 and not any(map(bool, shift[1:])):
      yield 0
```

A generator like this can produce a pseudorandom string in an
alphabet of $b$ characters with a period $b^n-1$.  Such sequences are _almost_ a [de
Bruijn sequence][], where every possible length-n string is produced
exactly once in the minimum number of steps possible.  A de
Bruijn sequence with one state excluded is known as a "punctured"
de Bruijn sequence, and you can make up the difference by
dropping an extra zero into the sequence at the right moment, as
illustrated above.  More on that [later](#converting-to-a-de-bruijn-sequence).

I've also used it where I wanted a sequence where the new value is the
previous value multiplied by 3, but with a small perturbation to ensure
that after $b^n-1$ steps it wraps to follow a different path until all
values (except for zero) are visited.  This was as a team combination
thing, in an arbitrary number of dimensions, or something like that, I
think.

So I decided to make some tables of polynomials that work for different bases (alphabet sizes) giving the maximum possible periods for a given window length.  They're restricted to prime number bases because they're the only ones that work with simple modular arithmetic.  You can do more with other types of arithmetic but you can also cobble things together out or primes so I left it at that.

I did all the primes up to 257, then a handful of primes immediately above and below powers of two (including a couple of Mersennes), and then the prime factors of a few Fermat numbers and the like.  I figured that way one could make a power-of-two generator by discarding the one out-of-range value when it came up.

I also searched for minimal generators using the fewest taps, and generators using only one non-zero tap, for the simplest possible implementations on limited hardware.

## Searching for maximal-period polynomials

I believe there are some ways to figure these things out directly if you know the right mathematics.  I do not know the right mathematics.

What I did instead was to express the candidate LFSR as a matrix.  If I multiply a vector by this then the result will be as if the LFSR has taken one step.  So if I raise the matrix to the nth power then multiply that's like taking n steps.

What I want is for $p^n-1$ steps to land me back where I started.  So if I raise the matrix to that power it has to be the identity matrix.  If not, discard the candidate generator.  It's not maximal period. 

But what if it cycles twicw in that period?  That would give me an identity matrix but wouldn't be full cycle.  So raise it to $(p^n-1)/2$.  If that's also identity then chuck it out.  This needs to be repeated for every prime factor.  The actual period could be a non-prime factor but that just means some tests will yield an identity matrix raised to some spurious other factors, which is still an identity matrix so we still catch it.

This can search very large periods quickly.  So quickly that factoring them becomes problematic in itself.  I thought it best to [keep][factors] these intermediate results in case I needed them later.

Something which helps a lot here is knowing that $p^{a\times b}-1$ can be divided by $p^a-1$ and $p^b-1$ (it's not the product of these, but they are both factors).  So we can collect a lot of prime factors of $p^n-1$ by trying all the factors of n in place of n (all factors, not just prime factors).  This is less helpful when n if prime, but in most cases it's good.

## Converting to a de Bruijn sequence

The one missing output case is the n-zeroes in a row.  We get n-1 zeros and then it has to be something else, because once the state is all zeros an LFSR stays that way forever.

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

It's quite clumsy and not a thing I would want to bother with generally, except
that it helps with the following...

## Extending to $p^n$ bases

If you need a generator with a base which is some power of a prime then
you could use a prime generator which is n times longer and then combine
groups of n digits into a single value.

Multiplying out the generator length of a base p generator by n gives us an equivalent state space as a base $p^n$ generator.  Stepping though this state space and mapping it to the desired base must then be done in such a way as to emulate the shift register in the desired base.

One solution to this is to cut the shift register into n runs of consecutive values, and to combine each of the resulting vectors using vectorwise multiplication and addition to make a vector of combined values.  Or just combine every (length/n)th value for the next output.

```python
def lfsr9(punctured=False):
  base = 3
  n = 2
  poly = [2, 1, 2, 1, 2, 1]
  shift = [1, 0, 0, 0, 0, 0]
  length = len(poly) // n

  while True:
    r = 0
    for v in shift[::length]:
        r = r * base + v
    yield r
    x = sum(map(operator.mul, shift, poly)) % base
    shift = [x] + shift[:-1]
    if not punctured and x == 1 and not any(map(bool, shift[1:])):
      yield 0
```

In some instances it's also possible to advance the generator in steps of n, and combine n conductive belts into one result.  but this only works when n is co-prime to the period of the generator.  The step must be co-prime to ensure that every possible state is visited.

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

```python
def lfsr45():
  bases = (9, 5)
  for values in zip(lfsr9(), lfsr5()):
    r = 0
    for v, b in zip(values, bases):
      r = r * b + v
    yield r
```

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

There's more data [here][allpolys].  The search required factoring some
big numbers in the form $p^n-1$, and I didn't want to waste that effort,
so those are [here][factors].

[LFSR]: <https://en.wikipedia.org/wiki/LFSR>
[de Bruijn sequence]: <https://en.wikipedia.org/wiki/de_Bruijn_sequence>
[shift register generation]: <https://books.google.com/books?id=sd9AqHeeHh4C&pg=PA174>
[example code]: <https://github.com/sh1boot/nblfsr/blob/main/generator.py>

[factors]: </blobs/factorlist.txt>
[allpolys]: </blobs/nblfsr.txt>
