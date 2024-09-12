---
last_modified_at: Thu, 15 Aug 2024 19:36:14 -0700  # a400103 naturally-aligned-instructions
layout: post
title:  Naturally-aligned compressed opcode encoding
mathjax: true
svg: true
---
In the world of fixed-length instruction sets, the addition of compressed
instructions (no-longer fixed-length instructions) is kind of a nuisance.  Arm
dropped them when they went to AArch64, and there was a [proposal][optional C]
to make them optional in RISC-V but it [didn't fly][RVI BoD decision].

Complaints about compressed instructions which I've heard most
frequently include:
* Instructions can straddle cache lines, and other implementation-dependent
  boundaries, making implementation complicated and error-prone.
* Potential number of instruction start points for instructions is large but
  sparse, leaving a lot of bubbles or other garbage to clean up early in the
  pipeline for large-scale out-of-order implementations.
* Execution could begin in the middle of an instruction, with unexpected
  behaviour creating new [gadgets][] that are hard for tooling to discover
  and mitigate.

## natural alignment

One partial compromise is to allow smaller instructions but allowing larger
instructions only at their natural alignments.  A 32-bit instruction can only
start at a 32-bit boundary, a 16-bit instruction can start at any 16-bit
boundary, and a 64-bit instruction must only start on a 64-bit boundary.

This ensures that no instruction straddles feature boundaries, and it
constrains the look-back distance to ensure that an entrypoint is not
actually the middle of a larger instruction: you need only go back to
the natural alignment of the largest instruction format supported in the
architecture (it might be half that, but I haven't yet confirmed).

And I don't know if this makes sense in a real implementation, but it
seems to me that you can also mitigate the excessive number of
instruction start points by ingesting aligned pairs of compressed
instructions as a single instruction at the front end, and then
splitting them into their constituents as micro-ops later on.  Or if
there's a performance benefit and you don't mind deviating from
2-in-1-out operand model then you could implement the instruction pair
as a single μ-op.  But that's an implementation detail and probably
shouldn't be allowed to steer the design unduly...  let me [circle back
to that](#macro-op-fusion).

If you need a 32-bit instruction to follow a 16-bit instruction which ends at
an odd 16-bit boundary, then you replace that 16-bit instruction with a 32-bit
equivalent to make it end at a 32-bit boundary (or possibly to reorder some
instructions).  This implies some loss of compression.

As an aside, my personal inclination is to also prohibit branches to odd 16-bit
aligned destinations because it's not hard to force the alignment of branch
targets, and you get one more bit in return in the offset of relative branches.

But there are a couple of other advantages that fall out of natural alignment,
too.  I think these mostly come from being able to take a packetised view of
the encoding.

As a general rule, compression techniques offer increasing gains by considering
larger contexts at once, at the cost of greater complexity in decoding.  That's
an ever-shifting balance which depends on what technologies and techniques and
trade-offs exist to mitigate that complexity.

I'll just try to look at some simple things.

The simplest benefit of packetising pairs of compressed (notionally 16-bit)
instructions in the space of a normal (notionally 32-bit) instruction is in
having flexibility in how you apportion the coding space.  For example, a
32-bit packet might use a two-bit prefix which apportions three quarters of the
space to 31½-bit opcodes and one quarter to pairs of 15-bit compressed opcodes.

But more importantly, we can also take the first step into exploiting context.

### overlapping opcodes

Supposing the instruction decoder must see all 32 bits of the current
instruction in case it turns out to be a 32-bit instruction, a
16-bit instruction at that position doesn't strictly have to be limited
to the first 16 bits.  It could decode instruction arguments from
anywhere in the 32-bit word even if it is marked as a 16-bit
instruction.  It just has to loop back and do this a second time,
decoding different bits, if the first instruction was compressed (or if
something branched to the odd 16-bit offset of that 32-bit instruction
packet, or if an exception has to resume there).

And if you can jumble the bits up like this then you can also overlap
them.  This is already fairly typical within a single instruction where
the destination and the first source register are logically overlapped
and decoded from the same bits (sometimes denoted as the `Rsd` operand):
<svg viewbox="-1 -1 800 126">
  <defs>
    {%- for opc in (0..1) -%}
      <g id="opc{{opc}}_4" class="block{{opc}}">
        <rect x="0" y="0" width="64" height="24"/>
        <text x="32" y="12">Op{{opc}} op</text>
      </g>
      <g id="rs1_{{opc}}_5" class="block{{opc}}">
        <rect x="0" y="0" width="80" height="24"/>
        <text x="40" y="12">Op{{opc}} Rs1</text>
      </g>
      <g id="rs2_{{opc}}_5" class="block{{opc}}">
        <rect x="0" y="0" width="80" height="24"/>
        <text x="40" y="12">Op{{opc}} Rs2</text>
      </g>
      <g id="imm5_{{opc}}" class="block{{opc}}">
        <rect x="0" y="0" width="80" height="24"/>
        <text x="40" y="12">Op{{opc}} imm</text>
      </g>
      <g id="imm10_{{opc}}" class="block{{opc}}">
        <rect x="0" y="0" width="160" height="24"/>
        <text x="80" y="12">Op{{opc}} imm</text>
      </g>
      <g id="rd_{{opc}}_5" class="block{{opc}}">
        <rect x="0" y="0" width="80" height="24"/>
        <text x="40" y="12">Op{{opc}} Rd</text>
      </g>
      <g id="rsd_{{opc}}_5" class="block{{opc}}">
        <use href="#rs1_{{opc}}_5" x="0" y="-12"/>
        <use href="#rd_{{opc}}_5" x="0" y="12"/>
      </g>
    {%- endfor -%}
  </defs>
  <use href="#pfx1"    x=  "0" y="12"/>
  <use href="#pfx0"    x= "16" y="12"/>
  <use href="#opc0_4"  x= "32" y="12"/>
  <use href="#rsd_0_5" x= "96" y="12"/>
  <use href="#rs2_0_5" x="176" y="12"/>
  <use href="#pfx1"    x="256" y="12"/>
  <use href="#pfx0"    x="272" y="12"/>
  <use href="#opc1_4"  x="288" y="12"/>
  <use href="#rsd_1_5" x="352" y="12"/>
  <use href="#rs2_1_5" x="432" y="12"/>

  <use href="#pfx1"    x=  "0" y="87"/>
  <use href="#pfx0"    x= "16" y="87"/>
  <use href="#opc0_4"  x= "32" y="87"/>
  <use href="#rsd_0_5" x= "96" y="87"/>
  <use href="#rs2_0_5" x="176" y="87"/>
  <use href="#pfx1"    x="256" y="87"/>
  <use href="#pfx1"    x="272" y="87"/>
  <use href="#opc1_4"  x="288" y="87"/>
  <use href="#rsd_1_5" x="352" y="87"/>
  <use href="#imm5_1"  x="432" y="87"/>
</svg>
Perhaps it's beneficial to have a mode of compression which overlaps the
destination of the first instruction with a source of the second instruction.
Eg.,
<svg viewbox="-1 0 800 162">
  <use href="#pfx1"    x=  "0" y= "12"/>
  <use href="#pfx1"    x= "16" y= "12"/>
  <use href="#opc0_4"  x= "32" y= "12"/>
  <use href="#rd_0_5"  x="432" y=  "0"/>
  <use href="#rs1_0_5" x= "96" y= "12"/>
  <use href="#rs2_0_5" x="176" y= "12"/>
  <use href="#pfx1"    x="256" y= "12"/>
  <use href="#pfx0"    x="272" y= "12"/>
  <use href="#opc1_4"  x="288" y= "12"/>
  <use href="#rsd_1_5" x="352" y= "12"/>
  <use href="#rs2_1_5" x="432" y=" 24"/>

  <use href="#pfx1"    x=  "0" y= "87"/>
  <use href="#pfx1"    x= "16" y= "87"/>
  <use href="#opc0_4"  x= "32" y= "87"/>
  <use href="#rsd_0_5" x="432" y= "75"/>
  <use href="#imm10_0" x= "96" y= "87"/>
  <use href="#pfx1"    x="256" y= "87"/>
  <use href="#pfx1"    x="272" y= "87"/>
  <use href="#opc1_4"  x="288" y= "87"/>
  <use href="#rs1_1_5" x="352" y= "75"/>
  <use href="#rd_1_5"  x="352" y= "99"/>
  <use href="#rs2_1_5" x="432" y="111"/>
</svg>
Operations which spring to mind are array indexing and pre/post
increments on load/store addressing, and compare/branch instructions,
which I think were part of the [Qualcomm proposal][Zics] (later named
"Zics").  The difference here, though, is that the instructions are
still logically separate, and if you don't like the deviation from
2-in-1-out operand regularity, then you don't have to deviate and can
just regard the instructions separately.

Presumably many pairs of compressed instructions would pass a result from the
first op to the second and then have no further use for that temporary.  In
that case using the same destination register operand for both might be
appropriate (so the second op implicitly destroys the temporary), but that's
not always appropriate -- for example when the second destination register is
also an input to the second operation.

Perhaps a better method might be to use an encoding with a fixed register (or
small subset of registers) as the temporary.
<svg viewbox="-1 -1 800 150">
  <use href="#pfx1"    x=  "0" y= "12"/>
  <use href="#pfx1"    x= "16" y= "12"/>
  <use href="#opc0_4"  x= "32" y= "12"/>
  <use href="#rs1_0_5" x= "96" y= "12"/>
  <use href="#rs2_0_5" x="176" y= "12"/>
  <use href="#pfx1"    x="256" y= "12"/>
  <use href="#pfx0"    x="272" y= "12"/>
  <use href="#opc1_4"  x="288" y= "12"/>
  <use href="#rd_1_5"  x="352" y= "12"/>
  <use href="#rs1_1_5" x="432" y=" 12"/>

  <use href="#pfx1"    x=  "0" y= "87"/>
  <use href="#pfx1"    x= "16" y= "87"/>
  <use href="#opc0_4"  x= "32" y= "87"/>
  <use href="#rs1_0_5" x="432" y= "87"/>
  <use href="#imm10_0" x= "96" y= "87"/>
  <use href="#pfx1"    x="256" y= "87"/>
  <use href="#pfx1"    x="272" y= "87"/>
  <use href="#opc1_4"  x="288" y= "87"/>
  <use href="#rs1_1_5" x="352" y= "75"/>
  <use href="#rd_1_5"  x="352" y= "99"/>

  <text x="640" y="24">constant</text>
  <use href="#pfx1"    x="600" y= "36"/>
  <use href="#pfx1"    x="616" y= "36"/>
  <use href="#pfx1"    x="632" y= "36"/>
  <use href="#pfx1"    x="648" y= "36"/>
  <use href="#pfx1"    x="664" y= "36"/>
  <use href="#rd_0_5"  x="600" y="60"/>
  <use href="#rs2_1_5"  x="600" y="84"/>
</svg>

As a general rule even if the temporary should be discarded after the second
instruction it does need to be accessible between the instructions in case the
second raises an exception and the temporary result from the first needs to be
saved and restored by the handler.  Or you could carefully design things so
that the instruction pair is idempotent and the resume can start at the first
instruction (consistent with my disinclination for oddly-aligned branch
targets).

After that there's the matter of how to denote various instruction size
combinations when they're more constrained by the lack of unaligned
cases.

### opcode size encoding

If everything is bundled in a maximum-chunk-size packet then the number of ways
to subdivide that into [notionally] power-of-two-sized instructions can be
calculated as:
1. A short instruction: $1$ possibility
1. Two of the above or one long instruction: $1 \times 1 + 1 = 2$ possibilities
1. Any two of the above, or one longer instruction: $2 \times 2 + 1 = 5$ possibilities
1. Any two of the above, or one longerer instruction: $5 \times 5 + 1 = 26$ possibilities
1. Any two of the above, or one longererer instruction: $26 \times 26 + 1 = 677$ possibilities
1. etc..

This isn't coming out to a nice round number of bits, but it can be expressed
in various [variable-length code][] arrangements, depending on which cases you
want to optimise.

With a view to supporting the stream-of-bits instruction decoder model
(potentially at the cost of being able to validate misaligned entrypoints and
reintroducing surprise gadgets), these variable-length codes should be
distributed across some minimum atom size in a way that indicates how each atom
is to be interpreted without look-back to the header of a larger packet.  This
also allows future expansion to larger packet sizes without changing the
instruction encoding.

Trying to make this arbitrary-length at the outset while remaining efficient is
hard.

Here's a trivial system where the most significant bit of the smallest
instruction size is an end-of-opcode flag (sort of like [LEB128][] or
whatever).  Then reclaim any bits that would signal a non-power-of-two
instruction, because those don't exist.

<svg viewbox="-1 -20 800 100">
  <defs>
    {%- for i in (0..15) -%}
      <g id="hwrd{{i}}">
        <text x="0" y="-10" style="text-anchor:start">{{i|times:16|plus:15}}</text>
        <text x="96" y="-10" style="text-anchor:end">{{i|times:16}}</text>
      </g>
    {%- endfor -%}
    {%- for i in (0..1) -%}
      <g id="pfx{{i}}">
        <rect x="0" y="0" width="16" height="24"/>
        <text x="8" y="12">{{i}}</text>
      </g>
    {%- endfor -%}
    {%- for opc in (0..15) -%}
      <g id="opc{{opc}}_16" class="block{{opc}}">
        <rect x="0" y="0" width="96" height="24"/>
        <text x="48" y="12">Op{{opc}}</text>
      </g>
      <g id="opc{{opc}}_15" class="block{{opc}}">
        <rect x="16" y="0" width="80" height="24"/>
        <text x="56" y="12">Op{{opc}}</text>
      </g>
    {%- endfor -%}
  </defs>
  <use href="#pfx1"    x=  "0" y="0" />
  <use href="#pfx1"    x="100" y="0" />
  <use href="#pfx0"    x="200" y="0" />
  <use href="#pfx1"    x="300" y="0" />
  <use href="#opc0_15" x=  "0" y="0" />
  <use href="#opc1_15" x="100" y="0" />
  <use href="#opc2_15" x="200" y="0" />
  <use href="#opc2_15" x="300" y="0" />
  <use href="#hwrd0"   x=  "0" y="0" />
  <use href="#hwrd0"   x="100" y="0" />
  <use href="#hwrd0"   x="200" y="0" />
  <use href="#hwrd1"   x="300" y="0" />

  <use href="#pfx0"    x="400" y="0" />
  <use href="#pfx0"    x="500" y="0" />
  <use href="#pfx1"    x="600" y="0" />
  <use href="#opc3_15" x="400" y="0" />
  <use href="#opc3_15" x="500" y="0" />
  <use href="#opc3_15" x="600" y="0" />
  <use href="#opc3_16" x="700" y="0" />
  <use href="#hwrd0"   x="400" y="0" />
  <use href="#hwrd1"   x="500" y="0" />
  <use href="#hwrd2"   x="600" y="0" />
  <use href="#hwrd3"   x="700" y="0" />

  <use href="#pfx0"    x=  "0" y="50" />
  <use href="#pfx0"    x="100" y="50" />
  <use href="#pfx0"    x="200" y="50" />
  <use href="#pfx1"    x="300" y="50" />
  <use href="#opc4_15" x=  "0" y="50" />
  <use href="#opc4_15" x="100" y="50" />
  <use href="#opc4_15" x="200" y="50" />
  <use href="#opc4_15" x="300" y="50" />
  <use href="#hwrd0"   x=  "0" y="50" />
  <use href="#hwrd1"   x="100" y="50" />
  <use href="#hwrd2"   x="200" y="50" />
  <use href="#hwrd3"   x="300" y="50" />
  <use href="#opc4_16" x="400" y="50" />
  <use href="#opc4_16" x="500" y="50" />
  <use href="#opc4_16" x="600" y="50" />
  <use href="#opc4_16" x="700" y="50" />
  <use href="#hwrd4"   x="400" y="50" />
  <use href="#hwrd5"   x="500" y="50" />
  <use href="#hwrd6"   x="600" y="50" />
  <use href="#hwrd7"   x="700" y="50" />
</svg>
This saves a few bits where there's no need to express non-power-of-two
extensions, but it fails to exploit attempts generating instructions at bad
alignments.  Notice that it makes no sense, for example, for a 0 to follow a 1
at an odd 16-bit offset, because this would imply an instruction word which
would not be naturally aligned.

So let's grab that encoding space as well...
<svg viewbox="-1 -20 800 100">
  <use href="#pfx1"    x="200" y="0" />
  <use href="#pfx0"    x="300" y="0" />
  <use href="#opc2_15" x="200" y="0" />
  <use href="#opc2_15" x="300" y="0" />
  <use href="#hwrd0"   x="200" y="0" />
  <use href="#hwrd1"   x="300" y="0" />

  <use href="#pfx1"    x="400" y="0" />
  <use href="#pfx0"    x="500" y="0" />
  <use href="#pfx0"    x="600" y="0" />
  <use href="#pfx1"    x="700" y="0" />
  <use href="#opc3_15" x="400" y="0" />
  <use href="#opc3_15" x="500" y="0" />
  <use href="#opc3_15" x="600" y="0" />
  <use href="#opc3_15" x="700" y="0" />
  <use href="#hwrd0"   x="400" y="0" />
  <use href="#hwrd1"   x="500" y="0" />
  <use href="#hwrd2"   x="600" y="0" />
  <use href="#hwrd3"   x="700" y="0" />

  <use href="#pfx1"    x=  "0" y="50" />
  <use href="#pfx0"    x="100" y="50" />
  <use href="#pfx0"    x="200" y="50" />
  <use href="#pfx0"    x="300" y="50" />
  <use href="#opc4_15" x=  "0" y="50" />
  <use href="#opc4_15" x="100" y="50" />
  <use href="#opc4_15" x="200" y="50" />
  <use href="#opc4_15" x="300" y="50" />
  <use href="#hwrd0"   x=  "0" y="50" />
  <use href="#hwrd1"   x="100" y="50" />
  <use href="#hwrd2"   x="200" y="50" />
  <use href="#hwrd3"   x="300" y="50" />
  <use href="#pfx1"    x="400" y="50" />
  <use href="#opc4_15" x="400" y="50" />
  <use href="#opc4_16" x="500" y="50" />
  <use href="#opc4_16" x="600" y="50" />
  <use href="#opc4_16" x="700" y="50" />
  <use href="#hwrd4"   x="400" y="50" />
  <use href="#hwrd5"   x="500" y="50" />
  <use href="#hwrd6"   x="600" y="50" />
  <use href="#hwrd7"   x="700" y="50" />
</svg>
Now it's getting messy.

This isn't very regular because while it doubles the size of the 32-bit
encoding space, extra bits are needed to distinguish between 64 and 128 and
other instruction lengths, and there are still other unused patterns to be
reclaimed in a way that isn't going to be regular or cheap.

There are ways to rebalance this by using a larger atom size.  Like using
32-bit packets which may contain 16-bit instructions or be fused into 64-bit or
128-bit instructions.

Maybe I'll have a think about that at some point...

Something more robust, but wasteful, might be a system similar to [UTF-8][],
where extension words are all illegal start words:
<svg viewbox="-1 -20 800 100">
  <use href="#pfx1"    x=  "0" y="0" />
  <use href="#pfx1"    x="100" y="0" />
  <use href="#opc0_15" x=  "0" y="0" />
  <use href="#opc1_15" x="100" y="0" />
  <use href="#hwrd0"   x=  "0" y="0" />
  <use href="#hwrd0"   x="100" y="0" />
  <use href="#pfx1"    x="200" y="0" />
  <use href="#pfx0"    x="300" y="0" />
  <use href="#opc2_15" x="200" y="0" />
  <use href="#opc2_15" x="300" y="0" />
  <use href="#hwrd0"   x="200" y="0" />
  <use href="#hwrd1"   x="300" y="0" />

  <use href="#pfx1"    x="400" y="0" />
  <use href="#pfx0"    x="500" y="0" />
  <use href="#pfx0"    x="600" y="0" />
  <use href="#pfx0"    x="700" y="0" />
  <use href="#opc3_15" x="400" y="0" />
  <use href="#opc3_15" x="500" y="0" />
  <use href="#opc3_15" x="600" y="0" />
  <use href="#opc3_15" x="700" y="0" />
  <use href="#hwrd0"   x="400" y="0" />
  <use href="#hwrd1"   x="500" y="0" />
  <use href="#hwrd2"   x="600" y="0" />
  <use href="#hwrd3"   x="700" y="0" />

  <use href="#pfx1"    x=  "0" y="50" />
  <use href="#pfx0"    x="100" y="50" />
  <use href="#pfx0"    x="200" y="50" />
  <use href="#pfx0"    x="300" y="50" />
  <use href="#opc4_15" x=  "0" y="50" />
  <use href="#opc4_15" x="100" y="50" />
  <use href="#opc4_15" x="200" y="50" />
  <use href="#opc4_15" x="300" y="50" />
  <use href="#hwrd0"   x=  "0" y="50" />
  <use href="#hwrd1"   x="100" y="50" />
  <use href="#hwrd2"   x="200" y="50" />
  <use href="#hwrd3"   x="300" y="50" />
  <use href="#pfx0"    x="400" y="50" />
  <use href="#pfx0"    x="500" y="50" />
  <use href="#pfx0"    x="600" y="50" />
  <use href="#pfx0"    x="700" y="50" />
  <use href="#opc4_15" x="400" y="50" />
  <use href="#opc4_15" x="500" y="50" />
  <use href="#opc4_15" x="600" y="50" />
  <use href="#opc4_15" x="700" y="50" />
  <use href="#hwrd4"   x="400" y="50" />
  <use href="#hwrd5"   x="500" y="50" />
  <use href="#hwrd6"   x="600" y="50" />
  <use href="#hwrd7"   x="700" y="50" />
</svg>
There are various rearrangements of that to move the efficient cases to
different instruction sizes, but that's also not too interesting right now.

### macro-op fusion

I mentioned earlier that it wasn't good form to let implementation lead design,
here, but a frustration with RISC-V's purity is the dependence on [macro-op
fusion][macro-op paper] to meet the performance of less pure architectures.  I
see a lot of overlap between Zics and the [proposed list][macro-op list] on
WikiChip (though some of fused ops already exist in other extensions).

If aligned, contextually-compressed instruction pairs facilitate easier fusion,
then we gain a kind of compound instruction; maintaining the purity of two
basic instructions with the performance potential of the fused pair.

Given the compression achievements with Zics, it seems prudent to be
conservative in the allocation of compressed opcode pairs.  Allocating only
what's needed to match existing compression and facilitate known fusion
candidates, and not squandering the rest on the long tail of marginal gains in
either space.

### going futher

Extending an instruction coding scheme out to naturally-aligned 64-bit and
beyond also allows evolution in the direction either of VLIW or more ambitious
context-exploiting instruction compression.  I cannot imagine a case for
stronger compression today, but if one wanted to invest so heavily in such an
instruction decoder it would certainly be doable.


[gadgets]: <https://en.wikipedia.org/wiki/Return-oriented_programming#Gadget>
[UTF-8]: <https://en.wikipedia.org/wiki/UTF-8>
[optional C]: <https://lists.riscv.org/g/tech-profiles/topic/101741936#msg297>
[RVI BoD decision]: <https://lists.riscv.org/g/tech-profiles/topic/102522954#msg434>
[variable-length code]: <https://en.wikipedia.org/wiki/variable-length_code>
[LEB128]: <https://en.wikipedia.org/wiki/LEB128>
[macro-op list]: <https://en.wikichip.org/wiki/macro-operation_fusion#Proposed_fusion_operations>

[macro-op paper]: <https://arxiv.org/abs/1607.02318>
[other]: <https://lists.riscv.org/g/tech-profiles/topic/rva23_versus_rvh23_proposal/102127876>
[naturally aligned]: <https://lists.riscv.org/g/tech-profiles/topic/would_naturally_aligned_only/102199380>
[android code compression]: <https://lists.riscv.org/g/tech-profiles/topic/code_compression_in_android/102210164>
[code size sensitivity]: <https://lists.riscv.org/g/tech-profiles/topic/code_size_sensitivity_in/102127557>
[qualcomm slides]: <https://lists.riscv.org/g/tech-profiles/topic/qualcomm_slides_on_c/101784675>
[Zics]: <https://lists.riscv.org/g/tech-profiles/attachment/332/0/code_size_extension_rvi_20231006.pdf>
