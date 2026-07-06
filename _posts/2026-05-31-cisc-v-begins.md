---
last_modified_at: 2026-07-03 18:53:07 +0000 # f68150a spelling
layout: post
title: "CISC-V: code compression in the style of a CISC architecture"
tags: vibe-coding computer-architecture riscv
---

Given a mixed-length instruction stream like Thumb or RVC you encounter
a few different headaches.  The most infamous case is the complexity
of handling un-aligned 32-bit instructions which can straddle
architectural boundaries like page or cache line boundaries.  There are
also caching and security implications of being able to jump into the
middle of an instruction, and multi-issue problems with recognising
correct instruction start points, and so on...

It also, while introducing some of the complexity of CISC, leaves behind
other CISC advantages like explicit macro-op encoding for often-fused
operations in higher-performance machines.  But by blithely throwing in
CISC instructions to get code size down you give up the simplicity of
implementation for compact designs.

So I've been [tinkering][experimental RISC-V compression] to try to find
a different compromise which allows both fast and compact
implementations to do things in a way that suits their separate goals.

I had hoped that this post, when I got to it, would be where I published
a more complete proof of concept over what I have discussed before, but
things have not gone to plan and I'm rushing this out tonight.

On the plus side, at least I have the name, now: CISC-V

And as we all know, naming is half the battle.

# Instruction-packet-based compression

While strict alignment could be imposed on an existing 16-bit
instruction compression scheme, that gives up coding space to express
things which are no longer legal.  It makes more sense to use 32-bit
packets (or, conceivably, 64-bit packets) which can, in turn, exploit
the intrinsic pairing of two opcodes within a packet for other gains.

That's the plan, here.  One 32-bit opcode may occupy a whole packet, or
two compact instructions can occupy the same space instead.

Since a lot of assembly refers to the same register repeatedly from one
instruction to the next it also makes sense to exploit this redundancy
within packets to regain some coding space.  CISC typically exploits
this by using the same register as destination and one of its sources,
but we can take things further by sharing with an adjacent instruction.

The down side is that some instructions which should be compact will
fail to be compact because they can't be moved adjacent to something
they can share the packet with.

Other constraints can be imposed on the packet, as well.

In particular, both instructions must execute (give or take exceptions).
There's no branching to just the second instruction in the packet (all
branch offsets must be 32-bit aligned, so relative branches reach
further).  And any branch out of the packet is coded as the second
instruction, so it can't prevent the execution of the other instruction
in the packet.

(There's an alternative model, here, where the first instruction can be
a forward branch to the next packet, rendering the second instruction in
the packet conditional, and the implementation can decide how it's going
to handle that)

The architecture still has to allow for exception restarts at the second
instruction, but it doesn't have to encode relative branches, and use of
such return addresses can be restricted to appropriate instructions
and/or privilege levels.  Or difficult restarts can just be emulated in
software.

## Decoding models

### Baby steps

Rather than decoding four bytes starting at the 16-bit address and
advancing either two or four bytes accordingly, we always examine a
32-bit packet and decode it in one of two different ways depending on
whether our instruction pointer is at an odd or even 16-bit boundary.

Alternatively, upon entry to a 32-bit packet, we decode the first
instruction and begin to execute it, and concurrently we shuffle the
bits around to produce a 32-bit opcode to decode on the next cycle using
the same instruction decoder (with a bit of extra logic so exception
resume can ignore the first instruction when necessary).

This is the target of the "as-if model" for other approaches.  Ambiguous
cases, if they're allowed (preferably not!), should be resolved in terms
of what this model would do.  Here we risk producing those gnarly
situations that cause high-performance implementations to do pipeline
flushes, so try very hard to avoid this.

### Omnomnomnom!

If you have the sort of implementation which likes to pick up dozens of
opcodes at once and throw them all down the pipeline in parallel to be
sorted out later, then you probably don't want to hear about decoding
each 32-bit packet twice and producing up to twice as many instructions
as packets, even if most of them are no-op placeholders for instructions
which didn't decode.

