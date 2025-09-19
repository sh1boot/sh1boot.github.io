---
layout: post
title: Why can't SDRAM do fast erasure?
---
Imagine how many security vulnerabilities might be mitigated if only
every relase operation came with a free memset() to destroy the released
information.

But clearing memory involves spamming a lot of data through a lot of
different layers.  It's not cheap.

But one thing that stands out to me is the SDRAM interface itself.  One
thing the DRAM does internally is to scoop up rows of memory all at once
and be ready to serialise it out; and another is to periodically sweep
through memory reading it and writing it back to keep it fresh and
robust.

So if, at the SDRAM controller or on the memory module, you keep a
bitmap of rows pending erasure, you could inject that one extra bit
saying "fetch this row -- but zero the result", which I think could be
done in a single cycle.  Then all subsequent reads to the same row are
pre-zeroed, and when the row gets written back the whole thing is
cleared out implicitly.

One bit per row is pretty good compression, but you still wouldn't want
to spend that much SRAM on erasure flags for all your memory, so you'd
really need to implement another layer of cache for that.

The other part of the bzero problem is all the caches you have to go
through.  If you invalidate the caches over freed memory but that memory
is about to be used by the next allocation, then its performance is
poorer than if you'd just retained the garbage that was already there.
You could write zero into it, but you don't want that to be a dirty zero
that eventually has to be flushed back to SDRAM when the line is
re-used.

I wonder what the Memory Tagging Extension is doing to handle these
conditions when it re-tags data and has to inform the cache that the old
tags are junk.  This might be the big opportunity to join these two
problems up for a complete solution which isn't horribly inefficient.
