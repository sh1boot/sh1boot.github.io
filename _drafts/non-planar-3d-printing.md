---
layout: post
title:  "Non-planar 3D printing"
categories: daft ideas, 3d printing, non-planar
draft: true
---

I got a bit curious about non-planar slicing in 3D printers, but it looks like
comparatively few printers give you clearance to do much.

I don't even own a 3D printer, and I'm afraid to own one because of how much
time it could consume.

Still, I had some random thoughts which I wondered about but am not in a
position to experiment with.  So I'll just write them down on the internet,
which is basically the same thing.

## Egg-crate foam

`z += sin(x) + sin(y)`

### stretch goal: woodgrain

Small variations in height, but variations themselves varying over z axis so
that it gets thinner and thicker as well.

## Injection

Leave tiny voids in the shape of interlocking rings, and squirt filament into
the holes from the top.  This allows the placement of small vertical joins
between layers, knitting them together and hopefully helping to overcome some
of the weakness of poor layer adhesion.

## The rotisserie

Make an adapter to translate the bed movement axis into rotation of the
workpiece.  Then slice the object into concentric cylinders rather than planes.

{% include tinkercad.html id='8goKar9Xfpy' image='https://csg.tinkercad.com/things/8goKar9Xfpy/t725.png?rev=171501996919230100' %}

This change in coordinate system represents a change in overhang constraints.
This should make it possible to print christmas-tree-like overhangs.  The
outline is not restricted to being cylindrical, of course, and the points of
the overhang can be drawn as higher (actually "outer") layers which become
disjoint in cylindrical coordinates.

I'm also wondering if the curving of the layer lines might help with strength.

[simulator]: <https://marlinfw.org/docs/development/boards.html#marlin-simulator>
