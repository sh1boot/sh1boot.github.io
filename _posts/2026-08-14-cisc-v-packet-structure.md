---
layout: post
title: "CISC-V: an exploratory code compression for RISC-V"
tags: computer-architecture riscv compression vibe-coding
svg: true
redirect_from:
 - /drafts/ciscv/
---

After months of trying to get around to it, I finally have a straw-man
level system of [compressing RISC-V code](/cisc-v-begins/) by squashing
pairs of opcodes into a single 32-bit packet rather than squashing
individual opcodes into 16-bit packets in order to address issues with
unaligned 32-bit instruction words.

The intent is to make a minimal implementation possible which can decode
the first slot easily while simultaneously reformatting the packet to
expose the B slot for interpretation by the same decoder on the next
step.  But also to make compressed code more digestible for wide, multi-issue
implementations.

Not to imply that performance cores _want_ compressed code.  Merely that if they're stuck with it as a compatibility constraint then it shouldn't be so painful.

It's still not a fully defined thing.  Just a thought experiment gone a
little too far.

This takes 1/4 of the total instruction coding space, meaning it steals
1/3 of the space occupied by RVC.  It's assumed that the remaining 2/3
of RVC won't be used in conjunction with this as that would undermine
the objectives given below.


## Why?

To make compressed code less of an impediment to high-end cores,
while teasing a couple of side benefits.  In particular:

* To avoid the problems of unaligned 32-bit instructions
* To avoid the other problems with mixed-size instructions
* To exploit inter-opcode redundancies
* To use much less opcode space
* To dress up like a CISC architecture in order to gain its powers
* To maintain the conventional 2-source, 1-destination data flow model
  by executing 32-bit packets sequentially as two separate instructions
* To expose macro-op fusion opportunities within a 32-bit word when
  executing whole packets at once

Basically, I saw too many complaints about the various consequences of
16-bit aligned instructions mixed with 32-bit aligned instructions, and
so I started [thinking about it
myself](/naturally-aligned-instruction-set/), and did [some very rough
hacking](/experimental-riscv-instruction-compression/) to see how I
might solve it, and now I'm at the stage which I present here, which I
hope is good enough to get the general idea across and demonstrate
that the compression can work under the given constraints.

If you're coming to this from the point of view of out-of-order wide multi-issue pipelines then I'm hoping you'll be able to just chuck whole 32-bit packets through the front end as single instructions and then do &micro;-op fission in the usual way.  Control flow only changes between whole packets.


## Status

This is just an exploration, not a formal RISC-V proposal.  All things
are subject to change and much needs to be solidified before it can be
implemented.

The results here are intended to establish the viability of the
compression and to give a view on mindset and intent which motivated
decisions, compromises, and blind hope.

Most of this document focuses on the cheap end, and how it might minimise the cost of implementation.  Performance cores just get the occasional hint here and there about shortcuts they might take to avoid pain.


## Packet structure

A packet comprises two instructions compressed into a 32-bit instruction
word.  There are four register fields (the three standard ones, plus one
more in part of `funct7`) which are shared between two regular RISC-V
instructions:

