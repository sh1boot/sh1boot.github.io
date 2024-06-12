---
layout: post
title:  Hash map reduction operations
description: Since STL's mapping from a hash to table-index is surprisingly primitive, what are some ways to do it better (and when might those turn out worse)?
categories: hashing, hash-table, hash-map, wip
---
I notice that some defaults for things like STL `unordered_map` are a bit
scary.  The function to reduce the range of the hash down to the size of the
table is remainder, and the default hash for integers is the identity function.

Yikes.

To be fair, no matter how naive or lazy an algorithm seems, it probably has
cases where it excels.  Here, if you're making a table of ints distributed
uniformly over an unspecified range without many gaps it may be almost the best
thing (just optimise that mod), but that's almost a vector.

Obivously I, having my blog almost entirely dedicated to the subject, believe
that the proper way to map a uniformly distributed random bit pattern (as a
hash should be) into a fixed integer range is with a single multiply.  Not a
remainder.

But STL has other ideas, with its identity hash functions and the like.

What might I do instead?

## The essential operation

If we treat our hash as a 64-bit fixed-point random number representing a range
of values in [0,1).  Then by multiplying it by a constant `k`, we get a random
number in the range of [0,k), with some fractional part which isn't useful
(yet).

In plain-old integer arithmetic that's `(hash * k) >> 64`, but in C this would
typically result in overflow and an unusable result, and we would have to cast
to a temporary data type: `(uint64_t)((uint128_t)hash * k >> 64)`.

128-bit arithmetic isn't necessarily cheap, but don't worry about it.  On most
hardware there's an instruction to do just this operation.  I'll call it
`mulh`.  So assume this is presented in the C world like so:
```c
static inline uint64_t mulh(uint64_t x, uint64_t y) {
  return (uint64_t)((uint128_t)x * y >> 64);
}
```
and that once that's inlined it's a single machine instruction which is
probably much less costly than division or remainder.

## Reducing a hash to a range

Supposing, first of all, that the hash function you use gives a properly
distributed 64-bit number (a reasonable expectation from `size_t` on a 64-bit
platform).

In that case, the operation to convert a hash to a bucket index is:
```c
size_t constrain_hash(uint64_t hash, size_t nbuckets) {
  return mulh(hash, nbuckets);
}
```
Great!  So easy!  So fast!

Couple of problems, though.

First, if your hash isn't "hashey" then the values might all be clustered at
one end of the range, and consequently all the reachable buckets will also be
clustered down one end of the range as well.  If your hashes are all identity
hashes of a bunch of 32-bit ints you'll never get anything but the first bucket.

The other problem we'll save for later.

### Input conditioning

To fix the first problem we need to condition the input to be evenly
distributed.  Apply some function to it that maps every 64-bit input to a
64-bit output.  Basically a hash of the hash -- because somebody didn't do
their job right the first time around.  This hash should be [bijective][] (and
"[perfect][perfect hash]" in hash-speak), because there's no compression
happening.

What's a good conditioning function?  Well, that's a really hard question
involving trade-offs between performance and quality.  If only we [didn't have
to compromise][hash instruction].  If only...

First, the classic:
```c
static inline uint64_t murmurmix64(uint64_t h) {
  h ^= h >> 33;
  h *= 0xff51afd7ed558ccdULL;
  h ^= h >> 33;
  h *= 0xc4ceb9fe1a85ec53ULL;
  h ^= h >> 33;
  return h;
}
```

So you might write:

```c
size_t constrain_hash(uint64_t hash, size_t nbuckets) {
  hash = murmurmix64(hash);
  return mulh(hash, nbuckets);
}
```
I'm not sure this is going to be faster than division, but it will at least be
exceptionally resistant to collisions.

A cheaper cut-down version of that might also do, given that we do not need to
focus on the quality of the low-order bits for what we're doing:
```c
size_t constrain_hash(uint64_t hash, size_t nbuckets) {
  hash *= 0xc4ceb9fe1a85ec53ULL;
  return mulh(hash, nbuckets);
}
```
And an honourable mention to CRC, here, since it's hardware accelerated.  The
operation only returns 32 bits, but it can be a 32-bit hash of a 64-bit input.
Given a function representing that operation, we can write:

```c
size_t constrain_hash(uint64_t hash, size_t nbuckets) {
  return crc32(hash) * nbuckets >> 32;
}
```
However, this only works for modest values of `nbuckets`.  If it gets close to
$2^32$ or higher then things get poorly distributed.

