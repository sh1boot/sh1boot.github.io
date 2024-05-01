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

In order to make it possible for the decoder to enter the stream _somehow_, the encoder has to
maintain a keep-out region of the screen where references are not allowed so
that a decoder joining at an arbitrary point still has a way to eventually
construct a whole frame that doesn't involve references beyond a particular
point in time.

This gets a bit hairy because there are also loop filters which makes the
regions bleed together a bit.  They're small errors but they can build up if
you don't watch them.

Here are some techniques I'm aware of: 

### only refer above intra stripe in previous frame(s)
One solution is to only refer back to parts of the screen already painted since
a specific point in time (eg., since the last time the rolling intra reached
the top of the frame).  Any decoder can then discard everything up to that
point in time, and then start collecting segments until it has a complete
picture and then proceed as normal.

#### advantages
* conceptually simple
* smooths out i-frame cost across whole stream
* reasonable range of reference source material 
* implied start point means multiple reference frames can be used (within constraints).

### disadvantages
* very high recovery time: up to two frame draw cycles when joining just after beginning of frame


## forward error correction
Send parity blocks of n packets so they if I've of those N is lost it can be reconstructed.

Typically a set of blocks which are all part of the same frame might be protected, but it's also possible to reach across time to offer the opportunity to salvage a previous frame of that was not received, and even if it's too late to display that frame recovering it means the the current frame can still have a valid reference.  This compensates for the turnaround time is the client would have to request a retransmit of the lost data.

### advantages
* no extra latency

### disadvantages
* doesn't always work
* costs extra bandwidth

## restrict reference area to same stripe in previous frame
this allows the client to start reconstruction from any point in the stream so it has a constant wait time rather then having to discard. 

### disadvantages
* inefficient; can only refer one frame back and can't refer to other parts of the frame for vertical movement

## refer back n frames only
this creates a set of n independent streams, so if one breaks when the others can carry on at a reduced frame rate. 

the trouble is every new feature has to be drawn into every stream separately, because it cannot be copied between them.


## retransmit requests, and drop-from-reference requests

after a frame is lost, ask the encoder to exclude references to the lost data.  this has a turn around time cost, and can be quite high latency but much lower latency than having to wait for a full repaint 


...and some other stuff...
