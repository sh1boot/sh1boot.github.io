---
layout: post
title: Cheap hack for non-circular arc gear design
---
I need some non-circular gears for my [pick-resistant lock][].  There
are a few tools out there, like [Gearotic Motion][] or [Gearify][],
which can do some of the work, but they mostly only support full-cycle
gears with integer ratios.

What I actually want is a pair of arc gears inside a ring with ratios I
don't really care about, but relative centres and radii which I _do_
care about.  The ring just couples one gear to the other while avoiding
other obstacles, and it doesn't have to turn continuously -- just turn
up to a pre-defined limit.

So I figure what I could do when I get around to it is to use whatever
software to design the two periodic gears on the inside, and then just
"cut" the outside gear by rendering those gears as they rotate around
the path I want them to follow, repeatedly overlaid into a bitmap until
the only thing that's left is the material which doesn't bind.  Then I
just extrude and fabricate the bitmap.

I don't care about backlash or noise (60rpm would be very fast) so I can
just erode it a little to make sure it fits.


[pick-resistant lock]: </pick-resistant-lock/>
[Gearotic Motion]: <https://www.gearotic.com/>
[Gearify]: <https://www.gearify.io/>
