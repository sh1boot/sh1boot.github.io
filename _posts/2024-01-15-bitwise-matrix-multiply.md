---
last_modified_at: Tue, 11 Jun 2024 17:41:44 -0700  # 79f5c7a tidy-up-headers-add-descriptions
layout: post
title:  Bit-sliced matrix multiply
description: A rearrangement of a SIMD multiplication instruction which allows efficient implementation of matrix multiplication of less than eight-bit precision.
tags: matrix-multiply bit-slicing low-precision 8-bit
---

There's a matrix multiplication in the middle of a lot of popular things, right
now, and it's an operation which frequently tolerates remarkably low precision.

In the SIMD world precision usually bottoms out at 8-bit.  You don't save much
by trying to get less precise than that, except for marginal savings in how
often you have to mitigate overflows.

But what if you slice one matrix into bitplanes and then you replace
multiplication with a hardware accelerated parallel conditional addition?  You
should be able to fit eight conditional adds into something like the same space
as an 8-bit multiplier (but with fewer result bits), and you can take eight
times as many input rows at once, to compensate for the fact that you're only
doing one eighth of a multiply.

To get the same precision takes eight iterations, over each of the eight planes
of the input, with shifts and adds to merge the results, but you gain the
opportunity to quit after fewer iterations for a proportional saving in overall
run time.

It seems to fit neatly into a SIMD architecture, but I'll have to go into that
detail a bit later on...

TODO: fill all this in.
