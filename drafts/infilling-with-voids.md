---
layout: post
title: In-filling 3D prints with holes
tags: 3d-printing daft-ideas
---
I got to thinking about 3d printing infill the other day, and eventually
I decided that there should be ways of scooping large chunks out of the
middle, rather than in-filling with an homogenous sparse pattern, and
retaining some or all of the original strength of the homogenous fill.

My hypothesis: it must be possible to replace a proportion of the infill
with a sphere with stiff walls and no fill, at no extra cost in print
time or strength.

Why a sphere?  Well, that's the mathematical ideal.  Unfortunately you
can't print a sphere without something inside to support the roof (and
maybe floor) while it's printing.  Also, the continuous symmetry of a
sphere doesn't really apply when it's sliced into layers.

So spheres are obviously not ideal at all.  But lots of things won't be
ideal, here.  Let's start compromising!

First, the sphere's internal support.  Ideally this support structure
would _not_ be too rigid.  This is because a rigid support undermines
the even distribution of forces we're trying to get from a sphere.  I'm
no civil engineer but I have played Bridge Builder Game, and I know that
if you make one part too strong you can force other parts to fail
because they then get all the stress.

Ignoring that problem, I tried to get [OrcaSlicer][] to add whatever it
thought appropriate to support the roof of a sphere.  Because my sphere
was a void inside of a cube it was technically an external support, and
it gave me this tree-like thing made of rings, which added a lot to the
print time.

I think the ideal support would have been [Lightning][] but I didn't see
that as an option.  I guess it would deface the print if it were used as
an external support, but my "external" is actually internal to the model
and I won't be trying to remove it.  Another caveat there is you
probably wouldn't want a deliberately flimsy printing support to break
off and rattle around inside the model at some later point.

So I stopped messing about with that and made a different shape which
loosely approximated a sphere but tapered to points at each end.  The
so-called "fusiform".  It looks to me like an onion:

{% include tinkercad.liquid id='43k3a2lx2MD' image='/images/infill-onion-void.png' %}

I think the tapers should be better than 30&deg; overhang, but OrcaSlicer
disagreed and only stopped adding supports when I lowered the threshold
to about 27&deg;.  I figured it was a rounding error and I just switched
supports off and assume my effort was good enough.

This shape is at least circular in one axis, meaning that it should be
resistant to buckling.  It comes to a point at the top and bottom, but
unlike a bridge those points are points on a 2D plane supported all
around by thicker material, and hopefully that's good enough.  Plus I
have a few millimetres clearance before hitting the outside wall, with
infill to spread that load (don't try that excuse when building a
bridge!).

[download STL][onion-test]

With OrcaSlicer's default settings (15% crosshatch infill, and some
walls and stuff) the cost of the onion's walls inside of a 10cm cube
approaches the cost of the infill it replaces.  It's less material but
only about 10% less time.

In order to make myself look more successful I changed the infill
configuration to use more expensive infill.  Presumably stronger infill, and
still relevant -- maybe more relevant -- when there's a huge hole in the
middle.

| 10cm cube       |15% c/hatch|30% c/hatch|15% cubic|20% cubic|20% gyroid|
|-----------------|-----------|-----------|---------|---------|----------|
| Filament, solid | 78.63m    | 133.39m   | 79.15m  | 98.45m  | 94.99m   |
| Filament, onion | 66.77m    | 100.35m   | 66.12m  | 77.91m  | 76.47m   |
| Time, solid     | 7h19m     | 12h46m    | 5h28m   | 6h38m   | 11h57m   |
| Time, onion     | 6h28m     | 10h08m    | 5h26m   | 6h14m   |  9h21m   |

I also tried adding extra, smaller onions in the corners to eat up more
volume, but it only made things worse -- wall thickness remaining
constant, wall area shrinking, but enclosed volume shrinking much
faster.  So nevermind that; but it did highlight that I should test a
smaller cube, and I did that instead.

