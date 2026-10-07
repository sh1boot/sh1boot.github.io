---
layout: post
title: A turntable for 3D printing filament
tags: 3d-printing
---
If you've ever used two-colour filament in 3D printing you may have
noticed that it can look kind of lop-sided where smooth faces come out
all the same colour on the same side, like it's been left on a
windowsill for too long and become sun-bleached.

I thought it might be interesting to try adding a continuous twist to
the filament as it was extruded, so that the face that came out all that
one colour would rotate around the object as it was printed.

So I made a turntable for a filament spool which rotates as filament is
drawn out of it:

{% include tinkercad.liquid id='3CGJnlPo1tm' image='/images/filament-turntable.png' %}

And I printed a giant Lego fish with it:

![Twisted filament print](/images/twisted-print.jpg)

It did not come out as I expected.

First, after I realised my first test was too small and my gear ratio
was too low, I fixed both things at once and overshot by a long way.
That's fixable, but it's not a thing I'm motivated to do until..

Second, the rotation seems to slow down at a point and then snap over to
a fresh angle all of a sudden.  My guess is that the reason for this is
because the filament comes off the spool with a curve in it, and it is
fed into a tube which also has a curve in it, and I think what happens
is that those curves try to stay in agreement for as long as they can,
reflecting the twist back in the other direction around the spool
instead, until they give up and snap into their new orientation.

I figure I could maybe mitigate that with a hairdryer, or something, to
soften the filament, but I don't like the idea of leaving
dubiously-rigged heaters unattended for long periods of time.  So I
probably won't get around to experimenting further.

The next plan is to try winding the twisted filament onto another spool,
where it can relax into its new shape and hopefully distribute the twist
more evenly along itself as it does so.  Then I can see what kind of
result I get from that.

If I ever get around to that.
