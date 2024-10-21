---
layout: post
title: trying to improve mipmap blending
---
`LINEAR_MIPMAP_LINEAR`, blending from one [mipmap][] level to the next,
is an interesting bodge.  It approximates a dynamic cut-off frequency
with linear interpolation between adjacent log<sub>2</sub> cut-off
frequencies.

I was trying to visualise that process and came up with the following
plot of frequency response; where the vertical blue line is the cut-off
frequency appropriate to the output resolution, and the falling
platforms are the higher mipmap level being faded out and replaced with
the lower mipmap level.
![idealised mipmap passband](/images/ideal_mipmap_passband.apng)

What we see here is that for the low-frequency detail (on the left) all
the mip levels agree, and blending from one to another doesn't affect
that area.

Something that stands out visually with mipmap blending is the way this
blurry version of the texture fades into view as it shrinks and becomes
less chunky.  That's a thing you can _sort of_ see in the plot above,
where the corner of the lower mipmap stands proud as the higher level
falls down.  And frequencies above that are blurrier than they should
be.  And there's aliasing sticking out the end.

Also, the higher mip level extends beyond the cutoff frequency.  That's
a bad thing.  And the falling shelf means that high frequencies are
being attenuated while they should still be visible.  That's also a bad
thing.

Depending on your LOD bias that vertical line might be to the left or
right of the one I've drawn there, and I don't promise that the one I've
drawn is a bias of 0.  It's just the most useful place I could put the
line.  Moving it just makes one problem or other worse.

And these sharp cliffs are not realistic.  It's an idealised model using
a brick-wall interpolation which isn't real and would look terrible even
if you could do it.  On the other hand, linear interpolation (which is
what we have access to) droops on the right hand side of the pass band
but doesn't get very low before bouncing off the Nyquist frequency to
make an aliasey mess all over the place.

To try to fix this I started fiddling with pre-filtering each mip level
so they would join up.  That's not altogether possible but the gap can
still be closed up a bit.

My idea is to apply a sharpening post-filter to the output of the
texture lookups, to the output samples after they've been mip-mapped and
sampled.  Since it's applied after resampling, the correction filter
cannot depend on the specifics of the mip level, which varies on a
per-pixel basis (unless maybe we stored the effective LOD in the alpha
channel?).  All pixels should benefit equally from an identical filter.

To make that work the mip levels have to be preconditioned somehow, so
that the mip level blending shown above does not have rising shelves but
instead has a consistent shape that just moves left and right with the
sampling frequency.

In theory you can taper the pass band to roll off gradually to achieve
this, except that each mip level has finite bandwidth and has to be
truncated.  It gets a bit hairy at that point, and you don't want to end
up filling the gaps with aliases and pretending it's solved.

For expediency I just truncated the passbands at their theoretical
limits, just to see what's feasible.  And it _looks like_ that could
actually help:

{% include desmos.liquid id='j1xk1nnddk' image='/images/sharpened_mipmap_passband.apng' %}

But all of this is a 1D theoretical analysis with perfect band-limiting
in the mipmap interpolation (because the calculations got too messy).
It really needs testing in the real world.

Here's another one where I tried to represent the impact of linear
interpolation and mipmaps that had been properly band-limited, etc., and
then I tweaked things around aimlessly for a bit:
{% include desmos.liquid id='bmkj68ee7z' %}

And this does _nothing_ to help with mip-mappings' other failure case
where one axis is compressed differently from the other.

And the involvement of a sharpening filter limits this to niche
situations, as well.  In a typical 3D scene you have other things going
on, like the edges of the textures and horizons with unrelated texture
data.

_Maybe_ you could do something like oversize your horizons in the
geometry shader and then use alpha blending around the edges to mimic
the blur which the sharpening will counteract.  But that would probably
end up way more expensive than supersampling.

But if you're doing something on a large scale, where an outboard
post-filter makes sense, then maybe this would work.

[mipmap]: <https://en.wikipedia.org/wiki/Mipmap>
