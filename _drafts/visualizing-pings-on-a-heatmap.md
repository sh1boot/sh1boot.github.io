---
layout: post
title: Heat-map-based triangulation
---
Many years ago these little Bluetooth objects tracker gadgets hit the market, and. I began to wonder about how to find them in a messy room, or long grass, or whatever.

I thought maybe a best guess at a mapping from RSSI to distance expressed as a 2D heat map, where the map gave a probability that something returning that RSSI would be at that position.  This would be _extremely_ approximate.  typically it would be a blurry doughnut, but it might also integrate shadows like that of the body of the person holding the sensor.

One ping would be worthless but cumulative pings as the sensor moves about begin to cause some areas of the map to sharpen, showing where best to look.

This was not feasible because the sensor position (mostly just GPS) was too inaccurate.

It might also have been bad because RSSI is almost entirely noise, but I was never going to get as far as tasting that. 

Later on I revisited the idea as a potential solution to locating the 3D position of individually addressable lights on a Christmas tree.  Reprojecting and fusing multiple views of the tree with different combinations of LEDs lit.

I got a set of images from someone and never did anything with them. I think I still have them.


But these days we have SLAM algorithms for getting much more precise relative sensor position.  so I wonder about revisiting the heatmap concept again.  There's still that big caveat over RSSI as a proxy for distance, but I'm hopeful that that might be self-correcting as many readings accumulated from different positions. 

But I don't hold it much hope for ever finding time to experiment.