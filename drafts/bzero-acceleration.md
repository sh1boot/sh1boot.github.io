---
layout: post
title: Fast internal erase of SDRAM
---
Imagine how many security vulnerabilities might be mitigated if only
every `free()` operation came with a free `bzero()` to destroy the
freed data.  But that's an expensive operation and there's no
strong case for spending all that effort on "just in case" situations
which _shouldn't_ occur in well-formed code.  Just write better code, silly!

I was thinking about this in conjunction with a memory tagging system
which would auto-erase cache lines whenever the tags change, rather than
requiring a dedicated sweep of addresses to update the tags to new
values otherwise necessary to avoid faults after the deliberate change.

Re-tagging with automatic erasure might work well at the cache level
where a tag mismatch zeroes the whole cache line and avoids going out to
physical memory to fetch what is just going to be recently-zeroed data
(or data you shouldn't be allowed to see anyway).  But in those gaps
between cache hits you've got other problems.

I think one could have an hierarchy of erasure bits to elide cache miss loads
from memory marked invalid (then clear that bit when you mark the cache
line dirty, because coherency interfaces will then behave as-if the
memory has been erased); but those details are for another post...

At the bottom of all that you have a _lot_ of memory, requiring a lot of
tags.  But I think that with just a small tweak to the design of SDRAM
chips (no big deal, right?) one could maintain just one bit of tag per
row of memory.  Pencil that in as one bit per 4kB of data.

For any whole-4kB (or whatever your SDRAM page size is) chunk of memory
you want erased, you just set its erasure bit, saying you'll do it
later.

So how do we do it later?

Well... DRAM divides its memory up into rows of capacitors, each with
its own transistor.  You give it a row address and it connects that row
of capacitors via its transistor to columns of wires (bitlines)
connected to sense amplifiers which do two things at once -- they decide
whether the capacitor charge was above or below halfway, and they drive
those capacitors all the way in whichever direction they were biased.
The output of the amplifiers is then latched for external access from
the system.

The first stage in reading the capacitors is to pre-charge the bitlines
to an intermediate voltage, so that the small charge dumped onto those
lines by the capacitor has a measureable effect above or below the
threshold voltage.

If you don't pre-charge then the capacitors don't move the bitlines far
enough (beacuse those long wires have their own capacitance) and you
just get out what was already on the wire regardless of what was in the
capacitor.

And, because there's positive feedback, it writes that value back to the
capacitors at the same time.

So... supposing that at the memory controller, when you need to open a
new row on an SDRAM, you first check to see if it's tagged for erasure.

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
that row, until it's no longer needed.  Hopefully reads are obviated by
a smart memory hierarchy and it's just writes; and if a different row
has to be opened before it's completely overwritten with new data,
that's fine because the remainder of the row is already erased.

As things stand I believe there's no formal way to force those zeroes in
there.  What I think you would have to do is to store all zeroes in one
row, and then open that row in the normal way to get the bitlines
initialised, and then, if it's allowed, to flip to another row bypassing
the whole precharge phase.

You can do memcpy() this way, too, but in a fairly limited way, since
the copy only functions within the same bank on the same device.
