---
layout: post
title:  "Error resilience in rolling-intra"
categories: video coding, error correction, wip
---

Rolling intra is where a portion of each coded video frame is encoded without
reference to any previous frame, guaranteeing that that part of the scene can
be reconstructed when joining or re-joining a stream without previous context.

The general problem with this is that the rest of the frame is built from
references to data that you don't yet have.  You can't reconstruct that, and
you have to wait for enough other intra blocks to fill all of that in as well.
Meanwhile, the parts that you do have may be making reference to other parts
that you don't have, so those references just produce more unknowns.

In order to make it possible for the decoder to enter the stream _somehow_, the
encoder has to maintain a keep-out region of the screen where references are
not allowed so that a decoder joining at an arbitrary point still has a way to
eventually construct a whole frame that doesn't involve references to things
it's never seen.

## The loop filter caveat

Loop filters make all this a bit hairy.  Loop filters bleed regions together a
little to help cover blocking artefacts from excessive quantisation, which
means that what's notionally a clean slice can be contaminated by the state of
its neighbours, which may be unknown when entering into a rolling intra
situation.

They're small errors but they can build up if you're unlucky.

Worse; in some of the more unfortunate codec designs these can propagate
indefinitely within the same frame; from the very top left of the frame to the
bottom.  These perturbations are too small to provide any coding advantage but
they _do_ undermine the decoder's ability to handle things in arbitrary order.
It's a recurring design flaw that nobody seems to care about fixing.

The reality is that the changes are usually too small to propagate anywhere
near that far, but it's hard (maybe impossible) to _prove_ that they won't, so
you're still stuck with this theoeretical causality problem restricting your
ability to reorder.

Let's just ignore that and hope it happens rarely and washes out before anybody
notices, because if you're not using a codec that has fixed it then the best
you can do is turn off the loop filter (which creates its own problems).

## Mitigations and improvements

Back to getting a decoder back to coherency after joining a stream.  Here are
some techniques which can be used in constructing a solution (some
complementary, some mutually exclusive):


### refer only above intra stripe of previous frame(s)
The most obivous solution is to only refer back to parts of the screen already
painted since a specific point in time.  Typically the point in time when the
intra stripe was at the top of the screen.  Any decoder can then discard
everything up to that point in time, and then start collecting segments until
it has a complete picture.  Then it can proceed as normal.

#### advantages
* conceptually simple
* smooths out I-frame cost across whole stream
* reasonable range of reference source data
* implied start point means everything back to that point can be used as a
  reference (under constraints).

#### disadvantages
* very high recovery time: decoder must wait for the start of the next frame
  before beginning to reconstruct, and must complete reconstruction before
  beginning to display


### restrict reference area to same stripe in previous frame
This allows the client to start reconstruction from any point in the stream so
it has a constant wait time rather then having to discard.

#### advantages
* allows reconstruction to start earlier -- on average 33% faster than waiting
  for top of frame

#### disadvantages
* inefficient; blocks can only refer one frame back and only to a thin stripe
  of that previous frame


### refer back exactly `n` frames
This creates a set of `n` independent streams, so if one breaks when the others
can carry on at a reduced frame rate undisturbed.

#### disadvantages
* every new feature in a scene has to be transmitted `n` times


### asking the encoder for help
When the client loses sync it can tell the encoder that it needs help getting
back on track,

After a frame is lost, ask the encoder to exclude references to the lost data.
this has a turn around time cost, and can be quite high latency but much lower
latency than having to wait for a full repaint.

#### advantages
* no need to wait for the whole intra reconstruction time

#### disadvantages
* have to wait for the round-trip time to the server to get things back on track
* reconfiguring the server's encoding pipeline can cause other delays
* demands a large burst of I-frame data be delivered as quickly as possible,
  which may lead to more packet loss on a throttled link


### forward error correction (one frame)
Not the small-scale FEC you might see on a CD, but larger block scale.  The
internet is much more likely to discard whole packets rather than to deliver
them with bit errors, so bit error corrections aren't generally helpful (unless
you do some complex transforms).

Send parity blocks of n packets so they if I've of those N is lost it can be
reconstructed.

The obvious way to apply this is to split one frame into blocks and then add
parity block(s) so that lost parts of the frame can be reconstructed from
parity, so that the whole frame survives.  Or doesn't if you lose too many
packets.

#### advantages
* no extra latency

#### disadvantages
* doesn't always work
* costs extra bandwidth


### forward error correction (spanning frames)
It's also possible to spread the error correction over a longer time.  Create a
parity block spanning a packet of the current frame and a packet of the
previous frame as well.  This means that if you lose the current frame's packet
then you can reconstruct it from parity combined with previous frame, but also
if you lost that piece of the previous frame then you get a second chance at
reconstructing it from the current chunk and parity.

While it may be too late to display the salvaged frame, you can still avoid the
problem it would cause if you needed to reference it to draw the current frame.

This can be helpful in keeping things together when the latency of requesting a
retransmit or re-encode would be too long.

#### advantages
* don't necessarily have to drop out and begin reconstruction if a frame isn't
  completed on time

#### disadvantages
* increasing the number of blocks covered by a parity block increases the risk
  of failure

## An example system

TODO: it would probably make sense to show how to use several techniques in
combination

with diagrams
