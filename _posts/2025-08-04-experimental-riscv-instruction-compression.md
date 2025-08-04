---
layout: post
title: An experimental RISCV instruction compression
tags: computer-architecture
redirect_from:
  - /drafts/experimental-riscv-instruction-compression/
---

I wanted to experiment with a means of reducing compiled RISCV code size
in a way that did _not_ allow for the creation of un-aligned 32-bit
opcodes, so I had a bit of a tinker with 32-bit packets containing
instruction pairs.

## Rationale

RISCV sees implementations ranging from lightweight scalar to wide
OOE superscalar, each needing to take very different approaches to how
the instruction stream is ingested.

Things like the large number of instruction entrypoints with unaligned
32-bit opcodes are problematic for out-of-order machines; while the
low-end processors still want to minimise code size and icache burden.

I've previously mused over the idea of [aligned 32-bit packets of 16-bit
instructions][natural alignment] with extra constraints to try to make
it easy to ingest the packet as a single opcode, and then to split it
into micro-ops later in the pipeline, where everything gets split into
micro-ops already.

And at the same time I observed that overlapping `rd` and `rs1` operands
is not the only way to overload the bits in an opcode.

So without any real insight into the technicalities of how those things
would work out in practice, I set about making my own little straw-man.

I've taken [inspiration](#references) from other proposals, and tried to
make such extensions available as pairs of more pedestrian opcodes
within the same 32-bit packet.  So what might look like a CISC
instruction can be dressed up as two compressed RISC instructions
instead; even if one were to implement it as a single fused instruction.

## Design objectives

* Support only 32-bit opcode packets, but squeezing pairs of
  instructions into those packets for compression.
* Ensure that every such packet can be interpreted in two passes as two
  independent instructions, each conforming to the standard RISCV ISA
  model (2-in-1-out, etc.).
* Restrict branching to only the final operation of a packet.
* Try to exploit the frequent sharing of common registers in adjacent
  instructions to aid compression.
* Capture some proposed instruction extensions which could be
  implemented as macro-op fusion instructions and formalise them as
  pairs within one 32-bit packet.
* Use no more than 1/4 (30 bits) of the opcode space.
* Make code smaller.

### References

Qualcomm Znew/Zics:
* <https://lists.riscv.org/g/tech-profiles/attachment/332/0/code_size_extension_rvi_20231006.pdf>

Macro-op fusion stuff:
* <https://arxiv.org/pdf/1607.02318>
* <https://en.wikichip.org/wiki/macro-operation_fusion#Proposed_fusion_operations>

RISCV reference card:
* <http://riscvbook.com/greencard-20181213.pdf> (warning: non-SSL link)
* <https://www.cl.cam.ac.uk/teaching/1617/ECAD+Arch/files/docs/RISCVGreenCardv8-20151013.pdf>

## A provisional attempt
With no statistical model of instruction-pair frequency, I just guessed
at what might work and came up with the following.

For expediency I've only counted the number of instructions in each
class and laid them out sequentially.  It would be folly to try to
arrange the specific bit patterns for efficient decoding before the
supported instruction set is decided.

