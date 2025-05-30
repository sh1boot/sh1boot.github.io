---
last_modified_at: Wed, 9 Apr 2025 12:42:57 -0700  # 7036f88 clarify-stochastic-sorting
layout: post
title: stochastically ordering items by frequency
tags: statistics stochastic-methods needs-example
---

If you believe your histogram, when sorted, will fit a particular curve,
then, like stochastic counters which conditionally increment based on a
probability suitable to the conditions, you could perform stochastically
filtered swaps to conditionally promote items up the list based on a
probability.  I guess the theory includes a flat probability but I don't
see the point in that.

This allows you to keep a much more dense representation of the
histogram of your data (one assumes storing counts would be very
large, which is why you're optimising this), and it means that
you can edit it less frequently.  Less housekeeping, less dirty
cache, less eviction, less memory bandwith, less coherency
contention.

What you need to keep is a list of keys (or key indices), and a
list of indices into that list saying where each key occurs.
Given a new key you find its index and from that and the total
count you decide [probabilistically] whether or not you're going
to do a swap.  If you do decide to do a swap then you swap
that key with the next one in the list and update both their
indices.

Or you can do the same thing in a doubly-linked list, if that
works better (it depends on your data representations).


I think there's probably a generalisation in here for performing other
operations predicated on a statistical model of how often they're
expected to happen with a view to coming out with a data structure in
the same approximate shape as would be given by a more rigorous but
costly analysis, but I can't think of any other good examples right now.
