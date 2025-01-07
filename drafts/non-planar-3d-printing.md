---
last_modified_at: Tue, 11 Jun 2024 17:41:44 -0700  # 1ae3ec2 update-images
layout: post
title:  Why I should never buy a 3D printer
tags: daft-ideas 3d-printing non-planar
draft: true
---
Materials science and engineering fascinate me, but I know absolutely
nothing about the fields.  Between that and the fact that there's so
much YouTube content on 3D printing, it's inevitable that I'm going to
end up watching some of it; and one thing that's stuck with me (so to
speak) is the problem of getting better adhesion between layers.

So I thought about it.  Inside my own entirely unqualified head.  And
it's left me with so many things I want to try that I'm now too afraid
to buy a 3D printer because I can see how it would absorb my entire life
and leave me unemployed and homeless.  Presumably living in a cardboard
box with custom-shaped PLA patches covering the holes where the rain
gets in and begging on the side of the street for any spare filament
passersby might have on them.

So let me just post all my ideas on the internet where they can ruin
somebody else's life instead of mine.

## Egg-crate foam

`z += sin(x) + sin(y)`

{% include geogebra.liquid id='3d/n6fdxwmg' %}

By warping the slicing this way the filament has to follow wave patterns
and this eliminates continuous shear lines and it increases the contact
area between layers because those wavy beads are much longer.

### stretch goal: woodgrain

Small variations in height, but variations themselves varying over z axis so
that it gets thinner and thicker as well.

## Weaving

While you can't do fundamental over-under weaving; consider the way
string is wound onto a spool in a helical winding pattern which gives it
that herringbone finish. That's _kind of_ a weave, right?  I think this
can be unwound to a flat surface, or laid out in a flat ring, but I
haven't fully thought through what it does to shear lines.  That's
probably a thing I could experiment with without using a 3D printer.

## Helical beads

Rather than printing straight, smooth beads, it may be productive to
roughen the surface so as to improve adhesion for the next layer.  This
might be done by jiggling the print head back and forth subtly while
it's drawing a notionally-straight bead, or perhaps by tracing a sort of
skewed helix, giving the sort of finish you get from arc welding.

The localised movement and reduced progress of the print head and the
extra manipulation might also help to heat and massage the filament into
the layer below at the same time as producing a rougher surface for the
next layer to bind to.

## Injection

Leave tiny voids in the shape of interlocking rings, and squirt filament into
the holes from the top.  This allows the placement of small vertical joins
between layers, knitting them together and hopefully helping to overcome some
of the weakness of poor layer adhesion.

It might be possible to do this a bit better by pausing to raise the
temperature of the filament above normal printing temperature.  Some of
the problems will not be applicable in this injection case, and the
extra fluidity and extra time before setting will help with penetration.
Also, if the filament is especially fluid then it may squeeze into the
gaps between layers and form spurs which make it harder to pull out.

## The rotisserie

Make an adapter to translate the bed movement axis into rotation of the
workpiece.  Then slice the object into concentric cylinders rather than planes.

{% include tinkercad.liquid id='8goKar9Xfpy' image='/images/cylindrical-3d-printer.png' %}

This change in coordinate system represents a change in overhang constraints.
This should make it possible to print christmas-tree-like overhangs.  The
outline is not restricted to being cylindrical, of course, and the points of
the overhang can be drawn as higher (actually "outer") layers which become
disjoint in cylindrical coordinates.

I'm also wondering if the curving of the layer lines might help with strength.

[simulator]: <https://marlinfw.org/docs/development/boards.html#marlin-simulator>


## and another thing

I wonder if flux could be a thing the way it is with soldering.  Some
kind of solvent emedded in the filament which helps etch the previous
layer of filament and spread some heat around or raise the heat capacity
temporarily to improve adhesion before evaporating or flowing out of the
way.
