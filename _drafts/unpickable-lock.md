---
layout: post
title:  "An 'unpickable' lock design"
categories: lockpicking, locksport
draft: true
---

There are a fair few attempts at "unpickable" locks out there, and overall I
don't think I have a great deal to add to the range of pre-existing methods.
But a couple of years ago I thought I might have a go at my own design anyway.

A [pin tumbler lock][] is a plug with a slot cut along it for the key to enter
and displace pins which extend into it from outside.  These pins normally
prevent the plug from turning unless they're all moved to a position where
breaks in the pins align with the shear line where the plug fits in the body of
the lock.

TODO: diagram (there are so many pre-existing ones, but whatever)

The basic principle of lock-picking is to apply light torque to the plug and
then poke around with those pins until they get stuck because you've managed to
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

I have two plugs.  The first, where the key goes, is a skeleton-key kind of
arrangement.  Each pin is split at every offset so that it will always turn.
The second is an inversion of the usual binding test, but it shares the pin
stack with the first plug.

TODO: diagram

The trick is to allow the first plug to turn until it has captured a specific
set of pin segments ("master pins"), so they can't be adjusted any longer,
before beginning to turn the second plug.

There's an ergonomics problem, here, in choice of loose couplings, in that you
also need both cylinders to return to the home position at the same time, so
pins can move up and down freely so that you can get the key back out.  You
could have something where you have to over-turn it back in the other direction
and then turn it back to centre, but that would be hard to use.

So I decided to do was to couple them with noncircular gears.  At the home
position, where the cylinders are aligned, rapid motion on the first plug maps
to slow motion on the second plug, and then this begins to accelerate once the
first plug is sufficiently off-axis that it can't be picked any longer.  The
acceleration is necessary so that you don't have to turn the key several times
to move the bolt.  That would suck.

TODO: diagram

[pin tumbler lock]: <https://en.wikipedia.org/wiki/Pin_tumbler_lock#Cylinder_locks>
