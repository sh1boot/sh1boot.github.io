---
last_modified_at: Mon, 2 Dec 2024 19:12:14 -0800  # 3a9616c Improved-texture-neighbourhood-sampling
layout: post
title:  Neighbourhood sampling order during texture filtering
description: A workaround to avoid glitches when working with derivative functions around texture interpolation logic.
categories: graphics, glsl, hacks, fwidth, thresholding, antialiasing
svg: true
---
In my [pixel-art scaling](/pixel-art-scaling) tinkering I found a
source of glitches in anti-aliased threshold operations involving
derivative functions in shaders.  So I worked out a workaround which
saves me having to think too hard about a bunch of corner cases.

When applying a window function in a shader (here I'll use linear
interpolation for simplicity; you would normally let the hardware do
something like that, but real logic can be more complex) it's perfectly
reasonable to end up with something like this:
```glsl
ivec2 i = ivec2(floor(uv));
vec2 weight = uv - vec2(i);

vec4 a = texelFetch(s, i + ivec2(0,0)), b = texelFetch(s, i + ivec2(1,0)),
     c = texelFetch(s, i + ivec2(0,1)), d = texelFetch(s, i + ivec2(1,1));
return mix(mix(a, b, weight.x), mix(c, d, weight.x), weight.y);
```

From that you might build things up and apply other filters and whatever
else; but what I noticed is that when subsequent operations want to use
the derivative functions (`dFdx()`, `dFdy()`, and `fwidth()`) then
there can be problems.

Problems like this:
{% include shadertoy.liquid id='XfKcDK' %}

Imagine you're sampling along a line spanning from pixels M to R in the example
below.  Ignore the Y dimension for now.  You'll see `a`, `b`, and `weight` take
step changes every time an integer boundary is crossed:
<svg viewbox="0 0 640 340">
<defs>
  {%- assign letters = "mnopqrst" | split: '' -%}
  <g id="pixel"><circle r="12"/></g>
  {%- for n in (0..7) %}
  <g id="pixlbl_{{n}}" class="block{{n}}"><text font-variant="small-caps">{{letters[n]}}</text></g>
  <g id="pixel_{{n}}" class="block{{n}}"><use href="#pixel" /><use href="#pixlbl_{{n}}" /></g>
  {%- endfor %}

  <g id="narrow"><rect x="0" y="-10" width="50" height="20" /></g>
  <g id="wide"><rect x="0" y="-10" width="100" height="20" /></g>
  <g id="down_1x">
    <polygon points="0,10 0,-10 50,10" stroke="none" />
    <path d="M0,-10 l50,20" /></g>
  <g id="up_1x">
    <polygon points="0,10 50,-10 50,10" stroke="none" />
    <path d="M0,10 l50,-20" /></g>

  {%- for n in (0..7) %}
  <g id="narrow{{n}}" class="block{{n}}"><use href="#narrow" /><use href="#pixlbl_{{n}}" x="25" /></g>
  <g id="wide{{n}}" class="block{{n}}"><use href="#wide" /><use href="#pixlbl_{{n}}" x="50" /></g>
  {%- endfor %}
</defs>
  <g id="illustration">
  <g stroke-width="0.5">
  {%- for x in (0..7) %}
  <path d="M{{x | times: 50 | plus: 150}},{{25 | minus: 12}} v-13" />
  {%- endfor %}
  {%- for y in (0..3) %}
  <path d="M{{150 | minus: 12}},{{y | times: 50 | plus: 25}} h-13" />
  {%- for x in (0..7) %}
  <path d="M{{x | times: 50 | plus: 150 | plus: 12}},{{y | times: 50 | plus: 25}} h{%if x < 7%}26{%else%}13{%endif%}"
  {%- if y == 1 and 0 < x and x < 6 %} stroke-width="3" {%-endif-%}
 />
  <path d="M{{x | times: 50 | plus: 150}},{{y | times: 50 | plus: 25 | plus: 12}} v{%if y < 3%}26{%else%}13{%endif%}" />
  {%- unless y == 1 and 0 < x and x < 7 %}
  <use href="#pixel" x="{{x | times: 50 | plus: 150}}" y="{{y | times: 50 | plus: 25}}" />
  {%- endunless %}
  {%- endfor %} {%- endfor %}
  </g>
  {%- for n in (0..5) %}
  <use href="#pixel_{{n}}" x="{{n | times: 50 | plus: 200}}" y="75" />
  {%- endfor %}
  <use href="#pixel_grid" />
  <text x="120" y="100" style="text-anchor:end;">texture:</text>
  <g font-family="monospace">
  <text x="120" y="230" style="text-anchor:end;">a:</text>
  <text x="120" y="260" style="text-anchor:end;">1-weight.x:</text>
  <text x="120" y="290" style="text-anchor:end;">b:</text>
  <text x="120" y="320" style="text-anchor:end;">weight.x:</text>
  </g>
