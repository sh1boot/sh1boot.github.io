---
layout: post
title:  "Why I want a dedicated hash instruction"
categories: hashing, prng, cpu, pipeline, handwaving
---
A good hash function is expected to [remove correlations][correlation immunity]
of various sorts between subsets of inputs and their hashed outputs in order to
mitigate the risk of those correlations producing performance aberrations
(cache collisions, unbalanced structures, etc.) or statistical biases.

But traditional CPU instructions are the opposite of what's useful for hashing,
with strong correlations between input and output which are hard to hide, and
hash function implementations must combine many such operations to produce
something worthwhile.  Even cryptographic primitives, designed with similar
intent, require many rounds to achieve anything of quality.

For large blocks of data much of this latency can be hidden in the instruction
pipeline, and the remaining weaknesses of the hash function are then disguised
with extra mixing in a finalisation stage.

This works well enough for large blocks, but not so well for small objects
where the more complex finalisation dominates.

In my view some kind of arbitrary but correlation-resistant bijective transform
should be a basic CPU operation.  Something which can be completed in a single
cycle, like addition.

## Why hash?

Because lots of reasons.  Lots of probabilistic data structures.  Lots of
stochastic methods.  Lots of so many things.

An efficient hash can also be used for a trivial PRNG formed in something like
a [splitmix64][] construction.  Splitmix64 uses a simple counter and hashes its
state to produce a pseudorandom number, and that hash is a variant of the
finalisation stage used in hashes like murmur and xxhash.

### Why hash with low latency?

Because in things like hash tables the hash is a part of the address
calculation, and who wants high-latency address calculation paths?  Those can
end up in your loop dependencies!

That's the obvious answer at least.  I think that's the reason that we see
such large gaps between the two best-in-class hashes in the [SMHasher3 results][]
table.  Compare `rust-ahash-fb` at an average of 35 cycles per byte for short
blocks but only four bytes per cycle for bulk data, to `MeowHash.64` at 67
cycles per byte for short blocks but 12 bytes per cycle on bulk data.  It's
quite a gap.

Also there are techniques involving hashing the parameters of the input to give
a consistent seed for random values for stochastic methods, so that the random
values are repeatable.  These shouldn't form loop dependencies but they also
can't be derived from RNG sequences which run arbitrarily far ahead in the
pipeline.

Hash-based randomisation, based on properties of the input (eg., pixel
coordinates) rather than a generic RNG for reproducibility, used for stochastic
operations

This can also be applied to operations like generating canaries on a
per-function or per-object basis.  Using simple operations like summation to
combine multiple parameters is prone to giving low-entropy results, and may
even make things worse than a single parameter.  Ideally it would be possible
to compress the parameter space into fewer bits without unnecessary loss of
entropy but also without slowing down the program to achieve this.

### Why an instruction?

Well, why do any arithmetic operation as an instruction?  Because what can be
done quickly in a teensy bit of silicon takes forever in software, and a
cost-benefit analysis may well point to inclusion under modern workloads (like
it has done with division, I guess).  Faster and higher-quality hash primitives
make stochastic algorithms like caching and data sketching more efficient and
shift the trade-offs in favour of further optimisations.

An obvious objection to this is that locking an architecture in to some
arbitrary algorithm like this is a terrible idea and becomes regrettable when a
specific weakness begins causing problems.

But hash libraries don't necessarily commit to a specific algorithm in
software.  They come with caveats that the implementation and results could
change between library versions, or even between machines if a particular
accelerator can be used on one and not another.

Similarly, the CPU architecture shouldn't prescribe a particular algorithm.
It's important to be able to abandon old algorithms if weaknesses are
discovered.  Software might detect known alogithms by feeding the opcode a
constant input and looking up the result, and it can then decide whether to use
it, ignore it, or use it with extra mitigations.  Or possibly change it via
CSR.

But most importantly: because I don't think it has to cost that much...

## Building a proof of concept

To make something that didn't consume too much logic I decided to try a simple
[substitution-permutation network][].  In one phase, take small groups of bits
and replace them via a substitution box (a lookup table), and in another phase
rearrange the individual bits to new positions in the output where they will
have new neighbours in subsequent rounds.

### substitition

A substitution in this case means that a change in any one bit becomes the
possibilities of changes in n bits, with the specific outcomes depending on m
other bits.

I chose a four-in-four-out s-box, because it wouldn't require many levels of
mux to implement.  In principle this means there are 16! possible tables, but
most of these are not useful.  To simplify the logic further I decided to try a
table derived from a [de Bruijn sequence][], of which there are only 256
possibilities.  Most of these are rotations of other sequences so there are
only 16 unique choices if you don't count rotations, but different rotations
perform differently leading us back to evaluating all 256 choices.

Use of a binary de Bruijn sequence means that rather than using a look-up
table, a shift can achieve the same result.  For example:
```c++
  x = ROTR16(0x4de1, i) & 15;
```
will return 16 different values for 16 different inputs (`i`).

