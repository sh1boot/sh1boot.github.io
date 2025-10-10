---
layout: post
title: Why not a victim cache to mitigate Spectre?
---
It's pretty clear I cannot be the first to think of putting the cache
lines back the way they're supposed to be after a spurious eviction
caused by bad speculation.  I'm curious as to why I haven't heard about
it being tried.

Specifically, I wonder about using a short victim cache, to capture all
the evicted cache lines (speculation or not), but then when the CPU has
to do a pipeline flush you can examine that victim cache and pop the
relevant entries back into place (making a note that the incoming
fetches must be discarded rather than put into the cache).

Now that I think of it, I suppose by the time the flush comes up those
transactions are probably still in flight.  Maybe the eviction hasn't
happened at that point?  Maybe that's why "victim cache" isn't relevant
here?

Anyway, a couple of questions:
* How many evictions does incorrect speculation cause?
* How many of those evictions were going to happen anyway, without the
  data being used again?
* I had a third question but I forget what it was.
