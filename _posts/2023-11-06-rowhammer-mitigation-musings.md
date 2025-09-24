---
last_modified_at: Tue, 7 Jan 2025 22:48:05 -0800  # 272fdc9 fix-redirect-from-usage
layout: post
title:  Idly musing over RowHammer mitigation strategies
tags: rowhammer security hashing computer-architecture error-correction
redirect_from:
  - /rowmhammer-mitigation-musings/
svg: true
---
Watching a [RowHammer talk][] ([slides][RowHammer slides]) a while back (not
actually the linked one, but I couldn't find the one I attended) left me with a
couple of thoughts about possible mitigations which I didn't see discussed.

### My uneducated mental model

It's mentioned that RowHammer appears to be most effective at inducing
corruption when it places structured patterns around the bits under attack.
That's a fairly intuitive observation; that a bit might be more likely to flip
from 1 to 0 if everybody around it is already 0 and it's on a substrate with
any kind of leakage and nearby rows are being regularly topped up to their
extremes.

I don't know that this is true.  I'm just speculating; and it's important to
acknowledge that it's not really a model to explain RowHammer itself.  Just a
model for a specific observation of the effect of different memory patterns,
based on speculation over a single slide in a presentation which didn't focus
on that point too much.

But it seems to me that under such conditions (and maybe under a variety of
similar, more realistic conditions) one should reversibly hash the data before
storing it.  So that the in-capacitor representation is different from what it
accepts and presents on the data bus.

## Whitening the stored data

Hashing, or [whitening][], could reduce the risk that the local average of
stored bits will be something extreme and instead make it more likely to be
something middling (on a binomial distribution, I believe).  Real-world data
frequently lacks this property because it's full of regular patterns; and
malicious data could be even worse.

When you whiten data then the possibility of an adverse pattern showing
up does still exist, but it's in a place much less likely to occur
naturally, and as the data goes through its usual small permutations the
adverse pattern disappears again much faster.

Supposing the charge of an individual bit were to decay exponentially towards a
a local average of its neighbours, then moving that average closer to the
detection threshold means moving the asymptote and extending the life of the
bit.

If the primary driver for corruption is mostly about the specific two bits on
the same column of adjacent rows being refreshed, and other surrounding bits on
refreshed rows have little effect, then that's a lot less hopeful because
there's a lot less scope (literally, fewer bits) to mediate their effect.

Anyway, I don't have the first clue about modern DRAM design.  This is idle
speculation, and I don't have the means to perform the relevant experiments.

### As a pre-existing CPU feature

Clearly if an attacker can get the parameters to the hash operation then they
can just synthesise data which hashes to the hostile patterns.  So those
parameters need to be kept a secret.  That's a thing which normal memory
encryption has to do anyway, so hopefully a solved problem (spoiler: keeping
secrets is never a solved problem).

That also highlights that modern CPUs have, in the form of in-memory
encryption features like [TME][] and [SME][], the means to compare the
RowHammer sensitivity of hashed versus unhashed storage.  Which is
handy.  Somebody should do that.  I wish I had the means myself.

## Allowing ECC to do its job more effectively

The above mitigation doesn't exactly solve anything, though.  It would just
move the problem around and hopefully makes the failure case less likely and
with smaller effect.  Ideally it makes errors sufficiently small in
effect that ECC could do its job effectively.

The greater mitigation would be to spread what ECC considers in a block
across different physical regions of storage; so that an attack focused
on one part of the chip is effective only against a small portion of the
block which ECC has to salvage; even in the overall damage is large, ECC
might need only correct small fragments of it at a time if the ECC block
is properly distributed.

### Row address permutation

This might be achieved by splitting ECC across several independent chips, and
(this is important) _permuting_ the row addresses _differently_ for each chip
so that rows which are adjacent in one chip are _not_ adjacent in any of the
other chips.  Then, in order to overwhelm ECC one has to attack multiple
regions on different sets of rows concurrently.  And one also has to be able to
find those rows (maybe keep that permutation parameter a secret, too).

In fact, it might even be achieved by swizzling the row select lines
partway across the row.  Or perhaps more practically, using multiple
address decoders with different organisations of the address bits, and
having different parts of each physical row connect to different address
decoders; so that a given logical address activates segments of
different rows scattered across the die.

A trivial address permutation is just to rotate the bits differently on each
chip.  This permutation isn't much use as a secret operation which the attacker
couldn't guess, but it does arrange the addresses such that neighbours will
only be neighbours for one specific device.

<svg width="100%" viewbox="0 0 800 465">
  <defs>
    {% for n in (0..15) -%}
    <g id="row{{n}}"><rect x="0" y="0" width="140" height="30" /><text x="70" y="15">row {{n}}</text></g>
    {% endfor -%}
  </defs>
  <text x="80" y="25">logical address</text><text x="80" y="445">&hellip;</text>
  <rect x="165" y="5" width="150" height="460" /><text x="240" y="25">chip 0</text><text x="240" y="445">&hellip;</text>
  <rect x="325" y="5" width="150" height="460" /><text x="400" y="25">chip 1</text><text x="400" y="445">&hellip;</text>
  <rect x="485" y="5" width="150" height="460" /><text x="560" y="25">chip 2</text><text x="560" y="445">&hellip;</text>
  <rect x="645" y="5" width="150" height="460" /><text x="720" y="25">chip 3</text><text x="720" y="445">&hellip;</text>
  {% for n in (0..15) -%}
    <g class="blockgroup{{n}}">
    {% if n < 10 %}<text x="80" y="{{n | times: 40 | plus: 60}}">row {{n}}</text>{%endif%}
    {% assign m = n | times: 4369 | divided_by: 1 | modulo: 16 %}
    {% if m < 10 %}<use href="#row{{n}}" x="170" y="{{m | times: 40 | plus: 40 }}" />{%endif%}
    {% assign m = n | times: 4369 | divided_by: 2 | modulo: 16 %}
    {% if m < 10 %}<use href="#row{{n}}" x="330" y="{{m | times: 40 | plus: 40 }}" />{%endif%}
    {% assign m = n | times: 4369 | divided_by: 4 | modulo: 16 %}
    {% if m < 10 %}<use href="#row{{n}}" x="490" y="{{m | times: 40 | plus: 40 }}" />{%endif%}
    {% assign m = n | times: 4369 | divided_by: 8 | modulo: 16 %}
    {% if m < 10 %}<use href="#row{{n}}" x="650" y="{{m | times: 40 | plus: 40 }}" />{%endif%}
    </g>
  {% endfor -%}
</svg>

What this means is that if a conventional RowHammer attack is mounted, then
that might successfully corrupt a row in n different regions (where n is the
number of devices in an ECC block), but ECC only has to deal with 1/n of that
corruption at a time with the support of (n-1)/n un-corrupted regions to help
it correct each of those corrupted rows; one at a time as they come up.

Maybe one could secretly hash the row address itself, and then rotate it for
different devices, so that the effect of the rotation is harder to guess?
That's really a crypto question which needs more careful thought than I'm
going to give it.

## Putting ECC in-loop with DRAM refresh

It would be nice if refresh and ECC worked in harmony, here, correcting errors
before they could reach a fatal threshold; but I'm pretty sure that's
unrealistic for a variety of reasons.

## Learning from other analogue communication fields

I think that's all I've got on the matter.  But as a general observation data
communications has pushed up against the [Shannon limit][] with generous
application of techniques that I'm haven't heard much about in the DRAM space.
Perhaps the great impediment is finding the techniques which are low latency
and low power.  Of course we do already have ECC.  Perhaps it's just a matter
of deciding how to make it more effective?

Another thing that stands out to me is [RowPress][].  That leaving a row
active for longer causes more corruption.  Learning about this attack is
when I found out that DRAM is not quite what I thought it was.  I used
to think that during activation it would register the values from the
capacitors into flops and answer subsequent queries from the flops, and
then write the data back to recharge the capacitors before moving on to
a new row.  This I leaned is only half true.  The data is latched (not
registered; and a latch is half a flop -- haha!), and the data isn't
written back on a closure cycle.  Instead the sense amps which test the
bit have a positive feedback loop which propagates all the way back into
the capacitors which they're reading while also providing a clean level
for the digital logic.  So as long as the row is open any leakage in the
capacitors is being topped up, and that leakage is going... possibly
into its neighbours.

This part seems easy to fix.  The data is already latched so you could
just disconnect the source row, I guess.

[RowHammer talk]: <https://youtu.be/wGcVrKaOvFo>
[RowHammer slides]: <https://safari.ethz.ch/architecture_seminar/fall2023/lib/exe/fetch.php?media=onur-comparchseminar-fall2023-lecture3-rowhammerstory-afterlecture.pdf>
[whitening]: <https://en.wikipedia.org/wiki/Whitening_transformation>
[TME]: <Https://en.wikichip.org/wiki/x86/tme>
[SME]: <Https://en.wikichip.org/wiki/x86/sme>
[Shannon limit]: <https://en.wikipedia.org/wiki/Noisy-channel_coding_theorem>
[RowPress]: <https://arxiv.org/abs/2306.17061>
