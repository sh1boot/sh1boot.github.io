---
layout: post
title: Provisional CISC-V instruction set
svg: true
---

Here I finally get around to showing a system of compressing RISC-V code
by squashing pairs of opcodes into a single 32-bit packet rather than
squashing individual opcodes into 16-bit packets in order to address
issues with unaligned 32-bit instruction words.

I've tried to keep it resticted to just one third of the space used by
RVC, leaving half the opcode space unallocated (assuming it won't be
used for the remaining 2/3 of RVC, which would undermine the rationale
below).

## Why?

* To avoid all the problems of unaligned 32-bit packets
* To exploit inter-opcode redundancies
* To dress up like a CISC architecture in order to gain its powers

## Decoding

In its most primitive form the supposition is than in instruction
decoder would decode the first instruction normally (with the caveat
that the destination register is not in the usual location), while also
preparing another normal-looking 32-bit instruction word to evaluate on
the next cycle.

If an exception occurs on the first instruction then enough state should
be preserved that execution can resume from the second instruction in
the packet if needed, but otherwise there's no jumping into the middle
of a packet and it doesn't need to be efficient.

Alternatively, a multi-issue implementation could ingest the packet as a
single instruction and split it into uops at a more convenient stage in
the pipeline.  Or implement it as a single, fused instruction, if it's
capable.

## The structure

Four register fields shared between two adjacent instructions which are
to be executed back-to-back.  The first instruction (generally) has its
source register fields aligned to the source register field positions of
32-bit opcodes, and the destination register field is (generally) the
register written by the second instruction.  Other fields are recycled
and repurposed according to the frame structure they follow.

For example, a frame may designate a source register as also the
destination register to save encoding space, or elide the destination
register slot the first instruction and a source register slot of the
second instruction and hard-code them as a temporary register.

Frame structures are determined from the opcode field.  Each frame has a
number of opcode pair configurations it supports, and these are
enumerated and rounded up to the next power of two so that frame types
change at round number offsets.

Instruction pairs only allow control flow changes in the second opcode.
Branch targets are always 32-bit aligned.

## The process

I vibe-coded an instruction scheduler which I run over a corpus of
assembly, which attempts to optimise pairable instructions according to
rules describing what a legitimate instruction pair would look like,
just to get a feel for what sort of pairing rules I could introduce.  It
looks at register usage to determine when a result is no longer needed,
and which instructions can move past which other instructions.

This seemed easier than writing my own compiler to optimise a made-up
instruction set which was continuously changing.  But it has a lot of
limitations.

Then I coded up in all the pairs that seemed credible to me and began to
measure result, adding and removing until things started looking OK-ish.
Then I decided that was messy and re-vibed it from scratch, and then
decided to try drawing the bit layout for the instructions directly, to
confirm that things would actually fit.

Drawing these frames directly turned out to be more productive, because
it meant I could impose immediate range limits which actually fit with
the natural boundaries in the RISC-V instruction word rather than
estimating what caught the bulk of the needs.  And it showed that it's
all going to orbit around a 4-reg-field packing.

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
chain arrangements with arithmetic, but eventually I realised I'd be
stuck with it because that's where the compression is.  Trying to
eliminate the load->alu pairing is worth revisiting.  I also did
load->conditional-branch, on the basis that it's a thing and generally
the branch predictor will already have made its decision without regard
to the value loaded.

Less painful was chaining with base-register operand.  In particular
filling the gap RISC-V leaves with reg+reg*k address generation, which,
it turns out, can be done via temporary register without need to save
the intermediate result.`

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
  padding: 3px 4px 4px;
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
.tint-reg {
    --tint: 1;
    background-color: var(--tinted-fill);
}
.tint-imm {
    --tint: 2;
    background-color: var(--tinted-fill);
}
.tint-op {
    background-color: lightgray;
}
.tint-reserved {
    background-color: gray;
}
.tint-unused {
    background-color: lightgray;
}
.tint-rsrc {
    --tint: 3;
    background-color: var(--tinted-fill);
}
.tint-rdst {
    --tint: 4;
    background-color: var(--tinted-fill);
}
.tint-rsd {
    --tint: 5;
    background-color: var(--tinted-fill);
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
        {%- elsif column contains 'imm' %}
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
      <th colspan="{{width}}">
      {%- if hi != lo %}
      <span class="bit-hi">{{hi}}</span>&hellip;<span class="bit-lo">{{lo}}</span>
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
testcase0       21876    4217    80.7%     81.6%   98.9%       -199
godot           90172   13527    85.0%     76.3%  111.4%      +7841
cpp-rv32       420866   91362    78.3%     71.1%  110.0%     +30091
cpp-rv64       411687   86167    79.1%     71.4%  110.8%     +31771
musl-rv32      119026   27481    76.9%     74.9%  102.7%      +2390
musl-rv64      102040   21973    78.5%     72.7%  107.9%      +5843
sqlite-rv32    192768   46325    76.0%     72.1%  105.4%      +7445
sqlite-rv64    189677   43115    77.3%     72.1%  107.2%      +9840
-------------------------------------------------------------------
RV32 aggregate  754536  169385   77.6%     72.3%  107.3%
RV64 aggregate  793576  164782   79.2%     72.3%  109.6%
COMBINED       1548112  334167   78.4%     72.3%  108.5%     +95022
```

This is suboptimal because it's not using a compiler which optimises for
the instruction set I've created.  It's also suboptimal because I'm
using code compiled for RVC, which has register pressure not applicable
to my encoding scheme, and so it uses more instructions than strictly
necessary (at least in Clang's case -- GCC finds excuses to use more
instructions regardless).  I have some other test cases but the
tabulation got mucky, so let's just run with the above for now.
