---
last_modified_at: Tue, 11 Jun 2024 17:41:45 -0700  # d3117a6 texture-neighbourhood-problem-solved
layout: post
title:  Scaling pixel art with SDF
description: Scaling low-res images and pixel art using signed distance fields, smoothing, and re-quantisation.
categories: sdf, pixel-art, interpolation, image-processing
---
For a while I've been wondering if giving a fantasy console like [PICO-8][] a
graphics system defined in terms of more scalable low-memory primitives would
lead to a more interesting retro style than the conventional sharp-edged
squares.  Not concepts like low-poly 3D or minified SVG (eg., [RIPscrip][]),
but maybe using pixel art scaling algorithms natively, or with additional
markup in the data to clarify intent (sharpening corners, for example).  Simply
bake them into your pixel-art editor so you see what you're going to get once
it's upscaled, with the option to correct it where it goes awry.

For this purpose [Signed distance fields][SDF] stood out as a plausible
starting point.  That's not how traditional bitmap graphics and pixel art are
defined, but you can kind of synthesise something plausible by blurring them to
produce gradients, and then quantising them again to restore something close to
the original outline but with the contours smoothed.

That's a concept I explored a while back, and I got this result:
{% include shadertoy.liquid id='3sfBDS' %}

Unfortunately it's not as simple as blur and quantise.  That doesn't work so
well.  The problem is that when smoothing RGB values the intermediate results
can appear to be closer to an adjacent corner which is a different colour
entirely.  This produces weird colouring-over-the-lines artefacts, along with
some blocky edges:
{% include shadertoy.liquid id='3dXBzs' %}

### One-hot palette encoding
The mitigation that I used above does its interpolation in a different domain
to avoid this.  It takes the nearest four colours of the un-interpolated image
as a palette, and maps all of the points used for the interpolation to this
palette before interpolation.

Interpolating a scalar palette index is not generally a useful thing, though,
so what's done instead uses an analogue approximation of a [one-hot][] coding scheme.  There are four
separate scalar values representing the degree of similarity to the four
different palette entries.

This gives four independent, smoothed results.  Each approximating what is
likely represented by that colour in isolation from its neighbours (unless
those neighbours are very similar colours).  This seems to work well for
smoothing out black outlines and rounding off dots.  Other shapes may give
mixed results.

The ideal is that exactly one value in the conversion is at maximum and all the
others at zero, but the implementation allows for colours outside of the
palette to be approximated as a mixture of several palette entries.  Not
necessarily in a reversible way, but to be tolerant of noise and to allow some
influence from gradients in the source.

Then the result is quantised back to whichever of the four original colours is
the best match.

### Anti-aliasing
When trying to decide which palette value is nearest, that's logically a binary
decision made on a per-pixel basis.  That would be ugly, so it needs
anti-aliasing.

You can anti-alias a simple binary `(a > b)` decision this way:
```glsl
float g = min(0.01, fwidth(a - b) * 0.7);
return smoothstep(-g, g, a - b);
```

Then you can `mix()` the corresponding data by that ratio, and repeat as needed
to build a suitable [sorting network][].

How did that `min()` get in there?  Well, sometimes `fwidth()` gets a little
erratic near the edges.  If it's looking at a variable which crosses a
discontinuity, even for a reason we should not care about, it can give a huge
result which can cause normally-predictable results to become noisy where the
discontinuity appears (eg., when an SDF value jumps during the transition from
one letter to another).

#### neighbourhood interpolation order
Another, more regular discontinuity is when the set of nearest pixels changes.
I give a [mitigation for this](/texture-neighbourhood-sampling) in another
post.

### Looking at blurrier interpolation ("inblurpolation"?)
After learning about SDF and its conceptual overlap with what I had already
tried, I decided to revisit the problem and see if I could do better.

The first useful thing I found is that for SDF if you expand the interpolation
from linear to bicubic, or to a Gaussian window, and apply more smoothing then
you can reduce the artefacts produced in SDF font rendering:
{% include shadertoy.liquid id='X3K3RR' %}