```
       0x0+0x10000000: 14: arith4  rsd,rsd,rs_imm          14: arith4  rsd,rsd,rs_imm          (28 bits)  660 hits
0x10000000+0x10000000: 14: arith4  t6,rs1,rs_imm           14: arith4  rd,t6,rs_imm            (28 bits)  0 hits
0x20000000  +0x800000: 14: arith5i rsd,rsd,imm5             9: arith5i rsd,rsd,{imm}           (23 bits)  79 hits
0x20800000  +0x800000: 14: arith5r rsd,rsd,rs2              9: arith5r rsd,rsd,{rs2}           (23 bits)  1 hits
0x21000000  +0x800000: 14: arith5i rsd,rsd,imm5             9: arith5r rsd,rsd,{rd}            (23 bits)  27 hits
0x21800000  +0x800000: 14: arith5r rsd,rsd,rs2              9: arith5r rsd,rsd,{rd}            (23 bits)  8 hits
0x22000000 +0x2000000: 14: arith4  rsd,rsd,rs_imm          11: beqz    {rd},imm11              (25 bits)  23 hits
0x24000000 +0x2000000: 14: arith4  rsd,rsd,rs_imm          11: bnez    {rd},imm11              (25 bits)  32 hits
0x26000000 +0x1000000: 13: cmpi    t6,rs1,imm5             11: beqz    t6,imm11                (24 bits)  0 hits
0x27000000 +0x1000000: 13: cmpi    t6,rs1,imm5             11: bnez    t6,imm11                (24 bits)  0 hits
0x28000000 +0x2000000: 14: arith4  rsd,rsd,rs_imm          11: j       imm11                   (25 bits)  76 hits
0x2a000000 +0x2000000: 14: arith4  rsd,rsd,rs_imm          11: jal     ra,imm11                (25 bits)  92 hits
0x2c000000  +0x100000: 15: arith5  rsd,rsd,rs_imm           5: jr      rs2                     (20 bits)  16 hits
0x2c100000  +0x100000: 15: arith5  rsd,rsd,rs_imm           5: jalr    ra,rs2                  (20 bits)  7 hits
0x2c200000  +0x200000: 21: --reserved--                    (21 bits)  0 hits
0x2c400000  +0xc00000: 19: pair.a  rd,rs1,rs2               5: {opcode:pair} rd,{rs1},{rs2}    (24 bits)  0 hits
0x2d000000 +0x1000000: 24: ldst    rd,imm10(rs1)            0: {opcode} {rd:next},{imm:next}({rs1})  (24 bits)  341 hits
0x2e000000 +0x8000000: 13: arith3  rsd,rsd,rs_imm          14: ldst    rd,0(rs1)               (27 bits)  364 hits
0x36000000 +0x8000000: 14: ldst    rd,0(rs1)               13: arith3  rsd,rsd,rs_imm          (27 bits)  635 hits
total size: 0x3e000000,  bits: 30
saved=2361, total=10258
```

Or here's another verison:

```
       0x0+0x10000000: 14: arith4  rsd,rsd,rs_imm          14: arith4  rsd,rsd,rs_imm          (28 bits)  658 hits
0x10000000+0x10000000: 14: arith4  t6,rs1,rs_imm           14: arith4  rd,t6,rs_imm            (28 bits)  0 hits
0x20000000  +0x800000: 14: arith5i rsd,rsd,imm5             9: arith5i rsd,rsd,{imm}           (23 bits)  78 hits
0x20800000  +0x800000: 14: arith5r rsd,rsd,rs2              9: arith5r rsd,rsd,{rs2}           (23 bits)  1 hits
0x21000000  +0x800000: 14: arith5i rsd,rsd,imm5             9: arith5r rsd,rsd,{rd}            (23 bits)  27 hits
0x21800000  +0x800000: 14: arith5r rsd,rsd,rs2              9: arith5r rsd,rsd,{rd}            (23 bits)  8 hits
0x22000000 +0x2000000: 14: arith4  rsd,rsd,rs_imm          11: beqz    {rd},imm11              (25 bits)  23 hits
0x24000000 +0x2000000: 14: arith4  rsd,rsd,rs_imm          11: bnez    {rd},imm11              (25 bits)  32 hits
0x26000000 +0x1000000: 13: cmpi    t6,rs1,imm5             11: beqz    t6,imm11                (24 bits)  0 hits
0x27000000 +0x1000000: 13: cmpi    t6,rs1,imm5             11: bnez    t6,imm11                (24 bits)  0 hits
0x28000000 +0x2000000: 14: arith4  rsd,rsd,rs_imm          11: j       imm11                   (25 bits)  79 hits
0x2a000000 +0x2000000: 14: arith4  rsd,rsd,rs_imm          11: jal     ra,imm11                (25 bits)  92 hits
0x2c000000  +0x100000: 15: arith5  rsd,rsd,rs_imm           5: jr      rs2                     (20 bits)  18 hits
0x2c100000  +0x100000: 15: arith5  rsd,rsd,rs_imm           5: jalr    ra,rs2                  (20 bits)  7 hits
0x2c200000  +0x800000: 15: arith5  rsd,rsd,rs_imm           8: sw      {rd},imm8(sp)           (23 bits)  1 hits
0x2ca00000  +0x800000: 15: arith5  rsd,rsd,rs_imm           8: sd      {rd},imm8(sp)           (23 bits)  0 hits
0x2d200000  +0x800000: 13: lw      rd,imm8(sp)             10: arith5  {rd},{rd},rs_imm        (23 bits)  1 hits
0x2da00000  +0x800000: 13: ld      rd,imm8(sp)             10: arith5  {rd},{rd},rs_imm        (23 bits)  1 hits
0x2e200000  +0x200000: 21: --reserved--                    (21 bits)  0 hits
0x2e400000  +0xc00000: 19: pair.a  rd,rs1,rs2               5: {opcode:pair} rd,{rs1},{rs2}    (24 bits)  0 hits
0x2f000000 +0x1000000: 19: ldst    rd,imm5(rs1)             5: {opcode} rd,{imm:next}({rs1})   (24 bits)  402 hits
0x30000000 +0x8000000: 13: arith3  rsd,rsd,rs_imm          14: ldst    rd,0(rs1)               (27 bits)  372 hits
0x38000000 +0x8000000: 14: ldst    rd,0(rs1)               13: arith3  rsd,rsd,rs_imm          (27 bits)  620 hits
total size: 0x40000000,  bits: 30
saved=2420, total=10258
```

