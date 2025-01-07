---
last_modified_at: Tue, 11 Jun 2024 17:41:45 -0700  # 3657e0a rowhammer-mitigation-thoughts
layout: post
title:  Idly musing over RowHammer mitigation strategies
tags: rowhammer security hashing computer-architecture error-correction
aliases:
  - rowmhammer-mitigation-musings/
---
Watching a [RowHammer talk][] ([slides][RowHammer slides]) a while back (not
actually the linked one, but I couldn't find the one I attended) left me with a
couple of thoughts about possible mitigations which I didn't see discussed.

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

Hashing, or [whitening][], could reduce the risk that the local average of
stored bits will be something extreme and instead make it more likely to be
something middling (on a binomial distribution, I believe).  Real-world data
frequently lacks this property because it's full of regular patterns, and
malicious data could be even worse.

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

Clearly if an attacker can get the parameters to the hash operation then they
can just synthesise data which hashes to the hostile patterns.  So those
parameters need to be kept a secret.  That's a thing which normal memory
encryption has to do anyway, so hopefully a solved problem (spoiler: keeping
secrets is never a solved problem).

That also highlights that modern CPUs have the means to compare the RowHammer
sensitivity of hashed versus unhashed storage.  Which is handy.

This mitigation doesn't exactly solve anything, though.  It would just move the
problem around and hopefully makes the failure case less likely and with
smaller effect.  Ideally sufficiently small an effect that ECC could do its job
effictively.

The greater mitigation would be to spread what ECC considers across different
physical regions of storage; so that an attack focused on one part of the chip
is effective only against a small portion of what ECC has to salvage.

This might be achieved by splitting ECC across several independent chips, and
(this is important) _permuting_ the row addresses _differently_ for each chip
so that rows which are adjacent in one chip are _not_ adjacent in any of the
other chips.  Then, in order to overwhelm ECC one has to attack multiple
regions on different sets of rows concurrently.  And one also has to be able to
find those rows (maybe keep that permutation parameter a secret, too).

A trivial address permutation is just to rotate the bits.  Not great as a
secret, but it arranges the addresses such that neighbours will only be
neighbours for one specific device.

What this means is that if a conventional RowHammer attack is mounted, then
that might successfully corrupt a row in n different regions, but ECC only has
to deal with 1/n of that corruption at a time with the support of (n-1)/n
un-corrupted regions to help it correct each of those corrupted rows, one at a
time as they come up.

It would be nice if refresh and ECC worked in harmony, here, correcting errors
before they could reach a fatal threshold; but I'm pretty sure that's
unrealistic for a variety of reasons.

I think that's all I've got on the matter.  But as a general observation data
communications has pushed up against the [Shannon limit][] with generous
application of techniques that I'm haven't heard much about in the DRAM space.
Perhaps the great impediment is finding out techniques which are low latency
and low power.  Of course we do already have ECC.  Perhaps it's just a matter
of deciding how to make it more effective?

Another thing that stands out to me is [RowPress][].  That leaving a row active
for longer causes more corruption.  Learning about this attack is when I found
out that DRAM is not quite what I thought it was.  I used to think that it
during activation it would register the values from the capacitors into flops
and answer subsequent queries from the flops, and then write the data back to
recharge the capacitors before moving on to a new row.  It turns out the
arrangement is not like that at all, and the internals of the array seem to be
hot for the duration of the activation.  I guess the fact that it's not already
the way I thought it was implies that the way I thought it was is too expensive
or too slow.  I don't know.

[RowHammer talk]: <https://youtu.be/wGcVrKaOvFo>
[RowHammer slides]: <https://safari.ethz.ch/architecture_seminar/fall2023/lib/exe/fetch.php?media=onur-comparchseminar-fall2023-lecture3-rowhammerstory-afterlecture.pdf>
[whitening]: <https://en.wikipedia.org/wiki/Whitening_transformation>
[Shannon limit]: <https://en.wikipedia.org/wiki/Noisy-channel_coding_theorem>
[RowPress]: <https://arxiv.org/abs/2306.17061>
