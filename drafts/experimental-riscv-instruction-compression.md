---
layout: post
title: An experimental RISCV instruction compression
---

I wanted to experiment with a means of reducing compiled RISCV code size
in a way that did _not_ allow for the creation of un-aligned 32-bit
opcodes, so I had a bit of a tinker with 32-bit packets containing
instruction pairs.

## Rationale

RISCV sees implementations ranging from lightweight scalar to wide
OOE superscalar, needing to take very different approaches to how the
instruction stream is ingested.

Things like the large number of instruction entrypoints and unaligned
32-bit opcodes are problematic for out-of-order machines, while the
low-end processors need to minimise code size and icache burden.

This scheme aims for a compromise, with less conventional parsing of
a compressed instruction stream, while also enabling an alternate
interpretation of purely 32-bit opcodes which can be split into
micro-ops later in the pipeline (a process that already exists by
necessity).

## Design objectives

* Support only 32-bit opcode packets, but squeezing pairs of
  instructions into those packets for compression.
* Ensure that every such packet can be interpreted in two passes as two
  independent instructions, each conforming to the standard RISCV ISA
  model.
* Restrict branching to only the final operation of a packet.
* Exploit the frequent sharing of common registers in adjacent
  instructions to aid compression.
* Capture some proposed instruction extensions which could be
  implemented as macro-op fusion instructions and formalise them as
  pairs within one 32-bit packet.
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
       0x0: ari,ari           28 bits, 0x10000000 values    ; arith_4    rsd rs_imm   ; arith_4    rsd rs_imm
0x10000000: ari,ari,(rs)      25 bits,  0x2000000 values    ; arith_5    rsd rs_imm   ; arith_5    rsd =Rs
0x12000000: ari,ari,(rd)      25 bits,  0x2000000 values    ; arith_5    rsd rs_imm   ; arith_5    rsd =Rd
0x14000000: ari,beqz,(rd)     25 bits,  0x2000000 values    ; arith_4    rsd rs_imm   ; beqz =Rd imm11
0x16000000: ari,bnez,(rd)     25 bits,  0x2000000 values    ; arith_4    rsd rs_imm   ; bnez =Rd imm11
0x18000000: cmpi,beqz,(rt)    24 bits,  0x1000000 values    ; cmpi.cmp   T6 rs rs_imm   ; beqz T6 imm11
0x19000000: cmpi,bnez,(rt)    24 bits,  0x1000000 values    ; cmpi.cmp   T6 rs rs_imm   ; bnez T6 imm11
0x1a000000: ari,j             25 bits,  0x2000000 values    ; arith_4    rsd rs_imm   ; j imm11
0x1c000000: ari,jal           25 bits,  0x2000000 values    ; arith_4    rsd rs_imm   ; jal RA imm11
0x1e000000: ari,jr            20 bits,   0x100000 values    ; arith_5    rsd rs_imm   ; jr rs
0x1e100000: ari,jalr          20 bits,   0x100000 values    ; arith_5    rsd rs_imm   ; jalr RA rs
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
0x20000000: ari,mem           28 bits, 0x10000000 values    ; arith_4    rsd rs_imm<<k   ; mem.ldst   rd rs
0x30000000: mem,ari           28 bits, 0x10000000 values    ; mem.ldst   rd rs   ; arith_4    rsd rs_imm<<k
total size: (0x40000000),  bits: 30
```

Or here's another verison:

```
       0x0: ari,ari           28 bits, 0x10000000 values    ; arith_4    rsd rs_imm   ; arith_4    rsd rs_imm
