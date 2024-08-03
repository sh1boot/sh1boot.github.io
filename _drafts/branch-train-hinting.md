---
layout: post
title:  Hinting train of branch directions in advance
categories: pipeline optimisation, branch prediction
draft: true
---
Long ago I had to do a scaling operation which would yield a slightly stream of
branch decisions based on whether or not a row pointer should advance and the
subsequent row recalculated.  I decided to try to calculate the branch
decisions in advance, and shift them into a shift register and then to branch
on the lesat significant bit of that register and then do a right-shift to schedule the next branch decsion.  I think the code is in AOSP somewhere.

It had no effect.  Of course.

But it made me wonder; if branches are predicted based on a bitmap of past branch decisions, then perhaps it would be possible to provide the hint in the form of a branch that doesn't go anywhere so that it doesn't matter if the prediction is right or wrong?

I did a test, and it didn't work.
