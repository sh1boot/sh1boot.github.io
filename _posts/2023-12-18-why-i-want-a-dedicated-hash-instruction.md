---
last_modified_at: Sat, 3 Aug 2024 12:17:06 -0700  # cb2fde2 use-canonical-links-internally
layout: post
title:  Why I want a dedicated hash instruction
description: My thoughts on why a CPU instruction to provide a stronger hash operation in one cycle would benefit software performance.
tags: hashing random computer-architecture handwaving
---
A good hash function is expected to [remove correlations][correlation immunity]
of various sorts between subsets of inputs and their hashed outputs in order to
mitigate the risk of those correlations producing performance aberrations
(cache collisions, unbalanced structures, etc.) or statistical biases.

But traditional CPU instructions are the *opposite* of what's useful for hashing,
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
stochastic methods.  Lots of so many things.  Even when you already have the
hash, there are many cases where it's beneficial, or at least prudent, to hash
it again to get a different or stronger permutation.

An efficient hash can also be used for a trivial PRNG formed in something like
a [splitmix64][] construction.  Splitmix64 uses a simple counter and hashes its
state to produce a pseudorandom number, and that hash is a variant of the
finalisation stage used in hashes like murmur and xxhash.

### Why hash with low latency?

Because in things like hash tables the hash is a part of the address
calculation, and who wants high-latency address calculation paths?  Those can
end up in your loop dependencies!

Yes, if a hash is expensive it's usually cached alongside the data.  However
that's not memory efficient and for large sets of small objects it's
especially undesirable.  Also, in too many cases small objects are associated
with weak hashes (eg., STL's default identity function).

Whether you have a small object or you have its hash already to hand (and
provided the original collision rate is acceptably low), there are still good
reasons to want to give it another good mix:
 * Deriving a table index via bit masking only works if you have a high-quality
   hash.
 * Hashes should be rekeyed at appropriate opportunities to mitigate the risk
   of malicious inputs.
 * If you have a non-power-of-two hash, it's more efficient to use `mulh` than
   `mod` to fit that range, but this only works with a well-distributed hash.

All of these can be addressed in a trivial amount of digital logic, but it
takes a nontrivial amount of software arithmetic to achieve the same.

Algorithms like Bloom filters and probing functions in open-addressed hash
tables also need additional independent hashes of the same data, and
independent hashes can be cut from the original hash only if its properly
mixed (or if the collision rate is sufficiently low, new hashes can be derived
from permutations of the original hash).

That's the obvious answer at least.  I think that's the reason that we see
such large gaps between the two best-in-class hashes in the [SMHasher3 results][]
table.  Compare `rust-ahash-fb` at an average of 35 cycles per byte for short
blocks but only four bytes per cycle for bulk data, to `MeowHash.64` at 67
cycles per byte for short blocks but 12 bytes per cycle on bulk data.  It's
quite a gap.

Other applications benefit from being able to compress two or three words into
one, for use as a random key; but the use of other low-cost arithmetic like
addition and exclusive-or tend to yield low-entropy results, and can end up
making things worse than the use of a single parameter.

For example:
 * Generating unique stack canaries on a per-call basis to mitigate the risk of
   attacker exfiltrating the canary elsewhere.
 * Providing a tweak parameter for tweakable ciphers (the tweak is not
   necessarily a secret, but an obfuscating factor against replay attacks).

Also there are techniques involving hashing the parameters of the input to give
a consistent seed for random values for stochastic methods, so that the random
values are repeatable.  These shouldn't form loop dependencies but they also
can't be derived from RNG sequences which can run arbitrarily far ahead in the
pipeline.  This is used very heavily in shader code, for example, where random
variables are derived from the hash of the pixel coordinates and time.

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

In [part two][] I attempt to illustrate something which is not much logic and
is tolerably shallow in the logic that it uses.

[part two]: /a-reasonably-effective-hash-instruction/
[correlation immunity]: https://en.wikipedia.org/wiki/Correlation_immunity
[de Bruijn sequence]: https://en.wikipedia.org/wiki/de_Bruijn_sequence
[substitution-permutation network]: https://en.wikipedia.org/wiki/Substitution-permutation_network
[water memory]: https://en.wikipedia.org/wiki/water_memory
[SMHasher3]: https://gitlab.com/fwojcik/smhasher3
[SMHasher3 results]: https://gitlab.com/fwojcik/smhasher3/-/blob/main/results/README.md#passing-hashes
[splitmix64]: https://rosettacode.org/wiki/Pseudo-random_numbers/Splitmix64
[dieharder]: https://webhome.phy.duke.edu/~rgb/General/dieharder.php
[TestU01]: https://github.com/umontreal-simul/TestU01-2009/
[PractRand]: https://pracrand.sourceforge.net/PractRand.txt
