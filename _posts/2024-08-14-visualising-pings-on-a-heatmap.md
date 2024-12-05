---
last_modified_at: Thu, 7 Nov 2024 09:31:26 -0800  # 5086daa heatmap-tweak
layout: post
title: Heatmap-based triangulation
---
About ten years ago a bunch of these little Bluetooth "[key finder][]"
gadgets hit the market (eg., [Tile][], [TrackR][], [Chipolo][], and
eventually [AirTag][]), and after thinking about how much use they'd be I
began to wonder if it could be made easier to find them in a messy room, or
long grass, or whatever, doing better than the [RSSI][]-based numerical
distance estimate that you could get on your phone.

Before I give the impression of any kind of endorsement; as handy as these
devices might seem, there are significant privacy considerations[^1].

So I thought about heat maps.  The basic idea being that you have a map
representing the local area, and you colour the map according to the
probability of the thing you want being at that location.  Then as you collect
more information you integrate what you're learning into the map.  Strictly
you multiply the new information into the map -- the product of probabilities
based on different measurements -- but you can do all that in the log domain
and use addition instead.  And it's clearer to plot the log of such small
numbers anyway.

If you get a signal strength reading then you can deduce that the device is
somewhere within a practically-limited range.  Outside of that range the
probability falls to zero and inside it is higher.  If the strength is low you
may deduce that it is further away than if it is strong, but that's a less
confident determination because there are other reasons for weak signal.  So
as a basic approximation you draw a blurry Doughnut of Confidence&trade;, but
I'll just call it a circle.

Now if you move to another location and get another ping then you have another
circle, with some radius you can deduce from the signal strength, and when you
integrate both of these into the heat map you now have the intersection of the
two circles as the strongest places to look.  If you move nearer to one of
those areas then the signal strength should increase and you should be able to
draw a much tighter circle, or maybe you went to the wrong intersection (there
should be two of them at this stage) and the circle will be larger and
reinforce the other intersection.  Either way, the more you move the more space
you eliminate.

Of course if you have directional antennae then you don't have to draw circles.
Or you might make a similar deduction if you know there's a sack of wet flesh
standing next to your radio (Yes, you, human!  You're casting a shadow!).  You
can draw rays or polar [radiation pattern][] plots based on what you know about
the receiving antenna(e) and local environment.

Both simple rings and rays you can play with in this shader, by clicking around
the texture and pressing some keys:
{% include shadertoy.liquid id='lfXfR2' %}
* **Space** clear the screen and start again
* **Tab** switch between distance and direction estimates
* **P** toggle display of ping origins (O) and target (X)
* **C** toggle display of contour lines
* **W** toggle between black and white contour lines

But for all of that musing, this was not actually feasible at the time because
the sensor position (mostly just GPS) was too inaccurate.  It might also have
been bad because RSSI is almost entirely noise, but I was never going to get as
far as testing that. 

Later on I revisited the basic heat map idea as a potential solution to
locating the 3D position of individually addressable [lights on a Christmas
tree][] by using a series of photographs from different angles and with
different lights lit.  I meant to reproject and fuse multiple views of the tree
with deviation from the baseline representing confidence that a given LED was
under that pixel, and across multiple projections deduce the full XYZ
coordinate.

I got a set of images from someone and never did anything with them. I think I
still have them somewhere.

But these days we have [SLAM] algorithms for getting much more precise relative
sensor position.  so I wonder about revisiting the heat map concept again.
There's still that big caveat over RSSI as a proxy for distance, but I'm
hopeful that that might be self-correcting as many readings accumulated from
different positions. 

But I don't hold it much hope for ever finding time to experiment.

[^1]: I offer no link because no one link will cover everything.

[RSSI]: <https://en.wikipedia.org/wiki/Received_signal_strength_indicator>
[SLAM]: <https://en.wikipedia.org/wiki/Simultaneous_localization_and_mapping>
[radiation pattern]: <[https://en.wikipedia.org/wiki/Radiation_pattern>
[lights on a Christmas tree]: <https://github.com/standupmaths/xmastree2020>

[Key finder]: <https://en.wikipedia.org/wiki/Key_finder>
[Chipolo]: <https://chipolo.net/>
[TrackR]: <https://en.wikipedia.org/wiki/TrackR>
[Tile]: <https://www.tile.com/>
[AirTag]: <https://www.apple.com/airtag/>
