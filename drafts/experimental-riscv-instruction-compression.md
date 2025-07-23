---
layout: post
title: An experimental RISCV instruction compression
---

TODO:
* use `qemu-riscv64-static -d nochain,in_asm,execxx ./coremark` (or
  whatever) to collect translation blocks of instructions and count the
  number of times each block is executed.
* Look at the wikichips page on instruction fusion to see what idioms
  are most in need of fusion, and see if they can be coded as compressed
  pairs.
* Look at Qualcomm Zics proposal, encode as pairs.
* Try compiling code without compression.
* Try compiling code with/without compression but prohibiting use of the
  temporary registers to make them available for instruction fusion.
* Look for modes of possible fusion:
  * dest -> rs1 in same opcode overlap (obviously!)
  * dest -> src overlap
  * op2 overlap
  * discarded temporary (compress to one or zero bits, always temp reg)
  * reg/reg+1 pairs
  * lit/lit+k pairs
* consider:
  * Should pairwise ld/st be 128-bit aligned?


qualcomm:
* ld with pre-inc
    * add rs, rs, #k
    : ld rd, [rs]
    * add rs, rs, rs2
    : ld rd, [rs]

: source -> destination chain is very common
: add -> load seems fine
: load with no offset for extra savings?

* ldia with post-inc
    * ld rd, [rs]
    : add rs, rs, k
    * ld rd, [rs]
    : add rs, rs, rs2

: source -> destination sharing isn't an obvious pattern
: source -> source is better?
: load -> add isn't an obvious pair

* ld with reg-offset
    * add rd, rs, rs2
    : ld rd, [rd]

: dest -> source normal, with discard (deliberate re-use of rd)
: dest -> dest to ghost temporary also normal

* ldp with pre/post-inc
    * add rs, rs, #k
    : ld rd0, [rs]
    : ld rd1, [rs+8]
    * ld rd0, [rs]
    : ld rd1, [rs+8]
    : add rs, rs, #k

: shared rd -> rd/rd+1 when rd is not also a source reg (dest->source may preclude three-way share anyway)
: loads already have a dest op, so a third dest for write-back doesn't
  really fit
: genuinely three operations

* sd with pre-inc
    * add rs, rs, #k
    : sd rd, [rs]
    * add rs, rs, rs2, shl XX
    : sd rd, [rs]

: as above

* sd with post-inc
    * sd rd, [rs]
    : add rs, rs, k
    * sd rd, [rs]
    : add rs, rs, rs2, shl XX

: share source
: store/add pair isn't obvious

* sd with reg-offset
    * add rd, rs, rs2, shl XX
    : sd rd, [rd]

: source -> dest all good
: add -> store pair makes sense

* sdp with pre/post-inc
    * add rs, rs, #k
    : sd rd0, [rs]
    : sd rd1, [rs+8]
    * sd rd0, [rs]
    : sd rd1, [rs+8]
    : add rs, rs, #k

: Three-way op not illegal; store doesn't otherwise write a register
: still three operations!

: extrapolate to other sizes, and sign-extension policies

* li rt, #imm
: beq rs, rt, label
* li rt, #imm
: bne rs, rt, label

: straightforward destination -> source, with discard, this time no rd to hide behind
: seems straightforward, except for corruption of rt.

* mv x10, rs1
: mv x11, rs2
* mv x12, rs1
: mv x13, rs2

: simple sharing of rd/rd+1


wikichips:

* shared rs1+rs2:
    * mulh[[S]U] rdh, rs1, rs2
    : mul rdl, rs1, rs2 	Fused into a wide multiply

    * div[U] rdq, rs1, rs2
    : rem[U] rdr, rs1, rs2 	Fused into a wide divide

: obivously also:
    * add rds, rs1, rs2
    : sub rdd, rs1, rs2  sum/diff

    * min rdn, rs1, rs2
    : max rdx, rs1, rs2  min/max

    * slt rdc, rs1, rs2  addsetf, -- tbd, does this work?
    : add  rd, rs1, rs2

        * otherwise:
        * add rd, rs1, rs2
        : slt rdc, rd1 rs2

* addressed by qualcomm:
    > // ldpair rd1,rd2, [imm(rs1)]
    > ld rd1, imm(rs1)
    > ld rd2, imm+8(rs1) 	Fused into a load-pair

    > // ldia rd, imm(rs1)
    > ld rd, imm(rs1)
    > add rs1, rs1, 8 	Fused into a post-indexed load 

    > // rd = array[offset]
    > add rd, rs1, rs2
    > ld rd, 0(rd) 	Fused into an indexed load

    > // rd = array[offset]
    > slli rd, rs1, {1,2,3}  // fused in Zba extension
    > add rd, rd, rs2
    > ld rd, 0(rd) 	Three-instruction fused into a load effective address

* already addressed in Zba extension
    > // &(array[offset])
    > slli rd, rs1, {1,2,3}
    > add rd, rd, rs2 	Fused into a load effective address

    > // rd = rs1 & 0xffffffff
    > slli rd, rs1, 32
    > srli rd, rd, 32 	Clear upper word

