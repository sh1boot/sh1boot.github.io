---
last_modified_at: Sat, 3 Aug 2024 21:13:35 -0700  # 3fc1ea7 a-handful-of-drafts
layout: post
title:  Running all cells of a battery completely flat
---
I've long felt like it shouldn't be so hard for electronics to run their
batteries completely flat before acting weird, and to be able to support
a mixture of different battery conditions without risk of leaks or
explosions.

Typically cells are stacked in series so that they can produce a higher
voltage, more suitable to the sorts of loads in the electronics they
power, but in this arrangement the cells have to be approximately
balanced in their chemistry and charge.  If there's an outlier, like a
partially flat cell, then there's a risk that the other cells and the
load will conspire to reverse charge that cell, and then things get
messy.

So you end up throwing cells away because they're not part of a set.  Or
you end up throwing equipment away because they're full of weird
chemicals and corroded contacts from leaked batteries.

But DC-DC converters are a thing, now, and we could surely have a chip
which does the voltage boost on its own, and which could cyclically
drain whichever cell(s) have the most to give, until they're all
properly drained.
