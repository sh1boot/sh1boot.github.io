---
layout: post
title: LED strip wiring for even light
---
Something you may notice for very long runs of LED strip is that they
can be bright at one end and dimmer at the other.  That's because the
strips are just two long power rails with a bunch of LEDs between them
(typically three or six LEDs in series, and a resistor), and the longer
the power rails get the greater the droop.

But if you happen to be running the strip in a loop, or at least taking
the far end relatively close to the beginning, then there's a simple
fix.  Connect one side of the power supply to the near end of the strip,
and connect the other side of the power supply to the far end of the
strip.  Still connect minus to minus and plus to plus, though.
