---
layout: post
title: Provisional CISC-V instruction set
svg: true
---

Here I finally get around to showing a system of compressing RISC-V code
by squashing pairs of opcodes into a single 32-bit packet rather than
squashing individual opcodes into 16-bit packets in order to address
issues with unaligned 32-bit instruction words.

I've kept it resticted to just one third of the space used by RVC,
leaving half the total opcode space unallocated -- assuming it won't be
used for the remaining 2/3 of RVC, which would undermine the rationale
below.

## Why?

* To avoid all the problems of unaligned 32-bit packets
* To exploit inter-opcode redundancies
* To dress up like a CISC architecture in order to gain its powers

Basically, I saw too many complaints about the various consequences of
16-bit aligned instructions mixed with 32-bit aligned instructions, and
so I started [thinking about it
myself](/naturally-aligned-instruction-set/), and did [some very rough
hacking](/experimental-riscv-instruction-compression/) to see how I
might solve it, and now I'm at the stage which I present here, which I
hope is good enough to get the general idea across and demonstrate
viability.

## Packet structure

Four register fields (the three standard ones, plus one more in the
middle of `funct7`) shared between two consecutive instructions.

The first instruction (generally) has its source register fields aligned
to the source register fields of 32-bit opcodes, but the 32-bit
destination register field is (generally) the register written by the
second instruction.  Other fields are recycled and repurposed according
to the specific frame structure they follow.

For example, a frame may designate a source register as also the
destination register to save encoding space, or elide the destination
register slot the first instruction and a source register slot of the
second instruction and hard-code them as a temporary register.