To avoid that headache I propose pushing it back to the µ-op fission
stage, since that exists already and it's already in the habit of
splitting things up which are too complicated.

What could possibly go wrong?  I don't know, so I assume it's fine.

As a secondary benefit, it creates opportunities to _not_ break some
instructions, and to treat some packets as pre-fused macro-ops.

## Exceptions

A restartable exception may be triggered within an instruction pair, and
the architecture has to allow for this.

My working assumption is that bit 1 in the program counter or return
address signals that the first instruction is to be ignored (it has
already executed and retired), but this will not be used in any normal
operation outside of exceptions.  No calls can set this bit, no returns
outside of exceptions should accept it being set, and relative branches
are in 32-bit increments.

Also, while instruction pairing may suggest the use of a direct data
path from one instruction to the next within the packet, without the need
to land the result in a register, this data still has to be exposed for
save, restore, and inspection by an exception handler. So a temporary
register must be available.

# The experiment

I vibe-coded a tool to try to maximise pairs of instructions by
reordering instructions in ways that were functionally equivalent (in
particular, by noting when registers were dead) but which would open up
pairing opportunities.  Unfortunately Claude soon became mired in its
own bad code, and I was spending more time asking it to clean up its
messes than I was trying new experiments.

For sample data I used a generic kernel built for a basic RVA profile
(or maybe RVM?), and I built [Godot][] for RVA23, and ran stats on both
of these, attempting to reorder instructions to bring pairs together,
but not too intelligently.

This is operating a little blind, and overlooking how the compiler might
arrange things differently if it knew the target instruction set, but
it's the limit of the effort I'm going to make.  Instead, I spent most
of my energy cursing at Claude.

The whole effort was kind of a bust, and I needed to spend more time
than I had doing it all from scratch.  I could, theoretically, vibe-code
it from scratch asking for a much more restricted tool where I could do
the hard parts myself, but I don't have time for that.

What I did get, though, was a better feel for what pairing rules are
actually useful if the compiler were to put things in an order that
exploited them.

# Pairing types

The rules I found which most often identify pairable instructions are:

* load/store at adjacent memory locations (Aarch64's `ldp` and `stp`
  opcodes) (top by a large margin)
* pairs of independent `mv` or `li` instructions 
* double-indirect memory accesses (load a pointer, then load/store
  whatever that pointer points to)
* pre/post increment memory operations
* pairs of independent arithmetic in two-operand form (`rsd, rs2`)
* compare-branch chains (branch depends on result of comparison)
* load-branch chains (load followed by conditional branch on loaded
  value; which is then discarded)
* arithmetic chains

## Chain rules

Chains are where the second instruction depends on the first, and in the
experiments that I did the result of the first must also be discarded
after use by the second, so the intermediate value needn't be exposed in
an architectural register -- except that it's still needed for
single-stepping implementations and exceptions.  My solution, here, is
to use `x31` or `x15` as the hard-coded temporary register, with a rule
that the content of the register is undefined after the second
instruction.

Some pre-increment rules could be chains, too.  These are cases where a
value is added to a register before using that register as the base of a
memory operation, _and_ the base register is discarded after use.
Pre-increment achieves this but it overwrites the original base register
with the modified address, which is not always the desired outcome
(maybe 50:50, varying significantly by testcase).

So, instruction pairs like:

```
op0, rd0, ra0, rb0
op1, rd1, rd0, rb1
```
or
```
op0, rd1, ra0, rb0
op1, rd1, rd1, rb1
```
can be replaced with:
```
op0, x31, ra0, rb0
op1, rd1, x31, rb1
```
and then `x31` is not coded at all, but rather deduce that from the
pairing category.

This pattern has further sub-classes where the relationship between
`op0` and `op1` is constrained to save coding space.

First, exclude the two-operand instructions (one-in-one-out), like `li`
and `mv` because they don't benefit.

If the second instruction is load/store, then the first is preparing
its base address (pre-increment, no write-back), and shifts and bit
manipulation aren't likely to be any use, so make a category and exclude
those possibilities.  At the same time the load/store instruction
encodes a data size and this can restrict possibilities for the other
instruction; eg., by choosing the right `X` for `shXadd` so we need only
one entry in the set for all the adds.