{% assign bw = 18 %}
<svg width="100%" height="52" viewbox="0 0 800 52">
<style>
.ins-box-selector,.ins-box-constant {
    --tinted-fill: oklab(from var(--tint-fill-base) l 0 0);
}
.ins-box-imm {
    --tint: 0;
}
.ins-box-rs {
    --tint: 1;
    stop-color: var(--tinted-fill);
}
.ins-box-rd {
    --tint: 2;
    stop-color: var(--tinted-fill);
}
.ins-box-rsd {
    --tint: 1;
    --tint-b: 2;
    fill: url("#RSDGradient");
}
.opcodes td,th {
  width: 4em;
}
</style>
<defs>
<LinearGradient id="RSDGradient" x1="0" y1="0.2" x2="1" y2="0.8">
<stop class="ins-box-rs" offset="30%" />
<stop class="ins-box-rd" offset="70%" />
</LinearGradient>
<g id="header" style="font-weight:bold;">
<text x="2" y="13" style="text-anchor:start;">implicit</text>
<rect x="{{bw | times:  0 | plus: 82}}" y="1" width="{{bw | times: 7}}" height="24" class="ins-box-selector tintbox" />
<text x="{{bw | times: 3.5| plus: 82}}" y="13">funct7</text>
<rect x="{{bw | times:  7 | plus: 82}}" y="1" width="{{bw | times: 5}}" height="24" class="ins-box-rs tintbox" />
<text x="{{bw | times: 9.5| plus: 82}}" y="13">rs2</text>
<rect x="{{bw | times: 12 | plus: 82}}" y="1" width="{{bw | times: 5}}" height="24" class="ins-box-rs tintbox" />
<text x="{{bw | times:14.5| plus: 82}}" y="13">rs1</text>
<rect x="{{bw | times: 17 | plus: 82}}" y="1" width="{{bw | times: 3}}" height="24" class="ins-box-selector tintbox" />
<text x="{{bw | times:18.5| plus: 82}}" y="13">funct3</text>
<rect x="{{bw | times: 20 | plus: 82}}" y="1" width="{{bw | times: 5}}" height="24" class="ins-box-rd tintbox" />
<text x="{{bw | times:22.5| plus: 82}}" y="13">rd</text>
<rect x="{{bw | times: 25 | plus: 82}}" y="1" width="{{bw | times: 7}}" height="24" class="ins-box-selector tintbox" />
<text x="{{bw | times:28.5| plus: 82}}" y="13">opcode</text>
</g>
</defs>
<use href="#header" />
<rect x="{{bw | times:  2 | plus: 82}}" y="30" width="{{bw | times: 5}}" height="20" class="ins-box-rsd tintbox" />
<text x="{{bw | times: 4.5| plus: 82}}" y="42">r_extra</text>
</svg>

The mapping of fields to different instruction operands is described by a
frame.  Different frames and different opcode pairs within each frame are
currently enumerated in the ten free bits in `opcode`, `funct3`, and two
bits of `funct7` (two bits of `opcode` are reserved to identify this
encoding scheme).  More on "enumeration" and its decoder implications
later.

No new instruction semantics are introduced; some optional instructions are
included.  A frame merely compressed two consecutive instructions into
one 32-bit packet.  The first instruction (generally) has its source
register fields aligned to the source register fields of 32-bit opcodes,
but the usual destination register field is (generally) the register
written by the second instruction.  Other fields are recycled and
repurposed according to the specific frame structure they follow.

For example, a frame may designate a source register as also the
destination register to save encoding space, or elide the destination
register slot the first instruction and a source register slot of the
second instruction and hard-code them as a temporary register.

Immediates are 5-bit by default, aliasing with a register index.  When
this is insufficient the frame may repurpose another register field to
make a ten-bit immediate.  When ten bits is too many (e.g., the index for
bit shifts on a 64-bit platform) the immediate-consuming instruction is
duplicated in the list of opcodes the frame supports, and the choice
between the two (or four, or eight) copies of the same instruction
serves as an extra bit (or two or three).

