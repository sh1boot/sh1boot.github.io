---
last_modified_at: Tue, 11 Jun 2024 17:41:44 -0700  # 79f5c7a tidy-up-headers-add-descriptions
title: Minimally biased NPOT-ranged random numbers
description: Digging a little further in to the problem of scaling random numbers over a finite range without biasing certain results over others.
categories: random, number-theory
---
In my previous post
I described a technique for scaling random numbers to new intervals producing
extremely small bias but with a constant execution time.

This time I want to cover the same solution to the same problem, but as a
mental exercise I shall attempt to do so without colouring it as one of those
in-my-own-head-only private jokes.  So it might be useful to someone else
facing the same problem.

I'll try to skim through first principles for context.

### Unbiased random NPOT intervals

Most random number generators (both pseudo and real) attempt to produce uniform
distributions over intervals which are some power of two in length.  It is then
the programmer's responsibility to transform this to fit their requirements.

When trying to get a uniform distribution over an interval which is not a
factor of the interval produced by the generator -- that is, when the
desired interval is not a power of two -- it's not possible to map all of
the input values to output values in a perfectly fair way.  This comes out
either as a bias in the distribution as the leftovers are handed to a lucky
few possible results, or some numbers have to be thrown away and a new random
number has to be drawn.

If a new random number is drawn, then that may have the same problem, and for a
truly random generator it's not known in advance how many iterations will be
required to get a valid result.

If the leftover values are distributed arbitrarily amongst some output values,
then those outputs will have a higher chance of selection than other values.

These problems are at their worst when the desired interval is close to the
random interval.  If it's just over half the random interval, then almost half
the random values from the generator must be discarded; or some outputs would
have two inputs mapped to them while others have only one, which is a very
strong bias.

If the output interval is greater than the random interval, then some output
values can never be reached, and that really is doing things wrong.

### Mitigation

The problems with both of these solutions can be mitigated by using a much
larger random interval.  This can never fix the problem, but it can make it
proportionally smaller.  That is a smaller chance of having to throw the result
away and try again (and a smaller-still chance still of doing it twice), or the
proportional difference between the over-represented and under-represented
outputs will be small enough to have negligible effect on the outcome.

### My approach

So, supposing you do want predictable completion time (within the constraints
of your random number generator itself), but your required interval is too close
to your random interval to produce a sufficiently small bias.

Well, try this:
```c++
int random_lt_n(int n)
{
    const int b = N_BITS + BIAS_BITS;
    int r = n / 2;
    int i;
    for (i = 0; i < b; i += RAND_BITS)
        r = (int)(((long long)rand() * n + r) >> RAND_BITS);
}
```

Where:
`N_BITS`
: is the number of bits needed to represent the maximum value of `n`,

`BIAS_BITS`
: is the size of the tolerable bias (one part in `(1 << BIAS_BITS)`), and

`RAND_BITS`
: is the number of bits that `rand()` produces (so `RAND_MAX` must be `((1u << RAND_BITS) - 1u)`).

You could be more specific and compute `N_BITS` from the actual
value of `n`, but that would make the run time dependent on the
requested range (which might be fine -- `INT_MAX` is still finite).

When I derived it it turned out a bit simpler than I had anticipated, so I
studied it closely to make sure there was a good reason for it being this
simple.

Also, it happens to work when `RAND_MAX` is less than
`n-1`.

### How it works

It's derived from [long multiplication][];
treating each call to `rand()` as a column of the multiplicand, such
that we have an arbitrarily large power-of-two random interval.  Bits above
`RAND_BITS` from each multiplication are the carry term to the next
column.  If the random bitstream is taken as a fixed-point number between zero
and one, then multiplying that by `n` and truncating to integer gives
a random integer between `0` and `n-1`.  Since the
fraction part isn't interesting to us, we don't retain it, and we simply use the
carry term, which happens to be the same as the integer term when we decide to
stop iterating.

And this is how we arrive at our "over-and-over until you think it's good
enough" construction of the loop.

There's another important ways to look at this:

Consider just a single iteration of the loop, with `r` seeded to `0`.

If `RAND_BITS` is 16, the largest result for `rand()` is
`0xffff`.  This multiplied by, for example, `n=5` gives a
largest possible value of `0x4fffb`, and we can only reach every
fifth value.  We need to add a random value between zero and four to fill the
range for completely fair quantisation.

That happens to be the same problem as we were already working on.  Only, we
don't have a random value in that range (if we did we'd be done!), so we have
to use a constant.  This first-round result is a little biased but it at least
touches several possible values.  We iterate and the influence of the original
bias is much less meaningful.  We keep doing this until we're happy.

Or if you prefer; at each stage we're adding a dither value to vary the
integer roundoff so that every result, and each iteration comes up with a less
biased dither value.

### That's a lot of rand()

This algorithm does consume a lot of bits from the random bitstream.  This
probably won't be a problem if you're using a really efficient PRNG.  I'm not
sure how many situations there are where you'd want to burden a true hardware
generator with this problem.

There is a [good algorithm][Dr Jacques method] for minimising wasted bits, but
that still faces throwaway-loop risk.

Without thinking too hard, I can see that it shouldn't be too difficult to
keep the old fractional part of the product around to wring more entropy
from it; and I think that when it threatens to run low it can be topped up
in the most-significant bits (which I think might be easier than properly
scaling to the least-significant bits).

I put this together but I have not tested it yet:
```c++
/* untested */
static int bitcost(int n)
{
    /* return ceil(log2(n)) -- the number of bits required to
     * represent n, except where n is a power of two we needn't
     * round up.
     */
    return sizeof(int) * CHAR_BIT - __builtin_clz(n - 1) + 1;
}

#define BUCKETS (N_BITS + BIAS_BITS + RAND_BITS - 1) / RAND_BITS)

/* also untested */
int random_lt_n(int n)
{
    static int pool_bits = 0;
    static int pool[BUCKETS];
    int i = 0, o = 0;
    int r = n / 2;

    pool_bits -= bitcost(n);
    while (pool_bits < BIAS_BITS)
    {
        i++;
        pool_bits += RAND_BITS;
    }

    while (i < BUCKETS)
    {
        long long t = (long long)pool[i++] * n + r;
        pool[o++] = (int)t & ~(-1 << RAND_BITS);
        r = (int)(t >> RAND_BITS);
    }
    while (o < BUCKETS)
    {
        long long t = (long long)rand() * n + r;
        pool[o++] = (int)t & ~(-1 << RAND_BITS);
        r = (int)(t >> RAND_BITS);
    }
    return r;
}
```

If the `bitcost()` function and `pool_bits` were replaced
with something a little smarter then it might keep a proper sub-bit counter,
either in log domain (as it is) or maybe with some careful shifts and multiplies
and very careful rounding.

However, as well as being code that has never been tested (it was a note which
I left for myself before I went to bed one night), I have not done the hard
thinking to confirm that it's right -- either that it implements
what I meant it to implement, or that what I meant it to implement is entirely
correct.

[Dr Jacques method]: https://web.archive.org/web/20200213145912/https://mathforum.org/library/drmath/view/65653.html
[long multipication]: https://en.wikipedia.org/wiki/Long_multiplication
