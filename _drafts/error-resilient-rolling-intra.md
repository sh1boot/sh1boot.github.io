---
layout: post
title:  "Error resilience in rolling-intra"
categories: video coding, error correction, wip
---

Something something something...

Rolling intra is where a portion of each coded video frame is encoded without
reference to any previous frame, guaranteeing that that part of the scene can
be reconstructed when joining or re-joining a stream without any previous
context.

The trouble is that the rest of the frame is built from references to data that
you don't yet have.  You can't reconstruct that, and you have to wait for
enough other intra blocks to fill all of that in as well.  Meanwhile, the parts
that you do have may be making reference to other parts that you don't have.

In order to make it possible to enter the stream _somehow_, the encoder has to
maintain a keep-out region of the screen where references are not allowed so
that a decoder joining at an arbitrary point still has a way to eventually
construct a whole frame that doesn't involve references beyond a particular
point in time.

This gets a bit hairy because there are also loop filters which makes the
regions bleed together a bit.  They're small errors but they can build up if
you don't watch them.

One solution is to only refer back to parts of the screen already painted since
a specific point in time (eg., since the last time the rolling intra reached
the top of the frame).  Any decoder can then discard everything up to that
point in time, and then start collecting segments until it has a complete
picture and then proceed as normal.

If you don't have a latency concern I'm not sure there's a lot of point in
this.  You might just as well send whole keyframes and have the client buffer
for a bit longer.

So what's interesting is the latency problem.  Latency at start of session is
nice to improve (channel-surfing latency), but what's even more critical is
latency around packet loss mid-stream, where you don't want to spend all that
time on a full resync.

So what to do in the interim?  Forward error correction might help you dodge
the problem, but once that breaks down you have to resort to concealment and
retransmission, where retransmission has latency of its own.

One thought I had about "concealment" was to restrict the reference frames to
being exactly n (probably 2) frames back, rather than just one.  This means
that if a frame is lost, then the frames that refer to it cannot be
reconstructed, but the ones in between still can (give or take the rolling
intra component), so you can stutter along at a reduced frame rate until
there's enough to reconstruct the lost cycle.

Another is that using parity blocks you can try to make an intra slice
recoverable in the next frame, so it can be reconstructed after the lost frame,
to reduce the recovery latency _slightly_ while at the same time you report the
lost frame to the sender, and they can signal the encoder to drop it from their
reference set, so you can recover much sooner still.

...and some other stuff...
