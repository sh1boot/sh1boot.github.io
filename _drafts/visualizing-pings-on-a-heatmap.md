---
layout: post
title: Heatmap-based triangulation
---
Many years ago these little Bluetooth objects tracker gadgets hit the market
(Tile, TrackR, Chipolo, and eventually AirTag), and I began to wonder if it
could be made easier to find them in a messy room, or long grass, or whatever,
doing better than the [RSSI][]-based numerical distance estimate that you'd get
on your phone.

So I thought about heat maps.  The basic idea being that you have a map
representing the local area, and you colour the map according to the
probability of the thing you want being at that location.  Then as you collect
more information you integrate what you're learning into the map.

If you get a signal strength reading then you can deduce that the device is
somewhere within a practically limited range.  Outside of that range the
probability goes to zero and inside it increases.

If you move to another location and you get another ping then you have another
circle, with some radius you can deduce from the signal strength, and when you
integrate both of these into the heat map you now have the intersection of the
two circles as the strongest place to look.  If you move into that area then
the signal strength should increase and you should be able to draw a much
tighter circle.  The more you move the more space you eliminate.

{% include shadertoy.liquid id='lfXfR2' %}

Futher, if you have directional antennae then you don't have to draw circles.
You can draw rays or polar [radiation pattern][] plots based on what you know
about the receiving antenna(e).

I thought maybe a best guess at a mapping from RSSI to distance expressed as a
2D heat map, where the map gave a probability that something returning that
RSSI would be at that position.  This would be _extremely_ approximate.
typically it would be a blurry doughnut, but it might also integrate shadows
like that of the body of the person holding the sensor.

One ping would be worthless but cumulative pings as the sensor moves about
begin to cause some areas of the map to sharpen, showing where best to look.

This was not feasible because the sensor position (mostly just GPS) was too
inaccurate.

It might also have been bad because RSSI is almost entirely noise, but I was
never going to get as far as testing that. 

Later on I revisited the idea as a potential solution to locating the 3D position of individually addressable lights on a Christmas tree.  Reprojecting and fusing multiple views of the tree with different combinations of LEDs lit.

I got a set of images from someone and never did anything with them. I think I still have them.


But these days we have SLAM algorithms for getting much more precise relative sensor position.  so I wonder about revisiting the heatmap concept again.  There's still that big caveat over RSSI as a proxy for distance, but I'm hopeful that that might be self-correcting as many readings accumulated from different positions. 

But I don't hold it much hope for ever finding time to experiment.

[RSSI]: <https://en.wikipedia.org/wiki/Received_signal_strength_indicator>
[radiation pattern]: <[https://en.wikipedia.org/wiki/Radiation_pattern>
