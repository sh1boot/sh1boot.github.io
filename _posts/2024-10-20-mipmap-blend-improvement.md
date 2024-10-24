---
layout: post
title: Trying to improve mipmap blending
---
`LINEAR_MIPMAP_LINEAR`, blending from one [mipmap][] level to the next,
is an interesting bodge.  It approximates a dynamic cut-off frequency
with linear interpolation between adjacent log<sub>2</sub> cut-off
frequencies.

I was trying to visualise that process in the frequency domain and came
up with the following plot.  Frequency along the horizontal axis,
response on the vertical.  The vertical blue line is the cut-off
frequency needed for the output resolution compared to the texture
resolution, and the falling platforms are what you get when a higher
mipmap level is faded out and replaced with the lower mipmap level.
![idealised mipmap frequency response](/images/naive_mipmap_passband.webp)

What we see here is that for the low-frequency detail (on the left) all
the mip levels agree, and blending from one to another doesn't affect
that area.

Something that stands out visually with mipmap blending is the way this
blurry version of the texture fades into view as it shrinks and becomes
less chunky.  That's a thing you can _sort of_ see in this frequency
response plot above, where the corner of the lower mipmap stands proud
as the higher level falls down.  And frequencies above that are weaker
than they should be (consequently the image is blurrier).  Also the
signal content (red line) extends beyond the cutoff, which produces
visible aliasing.

It's got all the bad things at once.  Thankfully it's not altogether
realistic.

Depending on your LOD bias that vertical line might be to the left or
right of the one I've drawn there, and I don't promise that the one I've
drawn is a bias of 0.  It's just the most useful place I could put the
line.  Moving it just makes one problem or other worse.

And the sharp corners never happen.  That's an idealised model using
a brick-wall interpolation which isn't real and would look terrible even
if you could do it.  On the other hand, linear interpolation (which is
what we have available) droops on the right hand side of the pass band
but doesn't get very low before bouncing off the Nyquist frequency to
make an aliasey mess all over the place.

Thinking about mitigations I started experimenting with pre-filtering
the mipmaps and then fixing them after the blend operation.  Just to
see.

My idea is to apply a sharpening post-filter to the result of the
texture lookups -- to the output samples after they've been mip-mapped
and sampled.  Since that would be applied after resampling the
correction filter cannot depend on the specifics of the mip level, which
varies on a per-pixel basis (unless maybe we stored the effective LOD in
the alpha channel?).  All pixels should benefit equally from an
identical filter.

For that to work we need the above graph to show a frequency rolloff
which is comparatively smooth and consistent regardless of where the
cut-off frequency is.  Not these escalator steps.

In this naive square model we could replace the steps with ramps; set at
just the right angle that when you fade from one to another it looks
exactly like the ramp is just shifting left or right.  Then you could
apply an inverse transform afterwards to correct the ramp back to flat
in the passband.

![fanciful mipmap frequency response](/images/sharpened_hopeful_mipmap_passband.webp)

But that's not real.  Most importantly, each mip has to be truncated
according to its theoretical bandwidth, so those steps aren't going to
disappear that easily.

It gets a bit hairy at this point.  Linear interpolation will actually
give a smooth rolloff but the underyling signal becomes aliases and
should really be filtered out.  But linear interpolation can't do that.

There's a bunch of signal processing theory goes here, but for
expediency I just truncated the passbands at their theoretical limits to
see what's feasible.  And it _looks like_ this technique could actually
help:

{% include desmos.liquid id='kfm4ax0mbc' image='/images/sharpened_mipmap_passband.webp' %}

But all of this is a 1D theoretical analysis with perfect band-limiting
in the mipmap interpolation (because the calculations got too messy).
It would make more sense at this point to defer to real-world
implementation and experimentation.

I don't have time for that, so here's another one where I tried to
represent the impact of linear interpolation and mipmaps that had been
band-limited, etc., and then I tweaked things around aimlessly for a
bit:
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
