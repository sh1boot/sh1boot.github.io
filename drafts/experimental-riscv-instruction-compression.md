---
layout: post
title: An experimental RISCV instruction compression
---

I wanted to experiment with a means of reducing compiled RISCV code size
in a way that did _not_ allow for the creation of un-aligned 32-bit
opcodes (and would not set a precedent for unaligned 64-bit opcodes in
the future).

## Rationale

RISCV is implemented both in lightweight scalar implementations, and in
wide out-of-order implementations, each of which need to take very
different perspectives on how to ingest the instruction stream.

The large number of instruction entrypoints is problematic for
out-of-order machines, while the low-end processors want to minimise
code size and icache load.

This model aims at a compromise, with slightly less conventional parsing
of compressed instructions, while also allowing a compressed instruction
pair be ingested as a 32-bit opcode but subject to uop fission later in
the pipeline (a process that already exists by necessity).

## Design objectives

* Continue to support 32-bit opcode packets, but squeezing pairs of
  instructions into those packets.
* Ensure that every such packet can be interpreted in two passes as two
  independent instructions, each conforming to the standard RISCV ISA
  model.
* Capture some proposed instruction extensions which could be
  implemented as macro-op fusion instructions and formalise them as
  pairs within a 32-bit packet.
* Make code smaller.

### Sources

Qualcomm Znew/Zics:
* <https://lists.riscv.org/g/tech-profiles/attachment/332/0/code_size_extension_rvi_20231006.pdf>

Macro-op fusion stuff:
* <https://arxiv.org/pdf/1607.02318>
* <https://en.wikichip.org/wiki/macro-operation_fusion#Proposed_fusion_operations>

## A childish attempt
With no statistical model of instruction-pair frequency, I just guessed
at what might work and came up with the following.

For expediency I've only counted the number of instructions in each
class and laid them out sequentially.  It would be folly to try to
arrange the specific bit patterns for efficient decoding before the
supported instruction set is decided.

```
       0x0: ari,ari           28 bits, 0x10000000 values    ; ari.set0   rsd rs_imm   ; ari.set0   rsd rs_imm
0x10000000: ari,ari,(rs)      25 bits,  0x2000000 values    ; ari.full   rsd rs_imm   ; ari.full   =Rs rs_imm
0x12000000: ari,ari,(rd)      25 bits,  0x2000000 values    ; ari.full   rsd rs_imm   ; ari.full   =Rd rs_imm
0x14000000: ari,beqz,(rd)     25 bits,  0x2000000 values    ; ari.set0   rsd rs_imm   ; beqz =Rd imm11
0x16000000: ari,bnez,(rd)     25 bits,  0x2000000 values    ; ari.set0   rsd rs_imm   ; bnez =Rd imm11
0x18000000: cmp,beqz,(rt)     24 bits,  0x1000000 values    ; cmp.cmp  T6 rs rs_imm   ; beqz T6 imm11
0x19000000: cmp,bnez,(rt)     24 bits,  0x1000000 values    ; cmp.cmp  T6 rs rs_imm   ; bnez T6 imm11
0x1a000000: ari,j             25 bits,  0x2000000 values    ; ari.full   rsd rs_imm   ; j imm10
0x1c000000: ari,jal           25 bits,  0x2000000 values    ; ari.full   rsd rs_imm   ; jal RA imm10
0x1e000000: ari,jr            20 bits,   0x100000 values    ; ari.full   rsd rs_imm   ; jr rs
0x1e100000: ari,jalr          20 bits,   0x100000 values    ; ari.full   rsd rs_imm   ; jalr RA rs
0x1e200000: --resv22          22 bits,   0x400000 values    ; --resv22 imm11 imm11
0x1e600000: add,sltu*         20 bits,   0x100000 values    ; add rd rs rs   ; sltu* rd =Rd =Rs
0x1e700000: and,bic           20 bits,   0x100000 values    ; and rd rs rs   ; bic rd =Rs =Rs
0x1e800000: min,max           20 bits,   0x100000 values    ; min rd rs rs   ; max rd =Rs =Rs
0x1e900000: minu,maxu         20 bits,   0x100000 values    ; minu rd rs rs   ; maxu rd =Rs =Rs
0x1ea00000: add,sub           20 bits,   0x100000 values    ; add rd rs rs   ; sub rd =Rs =Rs
0x1eb00000: mul,mulhsu        20 bits,   0x100000 values    ; mul rd rs rs   ; mulhsu rd =Rs =Rs
0x1ec00000: mul,mulh          20 bits,   0x100000 values    ; mul rd rs rs   ; mulh rd =Rs =Rs
0x1ed00000: mul,mulhu         20 bits,   0x100000 values    ; mul rd rs rs   ; mulhu rd =Rs =Rs
0x1ee00000: div,rem           20 bits,   0x100000 values    ; div rd rs rs   ; rem rd =Rs =Rs
0x1ef00000: divu,remu         20 bits,   0x100000 values    ; divu rd rs rs   ; remu rd =Rs =Rs
0x1f000000: mem,mem,(rsimm)   24 bits,  0x1000000 values    ; mem.ldst   rd rs imm10<<k   ; mem =Rd+1 =Rs IMMp1<<k
0x20000000: ari,mem           28 bits, 0x10000000 values    ; ari.set0   rsd rs_imm<<k   ; mem.ldst   rd rs
0x30000000: mem,ari           28 bits, 0x10000000 values    ; mem.ldst   rd rs   ; ari.set0   rsd rs_imm<<k
total size: (0x40000000),  bits: 30
```