| 5cm cube        |15% c/hatch|30% c/hatch|15% cubic|20% gyroid|30% gyroid|
|-----------------|-----------|-----------|---------|----------|----------|
| Filament, solid | 12.11m    | 18.62m    | 12.02m  | 13.94m   | 18.19m   |
| Filament, onion | 11.80m    | 15.45m    | 11.49m  | 12.70m   | 15.11m   |
| Time, solid     | 1h20m     | 2h00m     | 1h07m   | 1h50m    | 2h36m    |
| Time, onion     | 1h24m     | 1h50m     | 1h16m   | 1h41m    | 2h08m    |

The big question, though, is is it as strong as or stronger than the
homogenous infill?

Well, I don't know!  I don't have a 3D printer, and I don't have the
means to test it scientifically, and there are a lot of different
ways to define "stronger".  This is all abstract and theoretical.

The next step is to try to increase the volume of the void without
deviating too much further from our spherical ideal.

Enter, The [Sphube][]!

You might be more familiar with the [squircle][], and this is just a 3D
extension on that idea.  These squircles and hypersquircles have the
benefit of being continous curves, and so should be a bit more resistant
to buckling than a flat-faced cube would be.  That makes them a more
viable [monocoque][].

What we're looking at in the general form would be some kind of
shrunken, rounded monocoque approximation of the real model -- a rigid
empty shell -- and on top of that we build up using a practical in-fill
pattern, and on top of that we build the desired outer shape of the
model.  This construction should work like a [truss arch bridge], with
the infill acting as truss, the monocoque providing the arch(es), and
the external model being the road surface people drive across.

The down-side is that trusses add tensile stress (where steel excels,
but 3D prints do not), which means that layer adhesion becomes a much
more concerning factor.  Maybe that's why this isn't a standard approach
already.

But that's really the big idea, here.  Make all the walls into trusses
with the underside of the truss being a strong monocoque which resists
compression by being wholly convex.

Right now I don't have the means to convert an arbitrary model to
its eroded, curved form.  I tried searching for model erosion tools and
mostly just found ways to make things look weathered.

But I do at least know how to erode a square down to a squircle.  That
can be done with something like a [`smoothmax()`][smoothmax], or a
[generalised mean][] of x and y coordinates.  As in "we're inside the
squircle if `smoothmax(abs(dx), abs(dy)) < r`".

If you imagine using `max()` in place of `smoothmax()` then that would
give you a square boundary.  And if you replaced `max()` with
`sqrt(dx^2 + dy^2)` then a circle.  `smoothmax()` and generalised mean
can pick functions somewhere in between, with a parameter that allows them
to express both.

After a bit of digging I found a [simple way][sdflab] to get from those
simple equations to an .STL file.

[STL sphubes][sphubes-stl] ([lower-resolution versions][sphubes-lowres-stl])

But as we learned with the sphere, this isn't going to work because of
the roof problem, and my lack of access to an "external" lightning fill.
Now it's a bit worse because that roof is wider.

So back to the compromises I go...


[OrcaSlicer]: <https://www.orcaslicer.com/>
[Lightning]: <https://www.orcaslicer.com/wiki/print_settings/strength/strength_settings_patterns#lightning>

[onion-test]: </blobs/cube-minus-onion.stl>
[sphubes-stl]: </blobs/sphubes.tar.xz>
[sphubes-lowres-stl]: </blobs/sphubes_lowres.tar.xz>
[onion]: <https://www.tinkercad.com/things/43k3a2lx2MD-funky-hango-stantia>
[onion-pic]: </images/infill-onion-void.png>

[sdflab]: <https://github.com/fogleman/sdf>
[squircle]: <https://en.wikipedia.org/wiki/Squircle>
[Sphube]: <https://en.wikipedia.org/wiki/Sphube>
[generalised mean]: <https://en.wikipedia.org/wiki/Generalized_mean>
[smoothmax]: <https://iquilezles.org/articles/smin/>
[monocoque]: <https://en.wikipedia.org/wiki/Monocoque>
[truss arch bridge]: <https://en.wikipedia.org/wiki/Truss_arch_bridge>