To decide which of the remaining 256 possibilities was best I tried all of them
in [SMHasher3][], in various configurations, to see which one was hardest to
break.

### permutation

To spread the effect of the s-boxes as rapidly as possible the permutation
should take all n bits from one box and distribute them among n different boxes
for the next round, ensuring that each bit has never encountered its new
neighbours before (until this can no longer be avoided).  More specifically --
that each new bin contains bits that have never shared influence from a
previous s-box.

This can be done by rotating the index of the bit by two bits (two being
log<sub>2</sub> of the size of the s-box) to find its new bit index.
Effectively multiplying or dividing the bit position by four, and filling in
the empty bits with those shifted off the end.

I also tried another de-Bruijn-sequence-based solution which ensured that every
bit position eventually marched through the whole word, while also meeting the
same unique-neighbour constraint in the first n rounds.  That works, and has
fun properties, but it doesn't improve things meaningfully (at least not
unless you subscribe to the idea that each bit position has [water memory][] of
its old value before the substitution).

I ended up with the following round function:
```c++
uint64_t round(uint64_t x) {
    const uint16_t magic = 0x613d;
    uint64_t y = 0;
    for (int i = 0; i < 64; i += 4) {
        int j = (x >> i) & 15;
        uint64_t k = ROTR16(magic, j) & 15;
        y |= k << i;
    }
    uint64_t z = 0;
    for (int i = 0; i < 64; ++i) {
        int j = ((i & 15) << 2) | (i >> 4);
        z |= ((y >> j) & 1) << i;
    }
    return z;
}
```
I believe the shift is still a select 1 of 16 but with size optimisations
available (shared results between adjacent bits, unlike a conventional mux), or
four layers of binary mux, and the permute is just wires (but maybe fairly long
wires).  So I think I can call that eight gates deep?

### packaging as an opcode

Doing the above in software is clearly absurd.  It achieves nothing that can't
be done much faster in simpler operations.  But if it were packaged as a
machine instruction it could (I believe) do in just two or three cycles what
software currently takes maybe a dozen cycles to achieve.

#### what makes a useful opcode

The function defined so far needs four rounds for influence from one bit to
reach every bit, but that's a weak connection and a few extra rounds would be
necessary to get things properly dispersed.

But to get the operation done in a single cycle on a fast CPU four rounds may
be ambitious, and doing it properly may not always be necessary.  Two or three
rounds seems to work well enough if the instruction is used carefully and if we
squeeze in a tiny bit of extra mixing just to be sure.

Because it's a hashing operation, not only does it need to permute its working
state, but it also has to integrate the data being hashed.  A two-in, one-out
integer instruction suits this purpose.  But care must be taken to define the
combination of two inputs in such a way that common collision scenarios don't
result in cancellation -- where too many different inputs lead to the same
output.

#### a tiny bit of extra mixing

Ideally, `hash_op(x, 0)`, `hash_op(0, x)`, and `hash_op(x, x)` would all be
bijective functions of `x` (the last one because cases where the same value
goes to both operands should not undermine hash strength).  So the
preconditioning of each operand must be bijective, and the combination of the
two, applied to the same original input, must also be a bijective operation.

After the expected minimum of one exclusive-or to combine the two inputs, I
hoped to avoid more than one additional exclusive-or to precondition the
inputs.

A popular bijective mix function in crypto is to exclusive-or a value with two
rotated copies of itself. But I don't want that many extra gates, and it
appears that to be a bijective transform the number of copies of the input
exclusive-ored together must be co-prime to the length of the word (ie., odd).
Even if I did do three on one input and three on another, the total after
combining the two would be even, and not co-prime.

But while exclusive-oring a value with one rotation of itself is not
bijective, if you zero one bit in the rotation then it becomes bijective by
virtue of the fact that you can unwind the exclusive-or bit-by-bit starting at
the one bit that was exclusive-ored with zero (provided the rotation is also
co-prime to the length of the word).

I have no idea how to design a pair of these operations which can then be
excusive-ored together to form another bijective function so I wrote a search
program to find a configuration which worked.  That gave too many results so I
re-ran the search with a few parameters locked down to satisfy some notion of
"evenly spaced" (though that notion is poorly reasoned):
* combine using a rotation of 32 (swap top and bottom halves)
* precondition each input with a rotation near 16 (these must be odd)
* make sure the dropped bits don't land in the same s-box in the combined output

Here's what I got:
```c++
uint64_t premix0(uint64_t x) {
    return x ^ (ROTR64(x, 15) & ~(uint64_t(1) << 10));
}

uint64_t premix1(uint64_t x) {
    x = ROTR64(x, 32);
    return x ^ (ROTR64(x, 17) & ~(uint64_t(1) << 17));
}
```
Using the same logic as above, that's two gates for the exclusive-or, and
nothing but wire for the rotation.

