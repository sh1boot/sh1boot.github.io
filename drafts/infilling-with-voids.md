---
layout: post
title: In-filling 3D prints with holes
tags: 3d-printing daft-ideas
---
I got to thinking about 3d printing infill the other day, and after a
few iterations I got to a point of thinking that there should be ways of
cutting large solid chunks out of the middle, rather than in-filling
with an homogenous sparse pattern, and retaining some or all of the
original strength of the homogenous fill.

My hypothesis: it's possible to replace a proportion of the infill with
a sphere with stiff walls and no fill, at no extra cost in print time or
strength.

Why a sphere?  Well, that's the mathematical ideal.  You can't print a
sphere without something inside to support the roof, and maybe floor,
while it's printing, so we've failed already.  Oh no!

Also, the continuous features of a sphere don't really apply when it's
sliced into layers. It will have a different strength profile in
different directions.

So spheres are obviously not ideal at all.  But lots of things won't be
ideal, here.  Let's start compromising!

First, to actually get a sphere it would need to have some kind of
internal support structure.  Ideally this support structure would _not_
be strong.  This is because a strong support undermines the natural
distribution of forces we're trying to get from a sphere.

I'm no civil engineer but I have played Bridge Builder Game, and I know
that if you make one part too strong you can force other parts to fail
because they then get all the stress.

Ignoring that problem, I tried to get [OrcaSlicer][] to add whatever it
thought appropriate to support the roof of a sphere.  Because my sphere
was a void inside of a cube it was technically an external support, and
it give me this tree-like thing made of rings, which added a lot to the
print time.

I think the ideal would have been [Lightning][], but I didn't see that
as an option for external support.  I guess it would deface the print if
it were used as an external support, but my "external" is actually
internal to the object.  Another caveat is you probably wouldn't want a
deliberately flimsy printing support to break off and rattle around
inside the model.

So I stopped messing about with that, and made a different shape which
loosely approximated a sphere but tapered to points at each end.  The
so-called "fusiform".  But it looked to me like an onion:

{% include tinkercad.liquid id='43k3a2lx2MD' image='/images/infill-onion-void.png' %}

I think the tapers should be less than 30&deg; overhang, but OrcaSlicer
disagreed and only stopped adding supports when I lowered the threshold
to 27&deg;, but I figured it was a rounding error and I just switched
supports off and assume my effort was good enough.

This shape is at least circular in one axis, meaning that it should be
resistant to buckling.  It comes to a point at the top and bottom, but
those are singularities, and are supported by the surrounding material,
and hopefully that's good enough.

With OrcaSlicer's default settings (15% crosshatch infill, and some
walls and stuff) the cost of the onion's walls inside of a 10cm cube
approaches the cost of the infill it replaces.  It's less material but
only about 10% less time.

The big question, though, is is it as strong or stronger?

Well, I don't know!  I don't have a 3D printer, and I don't have the
means to test it scientifically, and there are a lot of different
ways to define "stronger".  This is all theoretical.

I also tried adding extra, smaller onions in the corners to eat up more
volume.  It only made things worse -- wall thickness remaining constant,
wall area reducing, but enclosed volume becoming smaller faster.

In order to make myself look more clever I changed the infill
configuration to use more expensive infill.  Presumably stronger, and
still relevant -- maybe more relevant -- when there's a huge hole in the
middle.

The next step is to try to increase the volume of the void without
deviating too much further from our spherical ideal.  Enter, the
[Sphube][]!  You might be more familiar with the [squircle][], and this
is just a 3D extension on that idea.

These squircles and hypersquircles have the benefit of being continous
curves, and so can be more resistant to buckling than a cube would be.
That makes them a more viable [monocoque][] than a cube would.

What we're looking at in the general form would be some kind of
monocoque approximation of the real model -- a rigid empty shell -- and
on top of that we build up using a practical in-fill pattern, and on top
of that we build the desired outer shape of the model.  This
construction should work like a [truss arch bridge], with the infill
acting as truss, the monocoque providing the arch(es), and the external
model being the road surface people drive across.

But I don't immediately have the means to convert an arbitrary model to
its eroded, curved form.  I tried searching for model erosion and mostly
just found ways to make things look weathered.

But I do at least know how to erode a square down to a squircle.  That's
what's known in shader land as a `smoothmin()`.  As in "we're inside the
squircle if smoothmin(abs(dx), abs(dy)) < r".

If you imagine using `min()` in place of `smoothmin()` then that would
give you a square boundary.  And if you replaced min() with `sqrt(dx^2 +
dy^2)` then a circle.  `smoothmin()` falls somewhere in between,
because, fun fact, both of these functions are special cases of the
[generalised mean][], and `smoothmin()` implements that generalisation
with a parameter in a nice-looking spot.

Unfortunately I don't have an immediately accessible way to create a 3D
model of a sphube. And if I did it wouldn't work anyway, because of the
overhang problem, and my lack of access to an "external" lightning fill.

So back to the comprimeses I go...


[OrcaSlicer]: <https://www.orcaslicer.com/>
[Lightning]: <https://www.orcaslicer.com/wiki/print_settings/strength/strength_settings_patterns#lightning>

[onion]: <https://www.tinkercad.com/things/43k3a2lx2MD-funky-hango-stantia>
[onion-pic]: </images/infill-onion-void.png>

[squircle]: <https://en.wikipedia.org/wiki/Squircle>
[Sphube]: <https://en.wikipedia.org/wiki/Sphube>
[generalised mean]: <https://en.wikipedia.org/wiki/Generalized_mean>

[monocoque]: <https://en.wikipedia.org/wiki/Monocoque>
[truss arch bridge]: <https://en.wikipedia.org/wiki/Truss_arch_bridge>
