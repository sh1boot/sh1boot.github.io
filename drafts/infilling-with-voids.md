---
layout: post
title: In-filling 3D prints with holes
tags: 3d-printing daft-ideas
---
I've been looking over infill patterns and it struck me that they seem
to be mostly homogenous fills, with a few adaptive patterns, plus
'lightning', but generally without much acknowledgement of the uneven
distribution of stresses through a solid shape.

The first thing I thought to explore was sphere packing.  Fill the solid
with the largest possible spheres, with walls of some meaningful
thickness, then fill the remaining gaps with spheres, etc., to reduce
the fill to a foam and a sort of truss arch bridge in three dimensions
and no particular orientation.

Empty spheres don't 3d-print so well because of the unsupported flat
roof.  This could be built up a bit with internal supports, but one
would not want those supports to be too rigid because this would
undermine the load-distributing properties that suggested a sphere in
the first place.

After a bit of thought about how I would write an in-fill algorithm to
do the maximal sphere thing I realised I could just add some voids and
let the slicer revert to a generic, homogenous fill at the point where I
get bored of doing it by hand.  This would also leave the slicer to
build appropriate walls for the spheres to offset the uneven
distribution of stress from the regular infill.

So I tried that, and the resulting supports were quite expensive.  I
think I would have got better results if lightning could have been used
inside the voids, but technically that's an "external" area and I didn't
seem to have that option.

So, instead, I shaved off the top of the sphere to make it a cone with
30&deg;-ish sides to avoid the need for external supports.  The same on
both ends to avoid extra support on the underside, even though it's
mostly supported by the infill.

This came out looking like an onion.

Trying this in OrcaSlicer's default configuration (15% crosshatch
infill, and some walls and stuff), cutting out the innards of a 100mm
cube, I found that the internal walls were quite expensive, so nine
spheres saved material but only a few percent of print time, while one
sphere sped things up by 11%.

The big question is, would this be meaningfully weaker?  The hope is
that the solid, curved walls of the onion deflect stresses around the
outside, while the infill might yield more and let the walls buckle more
easily.  But I don't know.

Given that I'd already sacrificed the ideal spheroid profile at the top
and bottom, and was just relying on generic curves, my next thought was
that since I was supporting a cube, some kind of 3d squircle would be
able to take up more volume without sacrificing more strength.

It just has to have the curvature to resist buckling, which is a feature
that isn't automatically available on the external shell.

So the next problem would be to figure out how to take a generic 3D
model, and erode it to a continuously-curved void within the original
model.  That and to either compromise the shape to avoid internal
supports, or to find a way of adding the most economical internal
supports.  This internal homonculus would represent the real strength of
the object, with a minimum of infill supporting the gap between that an
the external walls (and forming a sort of truss wall).

But I'm not finding any easy tools to do the erosion.  I can't even find
a 3d squircle!