Combining all of the above operations, the final instruction looks like this:
```c++
uint64_t hash_op(uint64_t x, uint64_t y) {
    x = premix0(x) ^ premix1(y);
    x = round(x);
    x = round(x);
    return x;
}
```
And I think that's two gates for the premixes, two for the combine, and 16 for
the rounds.  20 gates deep?

### usage

This seemed to work (ie,. pass tests) as a generic hash implementation:
```c++
uint64_t hash_function(uint8_t const* ptr, size_t len, uint64_t seed = 0) {
    const uint64_t hlen = hash_op(len, hash_op(seed, len));
    uint64_t hash_lag1 = hash_op(seed, 0);
    uint64_t hash = hash_op(0, hash_lag1);
    while (len >= 8) {
        uint64_t data;
        memcpy(&data, ptr, sizeof(data));
        data = hash_op(data, hash_lag1);
        hash_lag1 = hash;
        hash = hash_op(hash, data);
        ptr += 8;
        len -= 8;
    }
    // tail stuff...

    hash = hash_op(hash, hlen);
    hash = hash_op(hash, hash_lag1);
    return hash;
}
```

The assumption here is that `data = hash_op(data, hash_lag1)` issues
concurrently with the previous iteration of `hash = hash_op(hash, data)`.

Use of the `lag1` variant helps to compensate for the limited dispersion of the
reduced-round opcode.  If two subsequent words in the input have certain
structural correlations then each of their first rounds will be permuted by
a different argument.  This helps disperse those correlations in a way that
passing 0 or a seed value can not.

Strictly this argument should be a pseudorandom sequence.  Even a Weyl sequence
is probably sufficient.  Deriving it from a lagged version of the data would
require proving that there's no possibility of self-cancellation where the hash
has fewer than the full range of possible output states.  But this magic
sequence is available without extra computation, and it seems to work just
fine.

Integrating the length into the hash is done after the other data is processed
on the basis that the length may not be known in advance (in a more complex use
case).  But when the length and seed are constant many of those surrounding
operations fold down to constants as well.

### results

The above functions seem to pass all smhasher3 tests, so I guess it's good?
There are a lot of popular, high-performance hashes which don't pass all these
tests.

In fact, in the final configuration most of the s-boxe candidates can pass all
tests; but I've stayed with one which passed in a variety of weaker
configurations during development as well.

In a PRNG configuration:
* `hash_op(hash_op(seed0 += k, seed1 += (seed0 < k) ? k : 0), 0)` for
  `k = 0x9e3779b97f4a7c15` survives [PractRand][] until at least 32TB, and
  passes all of the BigCrush suite in [TestU01][].
* `hash_op(hash_op(seed += 0x9e3779b97f4a7c15, 0), 0)` and persists in the
  PractRand suite until 1TB, where it fails.
* `hash_op(hash_op(hash_op(hash_op(seed++, 0), 0), 0), 0)` completes at least
  16TB (with two anomalies but no failures) and also passes all of BigCrush.

### future work

* be more scientific
* be less hand-wavy
  * requirement: pick an audience and decide what they already know
* look at 5-bit s-boxes
* 32-bit version
  * for 32-bit architecture
  * for Feistel network constructions (still not crypto!)
* SIMD version
  * in all likelihood nobody would want to implement a strong mix operation
    beyond 64-bit boundaries in SIMD even if that would be very, very useful,
    so a construction would be needed that gets by with something very simple
* try putting the mix in the middle -- do not be tempted to use different round
  functions for `op1` and `op2`; it makes it very hard to reason on whether or not
  the combination is still bijective when they're equal
  * this does increase area, as `op1` and `op2` each need a round of their own,
    but they can be done concurrently for equivalent timing
  * this also seems to weaken use as an RNG conditioning function -- I guess it
    doesn't benefit from quite as much avalanche from the extra mixing at the
    very start of the operation
* find a totally different algorithm which has applications relevant to its
  specific implementation to justify its existence, but which also has the
  dispersion properties of a deliberate dispersion function
* find more applications for this algorithm specifically?

[correlation immunity]: https://en.wikipedia.org/wiki/Correlation_immunity
[de Bruijn sequence]: https://en.wikipedia.org/wiki/de_Bruijn_sequence
[substitution-permutation network]: https://en.wikipedia.org/wiki/Substitution-permutation_network
[water memory]: https://en.wikipedia.org/wiki/water_memory
[SMHasher3]: https://gitlab.com/fwojcik/smhasher3
[SMHasher3 results]: https://gitlab.com/fwojcik/smhasher3/-/blob/main/results/README.md#passing-hashes
[splitmix64]: https://rosettacode.org/wiki/Pseudo-random_numbers/Splitmix64
[dieharder]: https://webhome.phy.duke.edu/~rgb/General/dieharder.php
[TestU01]: http://simul.iro.umontreal.ca/testu01/tu01.html
[PractRand]: https://pracrand.sourceforge.net/PractRand.txt