But this aggressive smoothing isn't going to work so well for pixel art (which
you might consider a [critically-sampled][] signal).  Also, larger windows mean
more palette conversion, and palette conversion itself means not exploiting the
[separability][separable filter] of Gaussian smoothing.

One approach might be to use a global palette for the whole image.  But then
four colours is certainly not going to be enough.

A four-entry palette worked well in my first attempt because pixels have four
components, and I used one component per palette entry.  This can be extended
by using more pixels, giving four more palette entries each, but each extra
pixel is more interpolation work so that can only be taken so far.

Another challenge of larger interpolation kernels is that to properly smooth
the diagonals without bumpy edges they can't preserve original pixel values at
the points at the integer offsets (where there shouldn't be any interpolation).  When
this happens the image can become washed out.

It's possible to compensate for this washing-out by choosing one of the
neighbourhood colours in the smoothed image, and then substituting in the
corresponding original colour from the unsmoothed source.

Another challenge created by excess smoothing is that the four-colour local
palette becomes more likely again to jump to another nearby neighbour as soon
as it becomes available, producing more squared-off edges where they're not welcome.

A global palette might fix that, too?

### A global palette

Given a global, but very finite palette we have to accept that there may be
colours that don't fall directly onto one specific palette entry, and we have
the problem of how to carry them through to the output.  In a sense that was
the original problem with RGB.  We were simply describing every colour in terms
of how close it was to a red thing, a blue thing, and a green thing.  And the
resulting interpolation did not give good results.

But maybe this time it will.  With more palette entries, which are suitably
chosen.  Maybe instead of a one-hot scheme we now have something more like a
[Bloom filter][].  An arbitrary input colour will fall close to a "random"
set of palette entries and hopefully no nearby colour will have quite the same
signature in that space and won't be quantised the same way.

Well... TBD, I guess.  I haven't coded that yet.

If I did, though, I would then have to use the washing-out mitigation again;
After interpolation consider a small set of neighbours in the blurred image and
pick whichever of those was closest and then replace that with the original
colour at the same coordinate.

Will the above "hashing" effect prevent bleed and surprise discontinuities?  I
don't know, I'd have to test it to see what happens.

Another approach might be to reconstruct the output colour directly from its proximity to the
palette entries.  Not merely quantising to the nearest palette entry (because
this would mean the output could never contain a value outside of the palette),
but by deducing RGB values according to the proximity to each palette entry.

This problem is essentially the same problem as GPS, and has well-understood
solutions, but solving things analytically is unappealing in a shader because
it implies decisions which rule out consideration of coplanar coordinates, and
decisions suck and ignoring data also sucks.

Luckily I found an easy solution.  I'm going to ignore the whole concept for
now and go do something else instead.

### Not a global palette

Another approach which I think might work out, but which does involve
sacrificing Gaussian separability, is to reduce the palette to the four corners
_plus_ the four extra corners which are nearest to becoming active, with those extras
being down-weighted as they get further away.  Strictly there's a ninth
neighbour, diagonally across from the nearest corner, but hopefully that won't
be needed.

What this approach means is that these extra colours get consideration if
they're close, but they can fade out of consideration gradually rather than in
a way that produces a step.

TODO: that

[PICO-8]: <https://www.lexaloffle.com/pico-8.php>
[Pixel-art scaling]: <https://en.wikipedia.org/wiki/Pixel-art_scaling_algorithms>
[SDF]: <https://en.wikipedia.org/wiki/Signed_distance_function>
[one-hot]: <https://en.wikipedia.org/wiki/One-hot>
[sorting network]: <https://en.wikipedia.org/wiki/Sorting_network>
[RIPscrip]: <https://en.wikipedia.org/wiki/Remote_Imaging_Protocol>
[critically-sampled]: <https://en.wikipedia.org/wiki/Nyquist-Shannon_sampling_theorem#Critical_frequency>
[separable filter]: <https://en.wikipedia.org/wiki/Separable_filter>
[Bloom filter]: <https://en.wikipedia.org/wiki/Bloom_filter>
