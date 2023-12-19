I've been doing some messing around with random number generation at
work, and this inspired me to revisit something which has troubled me
since my teenage years: Perfectly unbiased random numbers over a range
which is not a power of two.

We've all been there, right?

A quick history of my early experience with NPOT random ranges:
* `rand() % n`: bloody terrible -- exposes weaknesses in common RNGs,
  and (particularly for large `n`) gives the lower part of the range
  higher probability than the upper part.
* `(rand() * n + (n / 2)) / (RAND_MAX + 1u)`: hides common RNG
  weaknesses, and spreads the biased values across the range so
  there's no gross weighting towards high or low values.  Still
  biased.
* `do { r = rand() / ((RAND_MAX + 1u) / n); } while (r >= n);`:
  unbiased, but how do we know how long it will take to finish?

Many other posts elaborate on these methods, so I'm not going to spend
too much time on the shortcomings.  Although I should point out that all
of them fail when `RAND_MAX` is less than `n`.

The last one was the only unbiased method I knew for a long time, but it
bothered me not just for its potential to loop indefinitely, but because
the out-of-range value still represented a meaningful random range which
could surely be put to some kind of use.


Recently I happened to follow a link from the [Random.org FAQ][];
> [Dr Jacques describes an entropy-saving, unbiased random number range generator][Dr Jacques method]
^
This introduces the following algorithm:
```c++
static int m = 1, r = 0;
/* untested code follows: */
int random_lt_n(int n) {
    const int N = INT_MAX >> 1;
    int q, d;
    for (;;) {
        while (m < N) {
            r = (r << 1) | random_bit();
            m <<= 1;
        }
        q = m / n;
        if (r < q * n)
            break;
        r -= n * q;
        m -= n * q;
    }
    d = r % n;
    r /= q;
    m = q;
    return d;
}
```

This does basically the same thing as given earlier; take a random 
number, divide it down by the best possible integer factor to get
that range as close as possible (but no less than) `n`,
and either return the result or try again if we overflow.  The
difference is that whatever unused entropy comes out of those two
case (either the distance by which we overflowed, or the unused
factor in the exit case) are multiplied back into the next random
number that is going to be produced.  The range of the random
number is [0,m), rather than a predetermined power of two, and
different rounds have different ranges depending on what could be
recycled.

It's brilliant, and I was very excited by it when I learnt about
it.  So naturally the first thing I tried to do was break it.

After some thought about the different cases, I saw that for
conditions with a high risk of overflow, the amount of entropy that
can be recycled is at its maximum, so you're likely to need only
one more bit for the next try.  Also, the range follows a sequence
which means that it's likely to visit cases with low remainders and
low risk of failure.

Actually, I tried it (for several prime `n`) and it didn't work that
well because one small detail stops it being a Lehmer RNG.

I saw fit to try to optimise it in several ways, and ended up asking
Dr Jacques whether there was a straightforward way to prove that I was
wasting my time ("wasting my time" in the mathematical sense, that
is).  I did successfully recognise that by plucking out prime factors
of `n` we can minimise the problem of it being so large that our
random numbers suffer a strong chance of overflowing.  However, in the
situation where you know you'll need some set of random numbers in various
ranges (eg., 51, 50, 49, etc. when shuffling a deck of cards) may
present an opportunity to change the order to pick appropriate values
of `n` to match the current state of `m` to
encourage cases where the risk of loss was minimal (or zero).  Perhaps
there was way to deduce whether this improved or simply re-framed the
problem?

In any case, one of the things I got back from Doctor Jacques was this
link:

> [Bit recycling for scaling random number generators][]

Here we have performance comparisons of classic discard and the Dr Jacques
methods against different costs of getting the random input.  You can take
that as a comprehensive study on the ultimate futility of performing
complex arithmetic trying to optimise the entropy utilisation of a perfectly
unbiased random number generator.

But I'm still going to get the last word (I made a blog especially for
the purpose!).  Check this out[^1]:
```c++
r = n / 2;
for (i = 0; i <; insanity_factor; i++)
    r = (rand() * n + r) / (RAND_MAX + 1u);
```

What we have here is _not_ a perfectly unbiased random number.  We
have, instead, something that runs in finite time and can, for some
value of `insanity_factor` (I strongly recommend a value of at least
1), reduce the bias to some predetermined tolerable threshold.

In fact, even if `n` is greater than `RAND_MAX`, it'll still work, so long as `insanity_factor` is large enough.

That's how we do things _real-time_.  We pick tolerable outcomes, and
we don't slip our deadlines.

So how does it work?

Consider the case where `n` is something like 2/3 the value
of `RAND_MAX`.  What we would get is a mapping where all of
the numbers have at least one shot at being picked, and then `RAND_MAX/3`
extra possible outcomes which need to be distributed between
`2*RAND_MAX/3` candidates.  In other words, some results will
have two chances while others will have only one.

So if we make `RAND_MAX` much larger, then that remainder
represents one extra chance on top of many, such that it hardly matters.

The algorithm above concatenates a series of calls to `rand()`
to produce a single, much larger random number -- a fixed-point number in
the range [0,1) -- and uses [long multipication][]
to multiply that by `n`.  We divide by `(RAND_MAX + 1u)`
at each stage to get the overflow term for the next column, and the
last overflow term is the integer term, in the range [0,n).  The wide
range (or high precision) of the random number is what shrinks the bias
to nearly zero.


But the code looks more like the second `rand()` scaling
technique above than long multiplication... WTF is that about?


This is what kind of freaked me out at first; and it's why we have
three paragraphs above trying to explain that it really must work.
The code is exactly how I would implement either one of those
(except I'd use shifts and call more reliable generators).  They
_are_ exactly the same thing.  I guess this happens all the
time in mathematics, but in code it's usual for something in the
arrangement of the characters (or even just the whitespace) to
point directly to the specific algorithm the author had in mind.

It also happens to be the same as the multiply-with-carry random
number generator.  I could speculate that if I plugged one into the
other then the universe would implode, except that MWC happens to
do exactly that to itself already with no signs of implosion so
far.

Anyway... the original problem was that the fixed point number
`rand() * n / ((RAND_MAX + 1)` was always a multiple
of `n / ((RAND_MAX + 1))`, and those gaps, when
quantised to an integer are manifest in biased rounding towards
specific values.

In one sense, the roundoff term (normally set to be half the
size of the destination range), is replaced with a random number in
that same range to dither out the quantisation.  It's the correct
range to fill in that interval, and it happens to be (for good
reason) the same as the range required in the final result.

Alternatively, it's all part of the same big, long fixed-point number
and that's just the carry term and there's nothing special about it
at all.

In any case, it's ridiculously simple.  It's also antithetical to the
perfect Doctor Jacques solution, but you can't make every factor perfect
at once, so here you see both options.

[^1]: P.S. Please do not use divide in any real implementation.  `RAND_MAX+1` is almost certainly a power of two.

[Random.org FAQ]: http://random.org/faq
[Dr Jacques method]: https://web.archive.org/web/20200213145912/http://mathforum.org/library/drmath/view/65653.html
[Bit recycling for scaling random number generators]: http://arxiv.org/pdf/1012.4290.pdf
[long multipication]: http://en.wikipedia.org/wiki/Long_multiplication
