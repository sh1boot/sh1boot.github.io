---
layout: post
title: Heatmap-based triangulation
---
Many years ago these little Bluetooth objects tracker gadgets hit the market
(Tile, TrackR, Chipolo, and eventually Apple AirTag), and I began to wonder if
it could be made easier to find them in a messy room, or long grass, or
whatever, doing better than the [RSSI][]-based numerical distance estimate
that you could get on your phone.

So I thought about heat maps.  The basic idea being that you have a map
representing the local area, and you colour the map according to the
probability of the thing you want being at that location.  Then as you collect
more information you integrate what you're learning into the map.  Strictly
you multiply it, as the product of probabilities based on different
measurements.

If you get a signal strength reading then you can deduce that the device is
somewhere within a practically limited range.  Outside of that range the
probability falls to zero and inside it is higher.  If the strength is low you
may deduce that it is further away than if it is strong, but that's a less
confident determination because there are other reasons for weak signal.  So
as a basic approximation you draw a Blurry Doughnut of Confidence&tm;, but
I'll just call it a circle.

If you then move to another location and you get another ping then you have
another circle, with some radius you can deduce from the signal strength, and
when you integrate both of these into the heat map you now have the
intersection of the two circles as the strongest places to look.  If you move
nearer to one of those areas then the signal strength should increase and you
should be able to draw a much tighter circle, or maybe you went to the wrong
intersection and the circle will be larger and reinforce the other
intersection.  Either way, the more you move the more space you eliminate.

Of course, if you have directional antennae then you don't have to draw
circles.  Or you might make a similar deduction if you know there's a sack of
wet flesh standing next to your radio (I'm looking at you, human phone users).
You can draw rays or polar [radiation pattern][] plots based on what you know
about the receiving antenna(e) and local terrain.

Both of these you can play with in this shader, by clicking around the texture
and pressing some keys:
{% include shadertoy.liquid id='lfXfR2' %}
* **Space** clear the screen and start again
* **Tab** switch between distance and direction estimates
* **P** toggle display of ping origins (O) and target (X)
* **C** toggle display of contour lines
* **W** toggle between black and white contour lines

For all of that musing, this was not actually feasible at the time because the
sensor position (mostly just GPS) was too inaccurate.  It might also have been
bad because RSSI is almost entirely noise, but I was never going to get as far
as testing that. 

Later on I revisited the idea as a potential solution to locating the 3D
position of individually addressable lights on a Christmas tree by using a
series of photographs from different angles and with different lights lit.
I meant to reproject and fuse multiple views of the tree with deviation from
the baseline representing confidence that a given LED was under that pixel,
and across multiple projections deduce the full XYZ coordinate.

I got a set of images from someone and never did anything with them. I think I
still have them somewhere.

But these days we have SLAM algorithms for getting much more precise relative
sensor position.  so I wonder about revisiting the heatmap concept again.
There's still that big caveat over RSSI as a proxy for distance, but I'm
hopeful that that might be self-correcting as many readings accumulated from
different positions. 

But I don't hold it much hope for ever finding time to experiment.

[RSSI]: <https://en.wikipedia.org/wiki/Received_signal_strength_indicator>
[radiation pattern]: <[https://en.wikipedia.org/wiki/Radiation_pattern>