Other opcodes like breakpoint can be overloaded in the rd=0 space.  Or fall
back to 32-bit encoding.

The `mem,mem` operations essentially mimic the load/store pair
instructions proposed by Qualcomm, but lacking pre/post-increment
because that would break the 2-in-1-out contract in a two-round
implementation.  These share the base register and immediate offset
arguments, and the destination register is a consecutive pair.

The `arithmetic,mem` and `mem,arithmetic` pairs provide the
pre/post-increment operations proposed by Qualcomm, but are then
generalised to offer other arithmetic operations as well.  There are
details to work out, here, regarding how the implicit shift produced by
a load operation should interact with various types of arithmetic.

The `mem,arithmetic` pairs should probably be defined to prohibit use of
the load result in the second operation, even though this is probably a
very reasonable thing to expect to do in general.

And the `cmp,b` pairs produce the `beqi` and `bnqi` Qualcomm proposal.

The notes about `hits` and `saved` (you need to scroll right) are how
many times that pair was used by a simplistic regex (currently only
considering adjacent pairs) on a trivial benchmark which I ran through
qemu.  In the case of duplication the first viable row takes the credit.

About 2400 intructions out of 10000 instructions were squeezed into the
preceeding instruction.  The original RVC compression used about 5500
16-bit opcodes, so to compare like-for-like that means I used 4800
"16-bit opcodes".

I don't think that's too bad considering that no tuning has been done
either in my opcode selection or in the compiler to put things in a
viable order.  And I've put a lot of space into things the compiler
_obviously_ wouldn't generate without modification.

Big caveat regarding the quality of my regular expressions, though.

#### load/store ops
```
| RV32  | RV64  | RV128 |
|-------|-------|-------|
| `lb`  | `lb`  | `lb`  |
| `lh`  | `lh`  | `lh`  |
| `lw`  | `lw`  | `lw`  |
|  --   | `ld`  | `ld`  |
|  --   |  --   | `lq`  |
| `sb`  | `sb`  | `sb`  |
| `sh`  | `sh`  | `sh`  |
| `sw`  | `sw`  | `sw`  |
|  --   | `sd`  | `sd`  |
|  --   |  --   | `sq`  |
| `lbu` | `lbu` | `lbu` |
| `lhu` | `lhu` | `lhu` |
| `flw` | `lwu` | `lwu` |
|  --   | `fld` | `fld` |
| `fsw` |  --   |  --   |
|  --   | `fsd` | `fsd` |
```

