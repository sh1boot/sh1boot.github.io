---
layout: post
title:  "Approximate and multiplex"
categories: RTL, optimisation, wip
draft: true
---

A technique I had started to experiment with before the effort got cut short by
other tasks was improving timing of a range coding pipeline, which had an
especially tight dependency loop.

In the middle of it was a fixed-point multiply, where the state was maintained
as a value between 0.5 and 1.0, and incoming symbol probabilities were more
dynamic.

After the multiplication the result needed to be renormalised to 0.5-1.0 again.
This involved a bit scan of several bits and a shift of the resulting offset.

And that was taking too long.

As a general rule a situation like this suggests normalising the incoming
symbol probability to being between 0.5 and 1.0, and then this ensures that the
product will be between 0.25 and 1.0, so the normalisation only has to consider
shifting one bit.  Floating point multiplication works this way inherently.

But this was a bit more complicated.  There was a little extra supporting
arithmetic inside that loop, and the normalisation factor was integral to that
arithmetic.  Notably, this involved discrete arithmetic and precision masking
to emulate the quantisation of the un-normalised arithmetic.

Nevertheless, it turned out that by pre-normalising I could get close enough to
the correct factor that I could just compute the result of the loop for four
different values near my initial estimate, and then do a four-way mux to pick
the estimate that got the right answer (the one that didn't underflow or
overflow).  Each of the guesses could know part of the answer in advance, and
work to that without having to wait, and without adding latency which only
started _after_ the multiplication.

I thought that was a handy thing to know.