* inherently not open to compression:
    > // rd = imm[31:0]
    > lui rd, imm[31:12]
    > addi rd, rd, imm[11:0] 	Load upper immediate

    > // rd = *(imm[31:0])
    > lui rd, imm[31:12]
    > ld rd, imm[11:0](rd) 	Load upper immediate

    > // l[dw] rd, symbol[31:0]
    > auipc rd, symbol[31:12]
    > l[dw] rd, symbol[11:0](rd) 	Load global immediate

    > // far jump (1 MB) (AUIPC+JALR)
    > auipc t, imm20
    > jalr ra, imm12(t) 	Fused far jump and link with calculated target address

* Huh?:  Sort of handled in Zba I think?
    > addiw rd, rs1, imm12
    > slli rd, rs1, 32
    > SRLI rd, rs1, 32 	Fused into a single 32-bit zero extending add operation



## First attempt:

```
       0x0: ari,ari           28 bits, 0x10000000 values    ; ari.set0   rsd rs_imm   ; ari.set0   rsd rs_imm
0x10000000: ari,ari,(rs)      25 bits,  0x2000000 values    ; ari.full   rsd rs_imm   ; ari.full   =Rs rs_imm
0x12000000: ari,ari,(rd)      25 bits,  0x2000000 values    ; ari.full   rsd rs_imm   ; ari.full   =Rd rs_imm
0x14000000: ari,beqz,(rd)     25 bits,  0x2000000 values    ; ari.set0   rsd rs_imm   ; beqz =Rd imm11
0x16000000: ari,bnez,(rd)     25 bits,  0x2000000 values    ; ari.set0   rsd rs_imm   ; bnez =Rd imm11
0x18000000: cmp,beqz,(rt)     24 bits,  0x1000000 values    ; cmp.cmp  RT rs rs_imm   ; beqz =Rd imm11
0x19000000: cmp,bnez,(rt)     24 bits,  0x1000000 values    ; cmp.cmp  RT rs rs_imm   ; bnez =Rd imm11
0x1a000000: ari,j             25 bits,  0x2000000 values    ; ari.full   rsd rs_imm   ; j imm10
0x1c000000: ari,jal           25 bits,  0x2000000 values    ; ari.full   rsd rs_imm   ; jal RA imm10
0x1e000000: ar2,jr            22 bits,   0x400000 values    ; ar2.more   rd rs imm5   ; jr rs
0x1e400000: ar2,jalr          22 bits,   0x400000 values    ; ar2.more   rd rs imm5   ; jalr RA rs
0x1e800000: ari,jr            20 bits,   0x100000 values    ; ari.full   rsd rs_imm   ; jr rs
0x1e900000: ari,jalr          20 bits,   0x100000 values    ; ari.full   rsd rs_imm   ; jalr RA rs
0x1ea00000: --resv21          21 bits,   0x200000 values    ; --resv21 imm10 imm11
0x1ec00000: mul,mulh          20 bits,   0x100000 values    ; mul rd rs rs   ; mulh rd =Rs =Rs
0x1ed00000: div,rem           20 bits,   0x100000 values    ; div rd rs rs   ; rem rd =Rs =Rs
0x1ee00000: add,sub           20 bits,   0x100000 values    ; add rd rs rs   ; sub rd =Rs =Rs
0x1ef00000: and,bic           20 bits,   0x100000 values    ; and rd rs rs   ; bic rd =Rs =Rs
0x1f000000: mem,mem,(rsimm)   24 bits,  0x1000000 values    ; mem.ldst   rd rs imm10<<k   ; mem =Rd+1 =Rs IMMp1<<k
0x20000000: ari,mem           28 bits, 0x10000000 values    ; ari.set0   rsd rs_imm<<k   ; mem.ldst   rd rs
0x30000000: mem,ari           28 bits, 0x10000000 values    ; mem.ldst   rd rs   ; ari.set0   rsd rs_imm<<k
total size: (0x40000000),  bits: 30
```

ldst (4 bits):
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

set0 (4 bits, 50% immediates):
```
        "addi0",
        "addi1",
        "subi0",
        "subi1",
        "andi0",
        "andi1",
        "bici0",
        "bici1",
        "add",
        "addw",
        "sub",
        "subw",
        "and",
        "bic",
        "or",
        "xor",
```

full (5 bits, 50% immediates):
```
        "addi0",
        "addi1",
        "subi0",
        "subi1",
        "andi0",
        "andi1",
        "bici0",
        "bici1",
        "slli0",
        "slli1",
        "srli0",
        "srli1",
        "srai0",
        "srai1",
        "rsbi0",
        "rsbi1",
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
        "??",  # where are slt, sltu, seq, etc.?
        "??",
        "??",
        "??",
```

more (2 bits, all immediates):
```
        "addiw",
        "subiw",
        "addi4spn",
        "subi4spn",
```

cmp (3 bits, all immediates):
```
        "slti0",
        "slti1",
        "slti0u",
        "slti1u",
        "seqi0",
        "seqi1",
        "???i",  # how about bit test?
        "???I",
```


should probably formalise mul/mulh/etc to:
```
mul,mulhu
div,rem
add,sub
add,sltu # carry flag out (addc)
min,max
minu/maxu
mul,mulh
mul,mulhsu
and/bic

```
Other opcodes like break can be overloaded in the rd=0 space.  Or fall
back to 32-bit encoding.

should probably prohibit mem->arith dependency in one instruction?

### caveats
* Arithmetic paired with ldst are affected by the ld/st width (yikes?),
  which means that if you overwrite the load with a breakpoint you still 
  need to be able to encode the effect on the adjacent op.