The x/y options differ between RV32, RV64, and RV128; if the unsigned
version would be identical to the signed version because that is the
native word size, then this instruction is repurposed as a native-sized
floating-point load or store instead (resulting in RV128 having no
floating-point load or store -- oh well).

#### arithmetic ops
```
| 3 bits, 50% immediates|
|-----------------------|
| `addi`     # imm+0    |
| `addi`     # imm+32   |
| `addi`     # imm-64   |
| `addi`     # imm-32   |
| `add`                 |
| `sub`                 |
| `and`                 |
| `or`                  |
```

```
|4 bits, 50% immediates |
|-----------------------|
| `addi`     # imm+0    |
| `addi`     # imm-32   |
| `addiw`    # imm+0    |
| `addiw`    # imm-32   |
| `addi4spn` # imm+0    |
| `addi4spn` # imm+32   |
| `andi`     # imm+0    |
| `andi`     # imm-32   |
| `add`                 |
| `addw`                |
| `sub`                 |
| `subw`                |
| `and`                 |
| `bic`                 |
| `or`                  |
| `xor`                 |
```

```
|5 bits, 50% immediates |
|-----------------------|
| `addi`     # imm+0    |
| `addi`     # imm-32   |
| `addiw`    # imm+0    |
| `addiw`    # imm-32   |
| `andi`     # imm+0    |
| `andi`     # imm-32   |
| `addi4spn` # imm+0    |
| `addi4spn` # imm+32   |
| `slli`     # imm+0    |
| `slli`     # imm+32   |
| `srli`     # imm+0    |
| `srli`     # imm+32   |
| `srai`     # imm+0    |
| `srai`     # imm+32   |
| `rsbi`     # imm+0    |
| `rsbi`     # imm+32   |
| `add`                 |
| `addw`                |
| `sub`                 |
| `subw`                |
| `and`                 |
| `bic`                 |
| `or`                  |
| `xor`                 |
| `mul`                 |
| `mulh`                |
| `div`                 |
| `rem`                 |
| `sll`                 |
| `srl`                 |
| `sra`                 |
```

For the `addi*4spn` instruction, the `rsd` field is used simply as `rd`
and `sp` is used as the new `rs1`.  Also the immediate is multiplied by
four.  I suppose this should be an _unsigned_ immediate because that's
where all the useful data is.  A couple of other operations need
unsigned immediates, too.

Where the second operation borrows its `rs2_imm` argument from the first
operation it doesn't have free choice between a register or immediate
value.  Consequently one bit of the encoding is redundant.  I'll fix
that later.  In fact, while sharing the immediate between two
insturctions makes sense (eg., `shl`/`shr` patterns), it's less clear
that the extra bit of free choice for immediate serves any purpose.  But
it's harder to recycle that bit.

```
|cmp (3 bits, all immediates)|
|----------------------------|
| `slti`     # imm+0         |
| `slti`     # imm-32        |
| `sltiu`    # imm+0         |
| `sltiu`    # imm+32        |
| `seqi`     # imm+0         |
| `seqi`     # imm-32        |
| `bittesti` # imm+0         |
| `bittesti` # imm+32        |
```

I don't think `bittest` is a thing in any RISCV extension?  But I'm
throwing it in here because it fills a niche.  The immediate operand is
the bit index to test and to branch on.

Some instructions I jsut made up to fill in gaps while I didn't want to
think about it.

