---
layout: post
title:  Choosing colours which are perceptually distinct
---
A popular technique for picking distinct colours is to advance some ratio
around the hue of HSL or HSV space.  Typically using the golden ratio as a
means of getting optimal distribution of those choices for an undefined number
of iterations.

I wasn't having much luck with that.  My feeling was that I would see several
very similar colours before seeing another colour that was much more distinct.  So I tried extending that into two dimensions.

How to do that is a thing I've wondered about for a few years.  The solution
(strictly, "a" solution, but I wouldn't seriously contemplate any other at this
stage) is a [generalisation][quasirandom sequences] on the golden ratio
technique.

What that boils down to is that in two dimensions you add
(0.7548776662, 0.5698402910) to your coordinate, mod 1 in each axis, you get
the same regular coverage as with &phi; mod 1 in the 1D case.

This I wanted to apply in a colour space which separates luma from a pair of
values describing the hue and saturation.  Like YCrCb, or [OKLab][].

It hasn't gone well.  My experiments with OKLab were dominated by blues.

Another possibility was [opponent process][], which effectively gives a plane
four edges, red opposite green, and yellow opposite blue.  I'm sure this is the
right way, and there's something else I'm doing wrong in the way that I apply
it.

[opponent process]: <https://en.wikipedia.org/wiki/Opponent_process>

[quasirandom sequences]: <https://extremelearning.com.au/unreasonable-effectiveness-of-quasirandom-sequences/>

[shadertoy demo]: <https://www.shadertoy.com/view/MXdGR7>
[stack exchange version]: <https://math.stackexchange.com/questions/2360055/combining-low-discrepancy-sets-to-produce-a-low-discrepancy-set>
[OKLab]: <https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklab>