Other opcodes like break can be overloaded in the rd=0 space.  Or fall
back to 32-bit encoding.

THe `add,sltu` pair forms and add-with carry, but is problematic in its
definition.  It breaks the pattern of sharing both source registers,
using the result of the previous add instead, _unless_ the `sltu` part
is instead redefined to be a different operation which simply computes
the carry from the inputs.

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


#### ldst (4 bits):
```
        "lb",
        "lh",
        "lw",
        "ld",
        "lq",
        "sb",
        "sh",
        "sw",
        "sd",
        "sq",
        "lbu",
        "lhu",
        "lwu/flw",
        "ldu/fld",
        "fsw",
        "fsd",
```
The x/y options differ between RV32, RV64, and RV128; if the unsigned
version would be identical to the signed version because that is the
native word size, then this instruction is repurposed as a native-sized
floating-point load or store instead (resulting in RV128 having no
floating-point load or store -- oh well).

#### set0 (4 bits, 50% immediates):
```
        "addi0",
        "addi1",
        "addiw0",
        "addi1w",
        "addi04spn",
        "addi14spn",
        "andi0",
        "andi1",
        "add",
        "addw",
        "sub",
        "subw",
        "and",
        "bic",
        "or",
        "xor",
```
The `i0` and `i1` variants provide the one extra bit of a six-bit
immediate and the rs2 field provides the other five bits.

Since there's no `subi`, I guess the immediate has to be sign extended
(this also allows and to act as bic).

For the `addi*4spn` instruction, the `rsd` field is used simply as `rd`
and `sp` is used as the new `rs1`.  Also the immediate is multiplied by
four.  I suppose this should be an _unsigned_ immediate because that's
where all the useful data is.

#### full (5 bits, 50% immediates):
```
        "addi0",
        "addi1",
        "addiw0",
        "addiw1",
        "add4i0spn",
        "add4i1spn",
        "andi0",
        "andi1",
        "slli0",
        "slli1",
        "srli0",
        "srli1",
        "srai0",
        "srai1",
        "???i0",
        "???i1",
        "add",
        "addw",
        "sub",
        "subw",
        "and",
        "bic",
        "or",
        "xor",
        "mul",
        "mulh",
        "div",
        "rem",
        "sll",
        "srl",
        "sra",
        "??",
```
Is this the right set?  Who knows?

#### cmp (3 bits, all immediates):
```
        "slti0",
        "slti1",
        "slti0u",
        "slti1u",
        "seqi0",
        "seqi1",
        "bittesti0",  # andi, except the immediate is a bit index
        "bittesti1",
```
I don't think `bittest` is a thing in any RISCV extension?  But I'm
throwing it in here because it fills a niche.  The immediate operand is
the bit index to test and to branch on.

### Caveats
* Arithmetic paired with ldst are affected by the ld/st width (yikes?),
  which means that if you overwrite the load with a breakpoint you still 
  need to be able to encode the effect on the adjacent op.
* Also, I didn't think too hard about statistical merits of any of these
  choices.  I took some guidance from the existing compressed
  instruction extension to keep it in roughly the right place, but my
  changes may add their own implications.

### Variations
* For `mem,mem` the immediate could be smaller and the pair of
destination registers could be arbitrary, consistent with the 
arithmetic instructions which share both source registers.
* `op.full rd,rs,rs ; =~op.full =rd,=rd,rs` is also 25 bits and could probably be more use in that it doesn't corrupt the original sources.  just have to pick a sensible `~op.full`.

### Questions
* I didn't do anything about an optimisation using the same rd for both
  instructions (implicit discard of the first result after it's used by
  the second).  Why is that?`
* When an arithmetic instruction has an implicit shift provided by being
  paired with a load or store (which has a data size), when should it
  apply?  Should it affect only immediates?  (I say no!)  Should it
  affect only add and sub operations?  Should it affect only operations
  whose destination register is the same as the base register in the
  memory operation?
* What are the alignment constraints of these `mem,mem` ops?  I don't
  know!
* Did I choose the right basic arithmetic instructions?

## Next steps
As a general guide, I plan to use
```
qemu-riscv64-static -d nochain,in_asm,execxx ./coremark
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
