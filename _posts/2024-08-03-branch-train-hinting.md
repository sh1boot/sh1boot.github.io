---
last_modified_at: Tue, 7 Jan 2025 14:30:48 -0800  # 5d3af96 a-tagging-system
layout: post
title:  Hinting train of branch directions in advance
tags: computer-architecture branch-prediction
draft: true
---
Long ago I had to do a scaling operation which would yield a stream of
branch decisions based on whether or not a row pointer would advance and
need the subsequent row to be recalculated.  I decided to try to
calculate the branch decisions well in advance, and shift them into a
shift register and then to branch on the least significant bit of that
register and then do a right-shift to schedule the next branch decsion.
I think the code is in AOSP somewhere.

It had absolutely no effect.  Of course.

But if branches are predicted based on a bitmap of past branch
decisions, then perhaps it's possible to provide the hint in the form of
a branch that doesn't go anywhere?  That is, so the instruction stream
is the same regardless of whether the prediction is right or wrong.
That means the instructions that followed were still correct, so they
needn't be discarded, regardless of whether the prediction was correct
or not.

Well actually no, because even if there were no instructions to discard
that pipeline flush opens a window in which the branch prediction and
associated logic can put itself right.  It could be complicated to
exploit go-nowhere branches to elide the pipeline flush but still update
the prediction logic, with clearly no benefit because who would ever
write such code?

But I did it anyway, and of course that didn't work.  However, even
though the "hint" branch still led to a pipeline flush, it did
successfully inform the dependent branch that always takes the same
decision as the hint.

So I'm left wondering; is there an opportunity to place the hint in a
part of a loop where the IPC is lowest (where there are already the most
stalls), so that the fewest possible instructions get cancelled, or
where the cancelled operations still have useful side effects like
priming caches (is that still legal?) for faster execution on the
correct path?

I don't have a situation I can think of where I could apply that right
now.
