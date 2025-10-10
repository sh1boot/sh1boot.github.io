---
last_modified_at: Sat, 3 Aug 2024 21:13:35 -0700  # 3fc1ea7 a-handful-of-drafts
layout: post
title:  Choosing colours which are perceptually distinct
mathjax: true
---
A technique I'm familiar with for creating a series of random distinct
colours is to take regular steps around the hue of the HSL or HSV colour
space.  With this method each step would advance by a ratio of φ (the
Golden ratio, 1.618) turns around the hue, or about 222°, because of the
mathematical properties that that has.

In brief, $n\times\phi \mod 1$ has the property that every new point
falls inside one of the largest gaps, and inside the largest span of
contiguous largest gaps (when there are many largest-equal gaps), etc.,
subdividing that gap/span by 1:φ, which is tolerably close to 1:2.

Or more casually, each new value is as far as possible from any previous
value, without the complexity of deciding in advance how many
subdivisions you'll need, or changing step sizes at different stages in
the sequence.

So each new hue is as far as possible from any previous hue, and your
colours are maximally spaced in one axis.

This has _not_ worked well for me using HSV or HSL.  Broadly, over a
very short span I would encounter colours which looked very similar to
each other while I was sure that there were plenty of other colours
which would have been better choices.

I thought this might be a human perception problem, where different
parts of the HSV hue might be perceptually condensed.  So I switched to
OKLCh instead.  It did not help.

One problem with OKLCh is that it's so easy to stumble out of gamut; and
the CSS policy for bringing thing in-gamut is currently not well
defined, the existing guesses don't do anything helpful, and the raging
debates about how to define it well don't look like they'll head
anywhere helpful either.

TODO: discuss gamut mapping, very briefly.

But the real problem was that things necessarily start to get crowded
when you're trying to subdivide just one axis.

Fun fact: those "kind of similar" colours occur at intervals of
Fibonacci numbers.  When you do the mod-1 business with φ, every time
your step count lands on a Fibonacci number, you've achieved the next
closest value to your starting point.  So starting at 0, 3 will look a
bit similar, and 5 will look a bit more similar, and 8 will look
much too similar and 13 is indistinguishable.  14 will look much more
distinct from 0, but it's not at all distinct from 1.  And so forth.

But colour has three axes to work with.  Within reason.  For practical
reasons it's not prudent to cover the full spread of luma; because
whatever you're drawing has to have clear contrast with the background
over which it's drawn.  Whatever luma your background has, the highlight
colours must cluster on the opposite end of that.

But that still leaves two axes, right?  Pick separate U and V components
in a slice of the YUV space?  Where it's grey in the middle and
saturated around the edges?

This brings us to "how do we do this even distribution thing in two
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

So let's revisit the last axis.  Luma.

By extending the pattern to three axes we sidestep the 0.75 problem, and
we get more freedom to vary the colours to try to avoid collisions.

We just have to be careful to stay clustered well towards the
appropriate end of the luminance scale to provide good contrast from the
background colour (or from the line/text colour when used as a
background).

Also it helps to increase the saturation when the luminance is low, and
to decrease the saturation when the luminance is high.  It seems that
dark colours struggle to stand out with modest saturation, and light
colours are overpowering with too much saturation.


[opponent process]: <https://en.wikipedia.org/wiki/Opponent_process>

[quasirandom sequences]: <https://extremelearning.com.au/unreasonable-effectiveness-of-quasirandom-sequences/>

[shadertoy demo]: <https://www.shadertoy.com/view/MXdGR7>
[stack exchange version]: <https://math.stackexchange.com/questions/2360055/combining-low-discrepancy-sets-to-produce-a-low-discrepancy-set>
[OKLab]: <https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklab>
