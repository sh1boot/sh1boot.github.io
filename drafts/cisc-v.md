---
layout: post
title: "CISC-V: code compression in the style of a CISC architecture"
tags: vibe-coding, computer-architecture
---

Given a mixed-length instruction stream like Thumb or RVC you encounter
a few different headaches.  The most notorious is the complexity
introduced by needing to handle 32-bit instructions which are no longer
aligned, and risk straddling memory pages or even cache lines where only
half of the instruction turns out to be available.

You also see the possibility of jumping into the middle of an
instruction to execute an opcode which was not emitted by the toolchain
itself, making some security constraints much harder to enforce.

And for wide multi-issue you have twice as many instruction starts to
issue, up to half of which will eventually turn out to be no-ops (and,
again, unintended instructions) which need to be culled ASAP.

But by blithely throwing in CISC instructions to get code size down you
give up the simplicity of implementation for compact designs.

So my goal is to find an instruction encoding that avoids all of these
conflicts.

# Instruction-packet-based compression

While strict alignment could be imposed on an existing 16-bit
instruction compression scheme, that gives up coding space to express
things which are no longer legal.  It makes more sense to use 32-bit
packets (or, conceivably, 64-bit packets) which can, in turn, exploit
the intrinsic pairing of two opcodes within a packet for other gains.

That's the plan, here.  One 32-bit opcode may occupy a whole packet, or
two compact instructions instead.

Then we can re-balance the constraints against redundant information in
these pairs.  Some of these can be framed as explicit coding of CISC
features as a 32-bit opcode.

## Three approaches

### Decode 32 bits twice
Rather than decoding four bytes starting at the 16-bit address and
advancing either two or four bytes accordingly, always examine an
aligned 32-bit but when the address is unaligned we pick different
(overlapping) fields from the 32-bit word.

This is the target of an as-if model for the other approaches.  Any
questions about what happens in ambiguous cases should be approached
either with a view to behaving as if this approach had been used, or the
peculiarity should be prohibited and/or marked as a reserved encoding.

The consequence may be additional hardware to implement this single-step
mode, or suitable traps to allow the kernel to simulate it in software
when a recoverable exception is raised by the first operation of a pair.

### Ingest 32 bits as two µ-ops

To alleviate the explosion of potential entrypoints which generic 16-bit
opcodes introduce for the front end of a high-throughput instruction
decoder, the compressed pairs might be fed through as a single opcode,
and then split into multiple opcodes in the µ-op splitting stage --
logic which, presumably, already exists but now has a bit more work to
do.

### Ingest 32 bits as one fused op
As above, but blindly implement the pair as a single µ-op.  This isn't
going to make sense in every case.

### Implications for chain rules

Another consequence is that the temporary value between first and second
instructions of a chained pair has to be manifest as an architectural
register.  Though there are many chains which could be implemented in an
uninterruptible way, and somethingsomethingsomething...

```
    foo rd0, ra0, rb0        foo x31, ra0, rb0
    bar rd1, rd0, rb1   ->   bar rd1, x31, rb1
    del rd0                  del x31
```
or
```
    foo rd0, ra0, rb0        foo rd1, ra0, rb0
    bar rd1, rd0, rb1   ->   bar rd1, rd1, rb1
```
but that version breaks here:
```
    foo rd0, ra0, rb0        foo rd1, ra0, rb0
    bar rd1, rd0, rd1   ->   bar rd1, rd1, rd1
```

## Exceptions



## Pairing rules

### dual-arithmetic
`op rsd, rs2_imm             | op rsd, rs2_imm`

### chained arithmetic
`op rchain, rs1, rs2_imm     | op rd, rchain, rs2_imm`

These overlap for this very common pattern:
```
op0 rsd, rsd, ra
op1 rsd, rsd, rb
```

## Other redundancies
When `rs2_imm` is `x0`, that overlaps with immediate 0, implying that
the immediate probably never needs an encoding for zero provided there's
a register version of the same argument.

When `rs2_imm` is `x0` many operations (`add`, `sub`, `mul*`, `or`,
`and`, `xor`, `sll`, `srl`, `sra`) function as `mv` or `li`, and we only
need one of these.  Similarly when `rs2_imm` is `rs1` (exceptions:
`mul`, `sll`, `srl`, `sra`).  Others could be overloaded for unary
operations like `neg` (meaningful in `rsd` mode).

`addi sp, sp, 16` can be optimised to accept only round offsets (so
larger offsets) but when it becomes a chain rule (not modifying sp) it
can't be _as_ round (or it won't be useful for base address calculation)
as when simply modifying sp with write-back.


## Experimentation

I've been doing some vibe coding.  Revisiting my [experimental RISC-V
compression][] but getting Claude to do some instruction reordering and
register renaming so that I get better, more representative capture of
the patterns.


[experimental RISC-V compression]: </experimental-riscv-instruction-compression>