For 'chain' rules, a temporary register is used, and not encoded in the
packet at all.  This should probably be hard-coded as `x31` (which
doesn't exist on RV32-E, so maybe `x7` instead?), but for the sake of
implementation flexibility I would not want to promise that the
intermediate result be written back _unless_ there's an exception within
the packet.  Meaningt the value of the temporary register would be
undefined after a chain packet.

Frame structures are determined from the opcode field.  Each frame has a
number of opcode pair configurations it supports, and these are
enumerated and rounded up to the next power of two so that frame types
change at round number offsets.

Instruction pairs only allow control flow changes in the second opcode.
Branch targets are always 32-bit aligned.

A frame might pose a question like "how do we implement load with base
address write-back?" and then encapsulate the two instructions which
implement that (`load` and `addi`) by re-using operands from the first
instruction in the second (`rbase` -> `rdest`, `rbase` -> `rs1`,
`offset` -> `immediate`), and then unroll that across all the
opcodes (`lb`, `lbu`, `lh`, etc..) it needs to complete the set.

## Decoding

In its most primitive form the supposition is than an instruction
decoder would decode the first instruction normally (with the caveat
that the destination register is not in the usual location), while also
preparing another normal-looking 32-bit instruction word to evaluate on
the next cycle.

If an exception occurs inside a packet then enough state must be
preserved that execution can resume from the second instruction in the
packet if needed, but otherwise there's no jumping into the middle of a
packet and that process doesn't need to be efficient.

Alternatively, a multi-issue implementation could ingest the packet as a
single instruction and split it into uops at a more convenient stage in
the pipeline.  Or implement it as a single, fused instruction when
possible.

## Development process

I vibe-coded an instruction scheduler which I run over a corpus of
assembly, which attempts to find and fuse pairable instructions
according to rules describing what a legitimate instruction pair would
look like, just to get a feel for what sort of pairing rules I could
introduce.  It looks at register usage to determine when a result is no
longer needed, and which instructions can move past which other
instructions.

This seemed easier than writing my own compiler to optimise a made-up
instruction set which was continuously changing, but it also has a lot
of limitations.  There's no expectation for it to yield runnable code;
merely to give a feel for what things would look like if the nits can be
worked out.

Then I randomly threw rules at it to see what would stick.

After a bit of that I started to worry that my ballpark estimates for
bit allocations weren't fit for purpose, so I tried to draw things out
by hand, and I ended up refactoring the scheduler to accept rules
defined in terms of instruction frame layouts rather than rules.

Attempting to draw things around the standard RISC-V frames showed that
my plan would orbit around a set of four register/immediate fields which
would be switched around and re-used as needed by each frame.

Here's the tooling, such as it is: [CISC-V experiment][]

It's not really human-readable anymore.  [Claude][] has taken it its own
way and much of what it does is flaky and unreliable and I don't want to
think about all that.  But it's sufficient to get a gist of whether the
ideas make sense and how they map to real code.

### Pairing rule selection

Not intelligently done.  Redundancies not eliminated.  Optimisations
ad-hoc.  Very little care and attention, overall.

I drew inspiration from classic CISC operations, proposals for macro-op
fusion, and things other architectures do.  And just kind of threw them
all in there and mused openly to Claude about how that looked to me and
asked it for feedback.

Claude was not a reliable witness, and led me down many garden paths of
faulty analyses and losses of comprehension.  But it was a process I
could do on my phone without much attention.

### Biclique optimisation

Some (many?) instructions pair naturally with only a limited set of
other instructions.  Attempting to pair a free choice of any operation
with free choice of any other operation isn't fruitful.  By cutting the
frames into different sections with different purposes (often emulating
different CISC instructions) it becomes easy to minimise the
combinations which are worth making space for.

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
which branch prediction (if you have it) would assume it knows how to do
without seeing the data, and the data is only there to cancel the
prediction after the fact if it was inconsistent.

Less painful was chaining with base-register operand.  In particular
filling the gap RISC-V leaves with `rb+k*ri` address generation which,
it turns out, can be done via temporary register without need to save
the intermediate result.

## The encoding (provisional)

Bits marked `o` below are the bits used to enumerate the opcode
combinations available in each frame.  Unfortunately I didn't enumerate
_what_ opcodes are available in each frame and used opaque placeholder
names like `alu` and `load`, but these represent choices from set lists
chosen on a per-frame basis.

### frame structures
<style>
.bitfield th,td {
  text-align: center;
}

table .bitfield {
  table-layout: fixed;
  width: 100%;
}
.bitfield .bitfield-note {
  font-family: monospace;
  font-size: smaller;
  text-align: left;
}
.bitfield .bitfield-spacer th {
  font-size: 0;
  line-height: 0;
  padding: 0;
  border: none;
}

.bitfield .bitfield-rowlabel th {
  border-bottom: none;
}
.bitfield .bitfield-index th {
  font-size: x-small;
  font-weight: thin;
  padding: 1px 3px;
}
.bitfield .bitfield-rowlabel + .bitfield-index th {
  border-top: none;
  padding-top: 0;
}
.bitfield .bitfield-index .bit-hi { float: left; }
.bitfield .bitfield-index .bit-lo { float: right; }

.bitfield .bitfield-fields td {
  font-weight: normal;
  padding: 3px 4px 4px;
}
.bitfield .bitfield-footnote td {
  text-align: left;
  padding: 1px 1em;
  border: none;
}
.tint-op {
    background-color: var(--minima-table-zebra-color);
}
.tint-reserved {
    background-color: gray;
}
.tint-unused {
}
.tint-imm {
    --tint: 0;
    background-color: var(--tinted-fill);
}
.tint-rsrc {
    --tint: 1;
    background-color: var(--tinted-fill);
}
.tint-rdst {
    --tint: 2;
    background-color: var(--tinted-fill);
}
.tint-rsd {
    --tint: 1;
    --tint-b: 2;
    --rs-fill: var(--tinted-fill);
    --rd-fill: var(--tinted-fill-b);
    background: linear-gradient(135deg, var(--rs-fill) 0%, var(--rs-fill) 33%, var(--rd-fill) 67%, var(--rd-fill) 100%);
}
</style>

{% for frame in site.data.ciscv-proto.frames %}
  {%- assign rows = frame.layout | newline_to_br | strip_nelines | split: '<br />' %}
  {%- capture cooked_string %}
  {%- for row in rows %}
    {%- assign columns = row | split: '│' %}
      {%- if columns.size < 2 %}{% continue %}{% endif %}
      {%- for blob in columns -%}
        {%- assign bits = blob | size | plus: 1 | divided_by: 2 %}
        {%- assign column = blob | strip %}
        {%- if column.size < 1 %}
          {%- if forloop.index0 == 0 %}{% continue %}{% endif %}
          {%- assign type = 'unused' %}
        {%- elsif column contains ',' %}
          {%- assign type = 'template' %}
        {%- elsif column contains 'rsd' %}
          {%- assign type = 'rsd' %}
        {%- elsif column contains 'im' %}
          {%- assign type = 'imm' %}
        {%- elsif column contains 'rs' %}
          {%- assign type = 'rsrc' %}
        {%- elsif column contains 'rd' %}
          {%- assign type = 'rdst' %}
        {%- else %}
          {%- assign type = 'op' %}
        {%- endif %}
{{-''-}}{{column}}((:)){{bits}}((:)){{type}}((col)){{-''-}}
      {%- endfor %}
{{-''-}}((row)){{-''-}}
  {%- endfor %}
  {%- endcapture %}
{% assign rows = cooked_string | split: '((row))' %}
<table class="bitfield" id="{{ frame.name | slugify }}">
<thead>
<tr><th colspan="33"> {{frame.name}} </th></tr>
</thead>
<tr class="bitfield-spacer">
{%- for i in (0..31) %} <th style="width:2.35%;f">{{i | times: -1 | plus: 31}}</th> {%- endfor %}
<th style="width:24.8%">note</th>
</tr>
{%- for row in rows %}
  {%- assign cols = row | split: '((col))' %}
  {%- unless row contains 'template' %}
  <tr class="bitfield-index">
    {%- assign bitpos = 31 -%}
    {%- for blob in cols %}
      {%- assign field = blob | split: '((:))' %}
      {%- assign width = field[1] | default: 0 %}
      {%- assign hi = bitpos -%}
      {%- assign lo = bitpos | minus: width | plus: 1 -%}
      {%- assign bitpos = lo | minus: 1 -%}
      {%- assign lop1 = lo | plus: 1 -%}
      <th colspan="{{width}}">
      {%- if hi != lo %}
      <span class="bit-hi">{{hi}}</span>{%- if lop1 != hi -%}&hellip;{%- endif -%}<span class="bit-lo">{{lo}}</span>
      {%- else %}
      {{hi}}
      {%- endif %}
      </th>
      {%- if bitpos < 0 %}{% break %}{% endif %}
    {%- endfor %}
  </tr>
  {% endunless %}
  <tr class="bitfield-fields">
    {%- assign bitpos = 32 -%}
    {%- for blob in cols %}
      {%- assign field = blob | split: '((:))' %}
      {%- assign name = field[0] %}
      {%- assign width = field[1] %}
      {%- assign kind = field[2] %}
      {%- assign bitpos = bitpos | minus: width %}
      <td {% if bitpos >= 0 %}colspan="{{width}}" class="tint-{{kind}}"{% else %}class="bitfield-note"{% endif %}>{{name}}</td>
    {%- endfor %}
  </tr>
{%- endfor %}
</table>
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
using code compiled for RVC, which has register pressure not applicable
to my encoding scheme, and so it uses more instructions than strictly
necessary (at least in Clang's case -- GCC finds excuses to use more
instructions regardless).  I have some other test cases but the
tabulation got mucky, so let's just run with the above for now.

## Future work

A major problem right now is that the enumeration of frames and opcodes
within frames doesn't really attempt to match established conventions
about how the decoder can resolve details quickly.  It does (generally)
put rs1 and rs2 for the first instruction in the same slots, so they can
be prepared early, but there are other details one wants to know soonish
which could be surfaced but have not been.

This is a thing that can be handled in the way that the currently-naive
enumeration counts its way through the things that are needed.  Putting
things in more thoughtful orders and moving the bits which distinguish
particular features into predictable locations rather than just being
counts assigned incrementally.

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

And a toolchain would be nice, too.  And an implementation.

## AI disclosure statement

yes.

[CISC-V experiment]: <https://github.com/sh1bot/ciscv_experiment>
[Claude]: <https://claude.ai/>
