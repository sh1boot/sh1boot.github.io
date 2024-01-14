---
layout: post
title:  "Pivot-sorting quick sort"
categories: quick sort, pivot, sorting, wip
---

Regarding those quick-sort derived sorts which do things like median-of-k pivot
selection before subdividing...

A couple of years ago (before I lost access to the write-up I did at that time)
it struck me that the diminisging-returns of using the median of larger samples
could be amortised over multiple levels of recursion by keeping the outcome for
later; because computing the median is a fair way towards sorting the whole
sample.

So I wrote [plpqsort][], which might have stood for something like "pivot-list
prefixed quick sort", and maybe it could be pronounced "plippick sort".  It's
hard to say what was going on in my head back then.

But don't worry about the name.  It takes a lot more careful thought to do a
better quicksort than what's many people have put a lot of effort into already,
and I only wanted to demonstrate a concept and slap a silly name on it so
people could draw inspiration from its singular innovation.

## the idea

The way this works is to take a random sampling of the unsorted data, and to
move that sample to the front of the list (doing it this way isn't efficient,
but it represents a simpler conceptual model).

The median of these is going to be our pivot.  But rather than compute just the
median, the whole sample is sorted fully.  This is now our "pivot-list prefix",
and the median picked from the middle of that prefix.

Then partition the data after that prefix in the usual way.

Then, exchange the top part of the low portion for the top part of the pivot
list (again, maybe not an efficient way to go about it), and set the start of
the second partition to start at the part of the prefix that was just moved.

Now we have two partitions, one greater than our pivot, and one less than our
pivot (with values equal to the pivot all on one side or the other but I forget
which); and each partition begins with a sorted prefix.

And recurse.

Now we're beginning to amortise.  Since the prefix is already sorted we don't
need to do that again.  It is half the size, but so long as it's not _too_
small we can still use it.  Otherwise collect a fresh sample and sort that.

That's it.

## the result

Does it work?  Meh.  My implementation is dumb.

The prefix list can offer a fair bit of insight which I didn't try to exploit
because I didn't have a realistic benchmark in which to validate that effort.
Most importantly, is some value grossly overrepresented in the sample?  Maybe
they should be swept to the centre to eliminate them from subsequent
iterations.

And the only metrics I looked at were swaps and compares, and they didn't turn
out great.  A serious implementation would probably break out of STL and resort
to SIMD optimisations and suchlike, and make a proportion of the operations
not-worth-measuring; and I just wasn't going to spend the time on that because
it's not meaningful until the rest of the algorithm has been carefully designed
and tested.

But it's an idea.  With a name.

[plpqsort]: https://github.com/sh1boot/plpqsort