</g>
  {%- for n in (0..5) %}
  <use href="#narrow{{n}}" x="{{n | times: 50 | plus: 200}}" y="230" />
  <use href="#down_1x" x="{{n | times: 50 | plus: 200}}" y="260" class="block{{n}}" />
  <use href="#narrow{{n}}" x="{{n | times: 50 | plus: 150}}" y="290" />
  <use href="#up_1x" x="{{n | times: 50 | plus: 150}}" y="320" class="block{{n}}" />
  {%- endfor %}
</svg>

Those step changes cause `dFdx()` to return much larger values than
expected at the transitions, even while the output of the function
itself appears smooth.

This can affect the LOD calculation in mipmapping (though you should
probably be doing that manually, here) and the small transition band
used for anti-aliased thresholding becomes an unexpectedly large band.

Here's an workaround I came up with:
```glsl
ivec4 i = ivec4(floor((uv.xyxy + vec4(1,1,0,0)) / 2.0) * 2.0 + vec4(0,0,1,1));
vec2 weight = abs(uv - vec2(i.xy));

vec4 a = texelFetch(s, i.xy), b = texelFetch(s, i.zy),
     c = texelFetch(s, i.xw), d = texelFetch(s, i.zw);
return mix(mix(a, b, weight.x), mix(c, d, weight.x), weight.y);
```

This rearranges the offset coordinates so that `a` always gets a pixel from an
even column and even row index, `d` always gets a pixel from an odd row and odd
column, etc..

Consequently, variables change like so:

<svg viewbox="0 0 640 340">
  <use href="#illustration" />

  <use href="#wide0" x="150" y="230" class="block0" />
  <use href="#wide2" x="250" y="230" class="block2" />
  <use href="#wide4" x="350" y="230" class="block4" />

  <use href="#up_1x"   x="150" y="260" class="block0" />
  <use href="#down_1x" x="200" y="260" class="block0" />
  <use href="#up_1x"   x="250" y="260" class="block2" />
  <use href="#down_1x" x="300" y="260" class="block2" />
  <use href="#up_1x"   x="350" y="260" class="block4" />
  <use href="#down_1x" x="400" y="260" class="block4" />

  <use href="#wide1" x="200" y="290" class="block1" />
  <use href="#wide3" x="300" y="290" class="block3" />
  <use href="#wide5" x="400" y="290" class="block5" />

  <use href="#up_1x"   x="200" y="320" class="block1" />
  <use href="#down_1x" x="250" y="320" class="block1" />
  <use href="#up_1x"   x="300" y="320" class="block3" />
  <use href="#down_1x" x="350" y="320" class="block3" />
  <use href="#up_1x"   x="400" y="320" class="block5" />
  <use href="#down_1x" x="450" y="320" class="block5" />
</svg>

While `a` and `b` do still take step changes, they do so when their
corresponding weights are zero.  Depending on the situation this may take care
of the problem already, or it may be necessary to rearrange a bit more of the
arithmetic to ensure the multiplication by the zero-weighting happens earlier
to force the switch to appear smooth.

Alternatively it's possible to be careful to calculate the derivatives
on the continuous values earlier in the code.  That's probably better if
you don't mind doing it, but sometimes that can involve managing a bit
more data and remembering to do things that you might not otherwise want
to remember.

Another benefit of doing it this way is that if one input pixel contains
an outlier which causes a different path to be taken, then all the
fragments which touch that pixel will see the aberration in the same
stage in the function so they can all take the same branch in unison;
rather than each having to branch differently at different stages
depending on that pixel's relative position to themselves (though
branching may still cause problems with derivatives).

This can be extended to a mod-n system for kernels of size n.  Capturing pixels
into something more like a ring buffer, where only the edge cases (still the
zero-weighted cases) get updated during a transition.

```glsl
vec4 ix = floor((uv.x + vec4(3,2,1,0)) / 4.0) * 4.0 + vec4(0,1,2,3);
vec4 iy = floor((uv.y + vec4(3,2,1,0)) / 4.0) * 4.0 + vec4(0,1,2,3);
vec4 weightx = window(abs(uv.x - ix));
vec4 weighty = window(abs(uv.y - iy));
vec4 acc = vec4(0);
for (int i = 0; i < 4; ++i) {
    for (int j = 0; j < 4; ++j) {
        acc += texelFetch(s, ivec2(ix[j], iy[i])) * weightx[j] * weighty[i];
    }
}
```

The ring-buffer analogy is misleading, of course, because the adjacent pixels
are computed concurrently and they all fill up their own private copies of the
buffer at the same time without sharing context, so there isn't the bandwidth
saving of a classical ring buffer.  But the real point is that they all have
mostly the same values at the same offests and so this mitigates a class of
glitches in the derivatives.