```
| pairs (4 bits, no immediates) |
| `add`     | `sltu`    |
| `sub`     | `add`     |
| `min`     | `max`     |
| `minu`    | `maxu`    |
| `and`     | `bic`     |
| `mulhsu`  | `mul`     |
| `mulh`    | `mul`     |
| `mulhu`   | `mul`     |
| `div`     | `rem`     |
| `divu`    | `remu`    |
| `???`     | `???`     |
| `???`     | `???`     |
```

The use of an `add,sltu` pair forms and add-with-carry, but is
problematic in its definition.  It breaks the pattern of sharing both
source registers, needing the result of the previous add instead,
_unless_ the `sltu` part is instead redefined to be a different
operation which simply computes the carry from the inputs.

### Caveats
* Arithmetic paired with ldst are affected by the ld/st width (yikes?),
  which means that if you overwrite the load with a breakpoint you still 
  need to be able to encode the effect on the adjacent op.
* Also, I didn't think too hard about statistical merits of any of these
  choices.  I took some guidance from the existing compressed
  instruction extension to keep it in roughly the right place, but my
  changes may add their own implications.
* There might be much to much overlap between the different register
  sharing modes for arithmeric.  This needs to be looked at still.

### Variations
* For `mem,mem` the immediate could be smaller and the pair of
  destination registers could be arbitrary, consistent with the
  arithmetic instructions which share both source registers.
* `op.full rd,rs,rs ; =~op.full =rd,=rd,rs` is also 25 bits and could
  probably be more use in that it doesn't corrupt the original sources.
  just have to pick a sensible `~op.full`.
* As well as the usual overloading of `Rd=x0`, it might make sense, for
  example, if `Rsd=t6` then to read that as `sp` and write `t6` in the
  first opcode, and then read `Rsd` in the second operation as `t6` and
  write `Rsd` as the register actually specified.  Or something like
  that.
* I notice there's this `RV32E` profile, which discards the top 16
  registers from the register file.  This might be a reasonable
  compromise to repurpose a couple of bits, and presumably it's easier
  to get the compiler to generate test code for it.

### Questions
* I didn't do anything about an optimisation using the same rd for both
  instructions (implicit discard of the first result after it's used by
  the second).  Why is that?
* When an arithmetic instruction has an implicit shift provided by being
  paired with a load or store (which has a data size), when should it
  apply?  Should it affect only immediates?  (I say no!)  Should it
  affect only add and sub operations?  Should it affect only operations
  whose destination register is the same as the base register in the
  memory operation?
* What are the alignment constraints of these `mem,mem` ops?  I don't
  know!
* Did I choose the right basic arithmetic instructions?

### Observations

Reserving a portion of the coding space for compressed instructions it's different from Thumb.  One doesn't have to squeeze everything in.
If something is difficult it can be ignored and left to the 32-bit encoding, leaving coding space to allow anything else to capture more cases.

On the other hand it's tempting to hang on to some of the CISC-like tuples on the basis that they are strong candidates for fusion, and sometimes that _is_ a squeeze.
It's bad form to pre-suppose the implementation in the ISA, but it's still tempting to make such an optimisation available.

## Next steps
I really need more data about why each instruction fails to fall into a pair.  Is it because I chose the wrong shortlist of opcodes, or because the operand constraints don't fit, or because the immediate is too big?  A lot of this hangs on choices the compiler made, which in turn reflect the instruction set it was aiming for, but I don't think I'm capable of iterating over the compiler's notion of available instructions, so I'll just use proxy configurations instead.

As a general guide I plan to use:
```
qemu-riscv64-static -d nochain,in_asm,execxx ./benchmark
```
(or something like that) to collect translation blocks of instructions
and count the number of times each block is executed.  These blocks,
compiled in different ways, can be used for a casual measure of the
compression ratio, but it would rely on some re-ordering of instructions
and a contract in the compiler to not use the `t6` register because I
borrowed it for some operation pairs with throwaway results.

What would be better is to see how different arrangements fare in an
actual compiler trying to optimise for them, but I don't know if that's
a realistic thing to experiment with.

[natural alignment]: </naturally-aligned-instruction-set/>