For chain rules, temporary storage is used and not encoded in the
packet at all.  It's left to the implementation to decide what kind of
path this data takes, with the caveat that it must be exposed
architecturally for exceptions.  The possibility is held open for
the decoder to hard-code the temporary register as `x31` or `x7` if this
does not impede optimisation (see [Exceptions and
interrupts](#exceptions-and-interrupts)).

Frame structures are signalled by the opcode field.  Each frame has a
number of opcode pair configurations it supports, and these are
enumerated and rounded up to a power of two.

Instruction pairs only allow control flow changes in the second slot.
Branch targets are always 32-bit aligned.

A frame might pose a question like "how do we implement load with base
address write-back?" and then encapsulate the two instructions which
implement that (`load` and `addi`) by re-using operands from the first
instruction in the second (`rbase` -> `rdest`, `rbase` -> `rs1`,
`offset` -> `immediate`), and then unroll that across all the
opcodes (`lb`, `lbu`, `lh`, etc..) it needs to complete the set.

Typical savings come from sharing `rd` and `rs1` (as `rsd`) encoding,
and from 'chain' rules where the first result is used only by the second
operation before being discarded, and so neither the destination
register nor its reference in the next op need to be encoded explicitly.
Implicit `sp` is used a lot as well, but that saving is usually spent on
a longer offset for large stack frames.

## Decoding and execution

In the simplest implementation an instruction
decoder would decode the first slot normally (with the caveat that the
destination register is not in the usual location), while also preparing
another conventional 32-bit instruction word to feed back to the same
instruction decoder for the next decode step.

Alternatively, an implementation might ingest the packet as a single
instruction and split it into &micro;-ops at a more convenient stage in
the pipeline.  A more aggressively optimised implementation could fuse
them into a single operation when practical.

Regardless of the implementation a valid packet has the architectural
effect of two ordinary RISC-V instructions executed sequentially, each
consuming its operands and producing its normal architectural
result in turn, with slot B observing the effects of slot A.  Some
combinations may have to be excluded from permitted encodings if they
have problematic implications in high-performance implementations.  The
intent is to capture such cases explicitly if they're common but not to
leave them as performance landmines if they're rare.

Similarly, some packets, like `rsd-alu-pair`, specify separate
destination registers for each slot, meaning they're able to encode
cases where the second slot must use the result of the first.  This
might offer code density gains but could raise pipeline headaches, so
encoding such dependencies should probably be prohibited.  If it remains
legal then it must still behave _as if_ sequential.

At present there's no optimisation for ease of decode, other than an
attempt to align the operand fields consistently.  The remaining ten
bits are a naive enumeration of all the allowed permutations, with
little organisation into bits.  That's to be addressed later, but ten
bits is at least better than 32.


## Exceptions and interrupts

If an exception occurs inside a packet then the architectural state
must be properly resolved such that execution can resume at the
appropriate slot _within_ a packet, as needed.  If the first slot did
not cause the exception then architectural state must be updated
accordingly, _as if_ the two slots execute sequentially.

Since a restart needs to distinguish which instruction caused the fault,
bit 1 of the PC can be used to signal slot B (dressing up as if we're
executing two 16-bit instructions).  This mechanism is only required for
restarts and doesn't have to have optimal performance.  Normal branch
and jump targets are always 32-bit aligned, and for all purposes outside of exception and interrupt handling PC can safely be assumed to be 32-bit aligned.

Interrupts are assumed to follow the same protocol as exceptions.  It is
hoped (TBD) that an implementation would be able to meet the
architectural model while deferring interrupts until completion of the
whole packet in order to avoid complexity.

The other obvious state needed for a restart is the temporary value used
in chain operations.

Logically one could hard-code this temporary during instruction decode
as `x31` (which doesn't exist on RV32-E, so maybe `x7` instead?) so
it's automatically saved; but some implementations may not appreciate
this constraint, and it would be preferable for such a named register
to not be guaranteed to retain a particular value after chain packets in
normal operation.  The intermediate value should only be considered
reliably written back when forced by an exception or interrupt.

Alternatively, just expose it in a CSR.  I'm not sure what's best for
the most economical implementations.

Another alternative for exceptions, if an implementation doesn't
want to deal with the complexity at all and has the necessary machinery,
could be to cancel the whole packet (reversing the effects of slot A
where necessary) and for the exception handler to simulate the pair of
instructions one at a time.


## Breakpoints

I assume these can be handled much the same way as exceptions, in the case of hardware breakpoints, or with a couple more rounds of rewriting in-place using standard 32-bit instructions.


## The encoding (provisional)

Here's what I came up with.  Opcodes are enumerated simply to
demonstrate that they can actually be encoded into 32 bits while the
frames continue to evolve.  The current assignment of the bit values is
not how it should be done, just something expedient.

Bits marked `p` below are the bits used to enumerate the opcode
combinations available in each frame.  The values for the integer
stored in the `p` bits are given in the tables following the frame
structure.  It's just a provisional assignment and hasn't been tuned for
a realistic decoder.

Where the enumeration jumps by more than one, and where instructions are
marked "&times;n", that's where bits of the opcode enumeration have been
taken to extend the immediate range.  The plan, here, is to align the
bits which choose between duplicate opcodes to always land in the same
positions in every frame, so that immediates decode consistently
(give or take masking to the proper length).


### frame layouts

{% for frame in site.data.ciscv-proto.frames %}
### {{ frame.name }}
{{ frame.does }}

{% comment %}
<pre>
{{ frame.layout }}
</pre>

- {{frame.fixed | inspect}}
{% endcomment %}
{% assign frame_count = frame.templates.size | plus: 0 %}
{% assign svg_height = frame_count | times: 50 | plus: 30 %}
<svg width="100%" height="{{svg_height}}" viewbox="0 0 800 {{svg_height}}">
{% for template in frame.templates %}
  <use href="#header" />
  {% assign vpos = forloop.index0 | times: 50 | plus: 42 %}
  {% assign vcentre = vpos | plus: 18 %}

  {% for field in frame.fixed %}
    {% assign topbit = field.range[0] | plus: 0 %}
    {% assign botbit = field.range[1] | plus: 0 %}
    {% assign bits = topbit | minus: botbit | plus: 1 %}
    {% assign hpos = topbit | times: -1 | plus: 31 | times: bw | plus: 82 %}
    {% assign width = bits | times: bw %}
    {% assign centre = width | divided_by: 2 | plus: hpos %}
    <rect class="ins-box-{{field.type}} tintbox" x="{{hpos}}" y="{{vpos}}" width="{{width}}" height="36" />
    <text x="{{centre}}" y="{{vcentre}}">{{field.value}}</text>
  {% endfor %}

  {% assign vpos = forloop.index0 | times: 50 | plus: 40 %}
  {% assign vcentre = vpos | plus: 10 %}
  {% for field in template.a.fields %}
    {% assign topbit = field.range[0] | plus: 0 %}
    {% assign botbit = field.range[1] | plus: 0 %}
    {% assign bits = field.bits | plus: 0 %}
    {% assign hpos = topbit | times: -1 | plus: 31 | times: bw | plus: 82 %}
    {% assign width = bits | times: bw %}
    {% assign centre = width | divided_by: 2 | plus: hpos %}
    <rect class="ins-box-{{field.type}} tintbox" x="{{hpos}}" y="{{vpos}}" width="{{width}}" height="20" />
    <text x="{{centre}}" y="{{vcentre}}">{{field.name}}</text>
  {% endfor %}
  {% if template.a.implicit %}
  {% assign hpos = 0 %}
  {% assign width = 40 %}
  {% for field in template.a.implicit %}
    {% assign centre = width | divided_by: 2 | plus: hpos %}
    <rect class="ins-box-{{field.type}} tintbox" x="{{hpos}}" y="{{vpos}}" width="{{width}}" height="20" />
    <text x="{{centre}}" y="{{vcentre}}">{{field.name}}</text>
    {% assign hpos = hpos | plus: width %}
  {% endfor %}
  {% endif %}
  <text x="662" y="{{vcentre}}" style="text-anchor:start;font-family=monospace;font-size:small;"> {{template.a.template}}</text>

  {% assign vpos = vpos | plus: 20 %}
  {% assign vcentre = vpos | plus: 10 %}
  {% for field in template.b.fields %}
    {% assign topbit = field.range[0] | plus: 0 %}
    {% assign botbit = field.range[1] | plus: 0 %}
    {% assign bits = field.bits | plus: 0 %}
    {% assign hpos = topbit | times: -1 | plus: 31 | times: bw | plus: 82 %}
    {% assign width = bits | times: bw %}
    {% assign centre = width | divided_by: 2 | plus: hpos %}
    <rect class="ins-box-{{field.type}} tintbox" x="{{hpos}}" y="{{vpos}}" width="{{width}}" height="20" />
    <text x="{{centre}}" y="{{vcentre}}">{{field.name}}</text>
    {% assign hpos = hpos | plus: width %}
  {% endfor %}
  {% if template.b.implicit %}
  {% assign hpos = 0 %}
  {% assign width = 40 %}
  {% for field in template.b.implicit %}
    {% assign centre = width | divided_by: 2 | plus: hpos %}
    <rect class="ins-box-{{field.type}} tintbox" x="{{hpos}}" y="{{vpos}}" width="{{width}}" height="20" />
    <text x="{{centre}}" y="{{vcentre}}">{{field.name}}</text>
    {% assign hpos = hpos | plus: width %}
  {% endfor %}
  {% endif %}
  <text x="662" y="{{vcentre}}" style="text-anchor:start;font-family=monospace;font-size:small;"> {{template.b.template}}</text>
{% endfor %}
</svg>

<div style="display:flex;flex-wrap:wrap;gap:1em;">
{% for opset in frame.opcodes %}
{% assign at = opset.at | plus: 0 %}
{% if opset.pairs %}
<table class="opcodes" style="width:auto;">
  <tr><th>slot A</th><th>slot B</th><th></th></tr>
  {% for pair in opset.pairs %}
  <tr>
  <td>{{pair.a.op}}</td><td>{{pair.b.op}}
      {%- if pair.n > 1 %}<span style="font-weight:normal;">&nbsp;&times;{{ pair.n }}</span>{% endif -%}
  </td><td>{{pair.at | plus: at}}</td>
  </tr>
  {% endfor %}
</table>
{% else %}
<table class="opcodes" style="width:auto;">
  {% assign width = 0 %}
  <tr style="font-size:small;text-align:center;"><th>slot B</th><th colspan="999">slot A</th></tr>
  <tr><th></th>
  {% for a in opset.a %}
    {% assign width = width | plus: a.n %}
    <th>{{a.op}}
        {%- if a.n > 1 %}<span style="font-weight:normal;">&nbsp;&times;{{ a.n }}</span>{% endif -%}
    </th>
  {% endfor %} </tr>
  {% for b in opset.b %}
  {% assign offset = b.at | times: width | plus: at %}
  <tr><th>{{b.op}}
          {%- if b.n > 1 %}<span style="font-weight:normal;">&nbsp;&times;{{ b.n }}</span>{% endif -%}
      </th>
  {% for a in opset.a %}
    <td>{{ offset }}</td>
    {% assign offset = offset | plus: a.n %}
  {% endfor %} </tr>
  {% endfor %}
</table>
{% endif %}
{% endfor %}
</div>

{%- endfor %}


## The results

Random test files, compiled with RVC and run through a scheduler to try
to pick out viable instruction pairs gives these results:

```
corpus          insns   pairs  packet%  realRVC%   vsRVC  to parity
testcase0       21875    4185    80.9%     81.6%   99.1%      -167
godot           90171   15823    82.5%     76.3%  108.1%     +5545
cpp-rv32       418345   92667    77.8%     71.0%  109.7%    +28786
cpp-rv64       409200   87664    78.6%     71.2%  110.4%    +30274
musl-rv32      118990   27712    76.7%     74.9%  102.4%     +2159
musl-rv64      102010   22208    78.2%     72.7%  107.6%     +5608
sqlite-rv32    192688   45512    76.4%     72.1%  105.9%     +8258
sqlite-rv64    189602   42689    77.5%     72.1%  107.5%    +10266
---------------------------------------------------------------------
RV32 aggregate 751898  170076    77.4%     72.2%  107.2%    +39036
RV64 aggregate 790983  168384    78.7%     72.2%  109.1%    +51693
COMBINED      1542881  338460    78.1%     72.2%  108.1%    +90729
```

This is suboptimal because it's not using a compiler which optimises for
the instruction set I've created.  It's also suboptimal because I'm
using code compiled for RVC, which has register pressure that does not
apply here, and so it uses more instructions than strictly necessary (at
least in Clang's case -- GCC finds excuses to use more
instructions regardless).  I have some other test cases but the
tabulation got mucky, so let's just run with the above for now.

## Development process

I vibe-coded an instruction scheduler which scans a corpus of assembly
and attempts to find and fuse pairable instructions according to rules
describing what a legitimate instruction pair would
look like; just to get a feel for what sorts of pairing rules I could
introduce.  It simply looks at register usage to determine when a result
is no longer needed, and which instructions can move past which other
instructions.

This seemed easier than writing my own compiler to optimise a made-up
instruction set which I hadn't designed yet, but it also has
limitations.  There's no expectation for it to yield runnable code;
merely to give a feel for how things would pack if the nits can be
worked out.

Then I randomly threw rules at it to see what would stick.

And I pivoted to laying out the bit patterns by hand in order to prove
that the budgets were being met.

Attempting to draw things around the standard RISC-V frames brought out
the four-register-field pattern shown above, while sweeping up the
remaining bits for an unregulated mix of frame selection and opcode
selection.

Then, I did a bad thing: I ran optimisers against an irresponsibly
small corpus to see what could be squeezed out.

Here's the tooling, such as it is: [CISC-V experiment][]
(content-warning: unchecked AI output)

It's no longer human-readable.  [Claude][] has taken things in its own
direction.
Much of what it does is flaky and unreliable, and most of the code is
only there as a toolkit for "what if?" queries posed to the AI.  I don't
really want to think about working with that code by hand.

But it's sufficient to get a gist of whether the ideas make sense and
how they map to real code.

### Pairing rule selection

I drew inspiration from classic CISC operations, proposals for macro-op
fusion, and things other architectures do.  And just kind of threw them
all in there and mused openly to Claude about how that looked to me and
asked it for feedback.

Claude was not a reliable witness, and led me down many garden paths of
faulty analyses and losses of comprehension.  But it was an exploration
I could pick up on a whim with my phone, so it won on convenience.

It feels like it's come out with a lot of redundancies; though often the
apparent redundancies are just redistributions of immediate sizes to
suit different idioms.

### Biclique optimisation

Some (many?) instructions pair naturally with only a limited set of
other instructions.  Attempting to pair a free choice of any operation
with free choice of any other operation isn't fruitful.  By cutting the
frames into different sections with different purposes (often emulating
different CISC instructions) it becomes easy to minimise the
combinations which are worth making space for.  Possibly (TBD) at the
cost of decode complexity.

Conversely, rules like `rsd-alu-pair` avoid relationships between slots
and so encoding freedom of operation order wastes nearly one bit, and
removing that freedom realises more opportunities for tuning.

All this optimisation risks over-fitting and adding complexity to the
decoder, so it must be done thoughtfully (Narrator: it has not been done
thoughtfully).

### Immediate sizing

This is gnarly.  You get 5 bits by default, aliasing with a register
index.  Five bits can't fully specify a bit shift on a 64-bit target.
Five bits is often not enough for a lot of things.  And you have to
decide whether it's signed or not.

In a lot of cases the thing to do is sacrifice another register operand
to get a 10-bit immediate.  Implicit SP with a 10-bit offset means you
can get to a lot of local variables.

Also, the value of the immediate in one slot will often be scaled by the
instruction choice in the other slot (e.g., `addi` gets its immediate
scaled by 4 if it's paired with `lw`), and of course memory access also
uses its own implicit scaling.

Otherwise, duplicate the opcode in the opcode list to extend the
immediate range by one bit.

Trawling through code there are patterns of step changes in immediate
requirements.  The specific corpus is an obvious source of this effect,
and some artefacts of the original immediate limits of the existing
architecture, but other things appear to be a legitimate reflection of
the way code tends to work.  I just kind of guessed.  Claude helped.  It
did lead to a lot of redundancy, but I didn't have many better ideas, so
immediate shaping became a big factor in the design choices.

### Enumeration

For the sake of a quick POC I just enumerated all the frames according
to their population counts rounded up to powers of two, and hoped I
wouldn't run out of space.  There's scope to do this more intelligently,
signalling specific conditions relevant to the instruction decoder in
specific bits of the enumeration, but I haven't put the effort in at
this stage.

### Load/store pairings

I was initially very reluctant to merge load/store data operands into
interdependent arrangements with arithmetic, because it leaves no space
for scheduling around memory delays.  Eventually I resigned myself to
accepting it, though, because without that there's going to be a lot
less compression.

Also, it opened up opportunities to hint at things that could be left
out of direct ALU paths.  Things like indirect branching via memory;
where branch prediction (when present) typically goes ahead with its
decision without seeing the data, and the data is only there to cancel
the prediction after the fact if it was inconsistent.

Chaining with a base-register operand was less painful.  In particular
filling the gap RISC-V leaves with `rb+k*ri` address generation which,
it turns out, can be done via temporary register without needing to save
the intermediate result.

## Future work

### decode complexity

A major problem right now is that the enumeration of frames and opcodes
within frames doesn't really attempt to match established conventions
about how the decoder can resolve details quickly.  It does (generally)
put rs1 and rs2 for the first instruction in the same slots, so they can
be prepared early, but there are other details one wants to know soonish
which could be surfaced but have not been.

With a bit of massaging it appears to be possible to reduce the
signature of each frame type down to a handful of bits in the opcode
field, and squeeze a signature for the transform required to turn the
slot-B parameters into a slot-A frame in another handful of bits.  But I
have not written (or vibed) such an allocator yet.

#### how to approach that

What we have right now is ten bits of "deal with it later", and 20 bits
corresponding to operand fields in fairly regular positions.  1024
codepoints, only about 3/4 populated after rounding each frame up to a
power of two.

What I believe is needed is to collate every codepoint by its slot-A
operand patterns (including immediate sizes and positions) and to pack
these bits together as a convenient decoder index.  I think Claude said
this was doable in about three or four bits.

Then, without regard to those bits, we need to sort the codepoints by
the slot B operands in the same way, and pack these together in the same
way, but in some different bits, so that we can begin the re-format of
slot B into a shape the normal instruction decoder can ingest.  One
would also want a clear signal for branches and jumps, for the
instruction prefetch pipeline.

There's no guarantee that will resolve into a sensible number of bits,
but I asked Claude to try and it said it might get away with three more
bits, but I haven't verified.

And in the cases where a list of opcodes contains repetitions of an
opcode to make up extra immediate bits, that enumeration should be
swizzled to put the redundant opcode selector at bit 30 or 31 of the
word, so immediate decode is relatively consistent.  This seems like the
least hard problem, but it should be done.

### quality

Another problem is lack of thoughtful optimisation and, conversely,
gross overfitting to my limited test corpus.

And, of course, the regularity needs to be improved.  Balancing
regularity and generality against compression.  And then factoring the
cost model of a realistic compiler in and then fitting more tightly to
that, and then reasserting regularity and generality all over again.
Around and around and around...

That said, this adventure promotes itself as being CISC-inspired, so
being a random bucket of overlapping things that seemed like good ideas
is pretty on-brand.

### sundries

And a toolchain would be nice, too.  And an implementation.  And from
those, feedback into what makes a better target, and back around the
tuning loops again with that insight in mind.

## AI disclosure statement

Yep.

[CISC-V experiment]: <https://github.com/sh1bot/ciscv_experiment>
[Claude]: <https://claude.ai/>
