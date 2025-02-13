---
layout: post
title: Hilbert-ordered image serialisation for power efficiency
---
There's a degree of power efficiency to be derived from having internal
registers in an ASIC change state as infrequently as possible.  That's
why something like a Gray-code counter can be more power efficient than
a regular binary counter even though there's a lot more combinational
logic to count in Gray codes.  You also see things like signed data
being stored as sign-magnitude rather than two's complement because
oscillating around small values with zero crossings would chatter all
the high-order bits in two's complement.

Something that I've seen a fair bit of is where you have a swatch of
image data, and it needs to be sent somewhere else on the chip, but that
transmission is to be spread over multiple clock cycles.  Perhaps as
little as one pixel per clock, or maybe a quad or a 4x4 chunk, or
whatever.  It's natural to serialise that in raster order.

But what if you send it in Hilbert order?  If there's a feature horizon
in the image then many bits have to switch every time that horizon is
crossed.  So perhaps with Hilbert crossing the horizon less often more
bits can be left the same for longer.  Similarly, a gradient has to snap
back to its starting value when it scans back to the beginning of the
line, so that's potentially many bits changing twice per row when they
might otherwise only change once per quadrant or something.

TODO: run some models and count the bit flips.
