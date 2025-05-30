---
last_modified_at: Fri, 21 Mar 2025 16:48:51 -0700  # 0419f48 smaller-verilog
layout: post
title:  A reasonably effective hash instruction
description: A 128-to-64 bit hash operation which is cheap to implement in hardware and does most of a decent job in one cycle.
tags: hashing random computer-architecture handwaving
---
As per [part one][] of this post, I have reasoned through and tested a proof of
concept for generic CPU instruction which could achieve most of the required
mixing of a good hash function in a single cycle (working with a combinational
depth of 20 to 24 gates as a guide).

I wanted something that could be used to permute a 64-bit value, or be used to
merge two 64-bit values into a single 64-bit result (because hashing is
generally also one-way compression).

I decided to try a simple [substitution-permutation network][].  In one phase,
take small groups of bits and replace them via a substitution box (a lookup
table), and in another phase rearrange the individual bits to new positions in
the output where they will have new neighbours in subsequent rounds.

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

Here's the same thing in Verilog:
```verilog
module hash_test;
    function [3:0] sbox (input [3:0] x);
            sbox = { 16'h613d, 16'h613d } >> x & 15;
    endfunction
    function [63:0] round (input [63:0] x);
        reg [63:0] y;
        begin
            { y[48], y[32], y[16], y[ 0] } = sbox(x[ 3-:4]);
            { y[49], y[33], y[17], y[ 1] } = sbox(x[ 7-:4]);
            { y[50], y[34], y[18], y[ 2] } = sbox(x[11-:4]);
            { y[51], y[35], y[19], y[ 3] } = sbox(x[15-:4]);
            { y[52], y[36], y[20], y[ 4] } = sbox(x[19-:4]);
            { y[53], y[37], y[21], y[ 5] } = sbox(x[23-:4]);
            { y[54], y[38], y[22], y[ 6] } = sbox(x[27-:4]);
            { y[55], y[39], y[23], y[ 7] } = sbox(x[31-:4]);
            { y[56], y[40], y[24], y[ 8] } = sbox(x[35-:4]);
            { y[57], y[41], y[25], y[ 9] } = sbox(x[39-:4]);
            { y[58], y[42], y[26], y[10] } = sbox(x[43-:4]);
            { y[59], y[43], y[27], y[11] } = sbox(x[47-:4]);
            { y[60], y[44], y[28], y[12] } = sbox(x[51-:4]);
            { y[61], y[45], y[29], y[13] } = sbox(x[55-:4]);
            { y[62], y[46], y[30], y[14] } = sbox(x[59-:4]);
            { y[63], y[47], y[31], y[15] } = sbox(x[63-:4]);
            round = y;
        end
    endfunction
    function [63:0] premix0 (input [63:0] x);
        premix0 = x ^ ({x,x} >> 15 & 64'hfffffffffffffbff);
    endfunction
    function [63:0] premix1 (input [63:0] x);
        reg [63:0] y;
        begin
            y = {x,x} >> 32;
            premix1 = y ^ ({y,y} >> 17 & 64'hfffffffffffdffff);
        end
    endfunction
    function [63:0] hash (input [63:0] x, y);
            hash = round(round(premix0(x) ^ premix1(y)));
    endfunction

    integer i;
    initial begin
        for (i = 0; i < 32; i += 1) begin
            $display("%016x, %016x, %016x, %016x, %016x",
                    i, hash(i, 0), hash(0, i),
                    hash(i, 64'h3141592653589793), hash(64'h3141592653589793, i));
        end
        $finish;
    end
endmodule
```

There's something missing from this premix stage, though.  `ROTR64()` on
its own is a fairly uninteresting permutation because neighbours before
the operation are mostly the same neighbours as after.  There would be
more mixing of neighbours achieved if the permutation were more
convoluted.  This has caveats where not every permutation leads to a
bijective operation.

This is an example of how crypto operations tend to let us down.  They're
defined on simpler operations, at the cost of slower mixing[^1], and use many
rounds to compensate.

One mitigation is to permute `x` before and after the whole premix operation.
This only does half the job, and what would be better still is uncorrelated
permutations for the two inputs to the exclusive-or, but chosen to ensure
that the overall operation is still bijective.  Also, since wiring isn't
actually free, permutations chosen to synthesise sensibly.

I have not addressed this here.

[^1]: For good reason, but not a reason I care about.

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

[part one]: /why-i-want-a-dedicated-hash-instruction/
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
