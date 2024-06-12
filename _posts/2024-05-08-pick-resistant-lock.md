---
layout: post
title:  "A pick-resistant lock design"
categories: lockpicking, locksport, non-circular gears
draft: true
---

There are a fair few attempts at "unpickable" locks out there, and overall I
don't think I have a great deal to add to the range of pre-existing methods.
But a couple of years ago I thought I might have a go at my own design anyway.

I'll point out up front that there's not a lot of practical use in making locks
harder to pick than they already are.  It's only people who need to hide the
fact that they were there who are going to faff about with picks when they
could just break something to get in.  That limits the market somewhat.

A [pin tumbler lock][] is a plug with a slot cut along it for the key to enter
and displace pins which extend into it from outside.  These pins normally
prevent the plug from turning unless they're all moved to a position where
breaks in the pins align with the shear line where the plug fits in the body of
the lock.

{% include tinkercad.liquid id='hHgAIBifrz6' image='/images/pin-tumbler-lock.png' %}

The basic idea of lock-picking is to apply light torque to the plug and then
poke around with those pins until they get stuck because you've managed to
wiggle one up to that shear line and the plug has moved just enough to catch
it.

A common mitigation is pins with weird shapes that will catch in all the wrong
places, but which don't cause any trouble when they're lifted directly to the
right place with the right key.

Taking this a step further, one can design a lock which captures some kind of
imprint of the profile of the key.  In effect catching anywhere you set it, and
then allowing the cylinder to turn until it's impossible to change the pin any
further, and only then beginning to bind or carry on depending on if the pins
are all set correctly.

And that's where I went.

My design has two plugs.  The first, where the key goes, is a skeleton-key kind
of arrangement.  Each pin is split at every step so that it will always turn.
The second is an inversion of the usual binding test, but it shares the pin
stack with the first plug.

{% include tinkercad.liquid id='9gywpW8cuNV' image='/images/dual-plug-pin-tumbler-lock.png' %}

The trick is to allow the first plug to turn until it has captured a specific
set of pin segments ("master pins"), so they can't be adjusted any longer,
before beginning to turn the second plug.

There are ergonomics problems, here, in how you choose the coupling.  You need
both cylinders to return to the home position at the same time, to free the
pins so the key can come out.  And you can't just have the top plug turn slower
because then you end up turning the bottom plug further than usual, and that
would be hard to use.

So I decided to couple them with non-circular (or at least non-concentric)
gears.  At the home position, where the cylinders are aligned, rapid motion on
the first plug maps to slow motion on the second plug, and then this begins to
accelerate to make up the difference once the first plug is sufficiently
off-axis that it can't be picked any longer.

Here's a set of gears which achieves that (and also avoids the screw holes for
mounting it on a door):
![rear view](/images/dual-plug-pin-tumbler-lock-gears.png)

Where the bottom plug's gear is close to the centre (marked by the hole) it
requires the most travel to effect rotation of the outer gear, and this
corresponds to where the top plug has the opposite arrangement, doubling the
effect.  By the time the bottom plug has turned 180 degrees the relationship is
reversed and both plugs will synchronise again.  This corresponds to the point
where one would normally not need to turn the key any further.

I'm not sure how effective this would be against [bumping][].  It changes the
dynamics somewhat, but not necessarily in a way that would prevent it.  I tried
bumping a prototype and it caused the thin master pins to turn around and jam
the lock, and I had to give things a jolly good wiggle to shake it all back
into place, so maybe that's sufficient.

In my design the pins and springs are standard parts, and the plugs are nearly
standard parts but modified.  I filled the top one with resin and re-drilled
the holes, and then stuck some gears around the back.  But gears with a radius
larger than the plug fails to leave any clearance for the screws, so that'll
have to be re-designed a bit.  I had been waiting for the release of [Gearify
2.0][] in order to be able to design those, but since it was released I haven't
had the free time to actually get started with it.

So far I haven't been able to fabricate anything durable enough to send to an
expert for their feedback.  I'm sure the concept _can_ work but my first
implementation will likely have flaws which result in embarrassing outcomes.

Here's a prototype in action:
{% include youtube.liquid id='6Er67SCnPC8' %}

Also, I'm putting left-handed digital calipers on my Christmas list.  Just so
everyone knows.

[pin tumbler lock]: <https://en.wikipedia.org/wiki/Pin_tumbler_lock#Cylinder_locks>
[bumping]: <https://en.wikipedia.org/wiki/Lock_bumping>
[Gearify 2.0]: <https://www.gearify.io/>

[Tinkercad design]: <https://www.tinkercad.com/things/9gywpW8cuNV-unpickable-lock>
