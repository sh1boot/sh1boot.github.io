---
last_modified_at: Sat, 3 Aug 2024 21:13:35 -0700  # 3fc1ea7 a-handful-of-drafts
layout: post
title:  Choosing colours which are perceptually distinct
---
A popular technique for picking distinct colours is to advance some
ratio around the hue of HSL or HSV space.  Typically using the golden
ratio as a means of getting optimal distribution of those choices for an
undefined number of iterations.

The golden ratio has this property, for successive integer multiples,
that it always places the next value in a way that subdivides the
largest empty interval into two golden-ratio-ed pieces.  Sometimes there
are many equally-sized intervals, and in that case the interval it picks
is also distributed in a similar way of breaking runs of largest
intervals into smaller runs by the same ratio.  This makes for a very
even fill when you don't know in advance how many points you'll add.

This was _not_ working well for me using HSV or HSL.  My feeling was
that I would see several very similar colours before seeing another
colour that was much more distinct.

Upon further investigation it looked like moving from HSV to OKLCh would
distribute things more evenly in a perceptual space.

However, this tends to go out-of-gamut, and the policy for bringing
thing in-gamut is currently not well defined, the existing guesses don't
do anything helpful, and the raging debates about how to define it well
don't look like they'll head anywhere helpful either.

TODO: discuss gamut mapping, very briefly.

But as well as that, spinning around hue is overlooking a degree of
freedom which should be exploited.

So this brings us to "how do we do this even distribution thing in two
dimensions?".  Which is a thing that's troubled me for years.

The solution (strictly, "a" solution, but I wouldn't seriously
contemplate any other at this stage) is a [generalisation][quasirandom
sequences] on the golden ratio technique.

What that boils down to is that in two dimensions you add
(0.7548776662, 0.5698402910) to your coordinate, mod 1 in each axis, you get
the same regular coverage as with &phi; mod 1 in the 1D case.

But there are issues.  That first coordinate is too close to 0.75, which
means it appears to cycle between four points with a slow precession.

Why is that?

Well, aside from the fact that we can see it's _obviously_ close to
0.75, something else that stands out about it is that when expressed as
a continuing fraction it's 1,3,12,... and 12 is a really big number;
compared to phi, which is 1,1,1,1,... (this is how it earns the title
"most irrational number".

Anyway, as I see it, if you're red-green colourblind, and OKLab is
arranged so that your colourblindness runs along one axis, then you're
going to be stuck examining only the other axis, and you don't want that
to be restricted to four clusters of very similar values.


[opponent process]: <https://en.wikipedia.org/wiki/Opponent_process>

[quasirandom sequences]: <https://extremelearning.com.au/unreasonable-effectiveness-of-quasirandom-sequences/>

[shadertoy demo]: <https://www.shadertoy.com/view/MXdGR7>
[stack exchange version]: <https://math.stackexchange.com/questions/2360055/combining-low-discrepancy-sets-to-produce-a-low-discrepancy-set>
[OKLab]: <https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklab>
