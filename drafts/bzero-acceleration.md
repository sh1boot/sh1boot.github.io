---
layout: post
title: Fast internal erase of SDRAM
---
Imagine how many security vulnerabilities might be mitigated if only
every `free()` operation came with a free `bzero()` to destroy the
freed data.  That's an expensive operation, though, and there's no
strong case for spending all that effort on "just in case" situations
which _shouldn't_ occur in well-formed code.  Just write better code,
silly!

I was thinking about this in conjunction with a memory tagging system
which would auto-erase cache lines whenever the tags change
(specifically when they were hit with a tag mismatch), rather than
needing to sweep the addresses and update all the tags ahead of time.

That looked fine as long as things operate within cache, but then there
are the gaps to think about.  A few tiers of memory metadata are needed
in some form or other, but most of those details are for another post...

At the bottom of all that you have a _lot_ of memory, requiring a lot of
tags which you neither want to store nor maintain in fine detail.

I think that with just a small tweak to the design of SDRAM chips (no
big deal, right?) one could implement deferred bulk erasure using just
one bit of tag per row of memory.  Pencil that in as one bit per 4kB of
data.

For any whole-4kB (or whatever your SDRAM page size is) chunk of memory
you want erased, you just set its erasure bit, saying you'll do it
later.

So how do we do it later?

Doing it later means doing it at the start of the next read or write
cycle which opens that row, when you already pay a timing penalty for
opening the row, and you just open it in a destructive way if the tag
bit says to do so.

DRAM divides its memory up into rows of capacitors, each with its own
transistor.  You give it a row address and it connects that row of
capacitors via its transistor to columns of wires (bitlines) connected
to sense amplifiers which do two things at once -- they decide whether
the capacitor charge was above or below halfway, and they drive those
capacitors all the way in whichever direction they were leaning.  The
output of the amplifiers is then latched for external access from the
system.

The first stage in reading the capacitors is to pre-charge the bitlines
to an intermediate voltage so that the small charge dumped onto those
lines by the capacitor has a measureable effect above or below the
threshold voltage.

If you don't pre-charge then the capacitors don't move the bitlines far
enough (beacuse those long wires have too much of their own capacitance)
and you just get out what was already on the wire regardless of what was
in the capacitor.

And, because there's positive feedback, it writes that value back to the
capacitors at the same time.

So... suppose that at the memory controller, when you need to open a new
row on an SDRAM, you first check to see if it's tagged for erasure.

If it's not to be erased then you begin a precharge phase, to get the
bitlines to the proper halfway point in preparation to read whatever's
stored there.

But if it _is_ to be erased, then drive the bitlines to zero, instead of
halfway, so that the when the row is connected it has no effect and zero
is driven back in to that whole row by the sense amps.  After that you
can clear the corresponding erasure bit because the job is done.

Or there are a handful of similar mechanisms which could achieve much
the same result.  The latches may be zeroed and fed back, instead, for
example.  Whatever's easy and robust.

Once the row is erased read and write transactions can be performed on
that row as normal until it's no longer needed.  Hopefully reads are
obviated by a smart memory hierarchy and it's just writes; and if a
different row has to be opened before it's completely overwritten with
new data, that's fine because the remainder of the row is already
erased.

As things stand I believe there's no formal way to force those zeroes in
there.  What I think you would have to do is to store all zeroes in one
row, and then open that row in the normal way to get the bitlines
initialised, and then, if it's allowed, to flip to another row bypassing
the whole precharge phase.

You can do memcpy() this way, too, but in a fairly limited way, since
the copy only functions within the same bank on the same device.