0x10000000: ari,ari,(t6t6)    28 bits, 0x10000000 values    ; arith_4    T6 rs rs_imm   ; arith_4    rd T6 rs_imm
0x20000000: ari,ari,(rs)      25 bits,  0x2000000 values    ; arith_5    rsd rs_imm   ; arith_5    rsd =Rs
0x22000000: ari,ari,(rd)      25 bits,  0x2000000 values    ; arith_5    rsd rs_imm   ; arith_5    rsd =Rd
0x24000000: ari,beqz,(rd)     25 bits,  0x2000000 values    ; arith_4    rsd rs_imm   ; beqz =Rd imm11
0x26000000: ari,bnez,(rd)     25 bits,  0x2000000 values    ; arith_4    rsd rs_imm   ; bnez =Rd imm11
0x28000000: cmpi,beqz,(rt)    24 bits,  0x1000000 values    ; cmpi.cmp   T6 rs rs_imm   ; beqz T6 imm11
0x29000000: cmpi,bnez,(rt)    24 bits,  0x1000000 values    ; cmpi.cmp   T6 rs rs_imm   ; bnez T6 imm11
0x2a000000: ari,j             25 bits,  0x2000000 values    ; arith_4    rsd rs_imm   ; j imm11
0x2c000000: ari,jal           25 bits,  0x2000000 values    ; arith_4    rsd rs_imm   ; jal RA imm11
0x2e000000: ari,jr            20 bits,   0x100000 values    ; arith_5    rsd rs_imm   ; jr rs
0x2e100000: ari,jalr          20 bits,   0x100000 values    ; arith_5    rsd rs_imm   ; jalr RA rs
0x2e200000: --resv22          22 bits,   0x400000 values    ; --resv22 imm11 imm11
0x2e600000: add,sltu*         20 bits,   0x100000 values    ; add rd rs rs   ; sltu* rd =Rd =Rs
0x2e700000: and,bic           20 bits,   0x100000 values    ; and rd rs rs   ; bic rd =Rs =Rs
0x2e800000: min,max           20 bits,   0x100000 values    ; min rd rs rs   ; max rd =Rs =Rs
0x2e900000: minu,maxu         20 bits,   0x100000 values    ; minu rd rs rs   ; maxu rd =Rs =Rs
0x2ea00000: add,sub           20 bits,   0x100000 values    ; add rd rs rs   ; sub rd =Rs =Rs
0x2eb00000: mul,mulhsu        20 bits,   0x100000 values    ; mul rd rs rs   ; mulhsu rd =Rs =Rs
0x2ec00000: mul,mulh          20 bits,   0x100000 values    ; mul rd rs rs   ; mulh rd =Rs =Rs
0x2ed00000: mul,mulhu         20 bits,   0x100000 values    ; mul rd rs rs   ; mulhu rd =Rs =Rs
0x2ee00000: div,rem           20 bits,   0x100000 values    ; div rd rs rs   ; rem rd =Rs =Rs
0x2ef00000: divu,remu         20 bits,   0x100000 values    ; divu rd rs rs   ; remu rd =Rs =Rs
0x2f000000: mem,mem,(rsimm)   24 bits,  0x1000000 values    ; mem.ldst   rd rs imm10<<k   ; mem =Rd+1 =Rs IMMp1<<k
0x30000000: ari,mem           27 bits,  0x8000000 values    ; arith_3    rsd rs_imm<<k   ; mem.ldst   rd rs
0x38000000: mem,ari           27 bits,  0x8000000 values    ; mem.ldst   rd rs   ; arith_3    rsd rs_imm<<k
total size: (0x40000000),  bits: 30
```

Other opcodes like breakpoint can be overloaded in the rd=0 space.  Or fall
back to 32-bit encoding.

The `add,sltu` pair forms and add-with carry, but is problematic in its
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

And the `cmp,b` pairs produce the `beqi` and `bnqi` Qualcomm proposal.

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
| `addi0`               |
| `addi1`               |
| `andi0`               |
| `andi1`               |
| `add`                 |
| `sub`                 |
| `and`                 |
| `or`                  |
```

```
|4 bits, 50% immediates |
|-----------------------|
| `addi0`               |
| `addi1`               |
| `addiw0`              |
| `addi1w`              |
| `addi04spn`           |
| `addi14spn`           |
| `andi0`               |
| `andi1`               |
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
| `addi0`               |
| `addi1`               |
| `addiw0`              |
| `addiw1`              |
| `add4i0spn`           |
| `add4i1spn`           |
| `andi0`               |
| `andi1`               |
| `slli0`               |
| `slli1`               |
| `srli0`               |
| `srli1`               |
| `srai0`               |
| `srai1`               |
| `rsbi0`               |
| `rsbi1`               |
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
| `??`                  |
```

The `i0` and `i1` variants provide the one extra bit of a six-bit
immediate and the rs2 field provides the other five bits.

Since there's no `subi`, I guess the immediate has to be sign extended
(this also allows and to act as bic).

For the `addi*4spn` instruction, the `rsd` field is used simply as `rd`
and `sp` is used as the new `rs1`.  Also the immediate is multiplied by
four.  I suppose this should be an _unsigned_ immediate because that's
where all the useful data is.

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
| `slti0`                    |
| `slti1`                    |
| `slti0u`                   |
| `slti1u`                   |
| `seqi0`                    |
| `seqi1`                    |
| `bittesti0`  (`andi`, except the immediate is a bit index) |
| `bittesti1`                |
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
As a general guide I plan to use
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