TBD: I have another function, which I haven't thought through fully, for if you
know that your low-order bits are well distributed, but I need to figure some
details out before I put it in here.  The core of it is:
```c
hash = (hash >> 6) ^ ROTR64(0x2b63207ef09cd4ba, hash & 0x3f);
```
That bit pattern is a [de Bruijn sequence][], and that operation (on its own)
just sprays the low six bits across the whole word in a randomish and bijective
way.  But six bits isn't a good enough, so I have to make a better function
than that.

### Reseeding the hash

Fun fact: this whole `mulh` extraction process is kind of like a [range
coder][].  That means that if you keep the low-order bits (the fraction, the
bit that `mulh()` notionally threw away) after extracting your first bucket
index, you can repeat the process to get a fully independent variable -- in
either the same range or a new range if you prefer.

So if you come to a point in algorithm design where you might consider
re-seeding the hash and recomputing it to get a different approach to the
table, you don't _have_ to recalculate the whole thing.  Just repeat the
`mulh()` operation again on the residual from the last call.
```c
static inline uint64_t mull(uint64_t* x, uint64_t y) {
  uint128_t p = ((uint128_t)*x * y);
  *x = (uint64_t)p;
  return (uint64_t)(p >> 64);
}
size_t constrain_1st_hash(uint64_t* hash, size_t nbuckets) {
  *hash = murmurmix64(*hash);
  return mulh(hash, nbuckets);
}
size_t constrain_nth_hash(uint64_t* hash, size_t nbuckets) {
  return mulh(hash, nbuckets);
}
```

Be mindful of the earlier comment, above, about being lazy with the low-order
bits.  If you mean to consume the whole hash piecemeal then this becomes a
little less true.

Don't do the conditioning operation every time, though.  Or do?  I haven't
figured out what that says about independence of the results if you do, but if
you don't then the results stay independent for as long as possible (the degree
of non-independence is actually a noisy function which is always present but
grows from the low-order bits and you probably won't suffer from it early on).

Funner fact: provided all of your ranges are odd (generally true for
prime-sized tables), when the hash runs out of independent parameters it'll
just carry on hallucinating new keys for you which are no longer independent of
what you've seen before but are, I think (TBD), a unique sequence for each
initial hash.

This is because multiplication by an odd number mod a power of two is a
bijective operation and doesn't cause the hash to decay to a predictable value
or orbit which might be shared with other initial states (though many will be
at different phases on the same orbit).

### That other problem

By naively using `mulh`, when we increase the size of the table the order of
the hashes stays stable and new gaps appear in between existing entries.

This sounds like a good thing, and maybe it is.  If nothing else, when it comes
time to resize the table that operation could be implemented in a more-or-less
linear way, and the CPU can stream into and out of cache efficiently.

But if we were having a high rate of collisions in a particular area of the
table (ie,. your hash sucks and your input conditioning isn't good enough to
fix it) then this kind of scaling won't relieve the problem effectively.

Remainder doesn't have this problem, because the values that map to the same
bucket under mod are regularly spaced under one modulus won't generally map to
the same bucket under another modulus used for a larger table if they're
co-prime -- and in most implementations each modulus is prime.

For this reason one would probably want to tweak the conditioning function to
take a parameter -- a seed, or salt -- and to randomise that parameter every
time the table has to grow.

In fact, if the collision rate sucks but the load factor is low, maybe just
change the conditioning seed without even growing the table.

This tweak should probably also be in place if there's a risk that the table
might come under attack by contrived input.  Just saying.

#### Maybe remainder isn't so bad after all

If this isn't for you then you can still optimise the remainder operation by
hard-coding the constant into a function.  The compiler knows how to convert
mod-by-constant into a couple of multiplies, shifts, and adds.  Then you just
need one function for each divisor you might use, and a function pointer to the
right one to use.

It's not _as_ fast, but it's still better than division.

## How good is it?  Show me the numbers!

That's not how this works.  I'm not here to show how one particular
implementation wins at one particular benchmark.  This is just a note on some
techniques for possible consideration when desiging an implementation --
whether that be generic or application-specific.  There are so many other
factors in the design of a hash table, and the interaction between these
methods and others in an existing or prospective implementation need to be
tested in that context.

[bijective]: https://en.wikipedia.org/wiki/Bijection
[perfect hash]: https://en.wikipedia.org/wiki/Perfect_hash_function
[hash instruction]: /why-i-want-a-dedicated-hash-instruction/
[range coder]: https://en.wikipedia.org/wiki/Range_coding
[de Bruijn sequence]: https://en.wikipedia.org/wiki/de_Bruijn_sequence

[constrain_hash]: https://github.com/llvm/llvm-project/blob/253d2f931e530f6fbc12bc8646e70ed7090baf20/libcxx/include/__hash_table#L140