Some instructions might not themselves be common enough to make
available in both slots in a generic chain, but when they're used we can
guess at what they'll pair with and make a mini set for them.  For
example, `slli` is often followed by `srli`, `srai`, `add`, `sub`, or
`or`.

I had hoped to prohibit load-use-discard altogether and to keep the
emphasis on things that paired without huge unknowable delays between
the two, but the reality is that it's too common to ignore in a
compression scheme.

So if the first instruction is a load it may go on to generic
arithmetic (which usually has other pairing opportunities anyway), but a
lot of cases involve conditional branches or second indirections, and
these are very hard to ignore.

I'd be curious to see how load-branch-discard could play out if it's
signalled explicitly in the instruction stream.  Could branch prediction
handle it differently from the signals it gets from the ALU?

Similarly, could explicitly-coded double-indirection (load-load-discard)
suggest data prediction optimisations where they're not otherwise
warranted?

## two-operand arithmetic rules

The best-known code size optimisation is to encode three-operand
instructions with two operands by re-using the first source as the
destination register.

In theory this could be another mode for chain rules, where the first
result is saved for later and also forwarded to the second instruction;
but that doesn't seem to come up that frequently in the general case (a
notable exception is pre-increment addressing).

Really a pair of these just sweeps up a lot of arithmetic which doesn't
otherwise fit a chain rule. This is redundant with chain rules if two of
these in a packet use the same destination register (reserve for future
use?), and the chain version is slightly more flexible in that it starts
with two read-only inputs rather than just one.

But these can also be used to fill the pairing space with compact
non-arithmetic instructions, like updating the stack pointer before
function return, or implementing pre-increment with writeback before a
memory access.

It's tempting to take aside some operations which are uninteresting when
`ra` and `rb` are the same register, and to re-purpose those as unary
operations like `neg`, `not`, and `slli rd, 1, rd`.

Another special case here would be `addi sp, imm`, where the immediate
here has to be a multiple of 16, so it can reach further, which is not a
case which applies to `addi rd, sp, imm`.

## two-in-two-out rules

There's a group of operations which are often paired implicitly in CISC
architectures, like `mul`/`mulh` or `div`/`rem`, and it's potentially
beneficial to fuse these because most of the work overlaps.

Instructions like those take the same two inputs for two different
operations which produce two different outputs.

Other obvious pairs would be `min`/`max`, `add`/`sub`, `and`/`andn`, but
these are only meaningful for coding efficiency (if you want to keep the
inputs unmodified).

For coding efficiency I also put `mv`/`mv`, `li`/`li`, and `mv`/`li`
(`li`/`mv` is uninteresting) into this set, where each instruction
simply takes one or other argument directly.

We can also put the load-pair and store-pair instructions in this
category, with a small wrinkle that the second instruction does the same
thing but takes the immediate with an extra offset (the data size of the
memory operation).

# The compressible instruction sets

I simply haven't had enough time to decide what to put in my straw-man
proposal, yet. And I've run out of time to work it out.  I blame AI.

I've cobbled together enough fundamentals to make a Linux kernel smaller
than its RVC build (if my vibe-coded analysis tool is to be trusted),
but when I tried the same on a compiled Godot binary results were much,
much poorer.  I blame C++ for that.

# Instruction encoding

I've avoided dealing with this.  What I do instead is count up the
number of bits I need to encode all the fields, and then count the
number of combinations this creates and add these to the total, and try
to keep that total less than 2^30.

Actually laying the bits out in an instruction packet doesn't seem
terribly interesting.  I guess it's nice to align the source and
destination registers of the first instruction with those of the 32-bit
instructions (in a compact implementation there's another cycle to use
to redistribute the bits for a second interpretation).

[experimental RISC-V compression]: </experimental-riscv-instruction-compression>

[naturally aligned instruction set]: </naturally-aligned-instruction-set>
[Godot]: <https://docs.godotengine.org/en/stable/engine_details/development/compiling/index.html>
