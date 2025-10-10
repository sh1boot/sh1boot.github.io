---
last_modified_at: Sat, 3 Aug 2024 21:13:35 -0700  # 3fc1ea7 a-handful-of-drafts
layout: post
title:  Choosing n different colours for graphs
mathjax: true
---
<style>
.example {
    display: flex;
    flex-wrap: wrap;
    width: auto;
    height: 160px;
    border: 1px solid;
    overflow: auto;
    resize: both;
}
.example span {
    width: 60px;
    min-height: 40px;
    flex-grow: 1;
    text-align: center;
    line-height: 40px;
    border: .5px solid black;
}
</style>

One way to generate a palette of colours for distinguishing different
objects in graphs and diagrams is to take regular steps around the hue
axis of the HSL colour wheel.  If you know how many you'll need then
your can subdivide the space evenly, but if you do not then you can use
1/φ instead.

Of course, a much simpler way is to just pick a bunch of reasonable
colours and put them in a table; but doing things the hard way is more
interesting.

Spoiler alert: this won't attempt to address accessibility for
colour-blind users.

$\frac{n}{\varphi} \mod 1$ has the property that every new $n$ falls
inside one of the largest gaps, and inside the largest span of
contiguous largest gaps (when there are many largest-equal gaps), etc.,
subdividing that gap/span by 1:φ, which is tolerably close to 1:2.

That is to say that each new value is as far as possible from previous
values without knowing in advance how many subdivisions you'll need or
changing step sizes at different stages in the sequence.

<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: hsl({{n |times:0.618033989 |modulo:1 |times:360}}deg, 60%, 70%);">{{n}}</span>
{%- endfor %}
</div>
<figcaption>HSL((n / φ % 1 * 360), 60%, 70%)</figcaption>
</figure>

Do you see what's wrong there?  It seems to visit relatively few colours
before coming back around to something very similar to a colour that's
already been used.  So things get indistinct much sooner than one might
hope.

HSL is tied to the numerical coding of colour in RGB, which is not a
good representation of human colour perception.  OKLCh is meant to be
better.  let's try that:

<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: oklch(75% 30% {{n |times:0.618033989 |modulo:1 |times:360}}deg);">{{n}}</span>
{%- endfor %}
</div>
<figcaption>OKLCh(75% 30% (n / φ % 1 * 360))</figcaption>
</figure>

That's probably worse.  In this space the lightness and saturation are
fixed in a way that HSL doesn't achieve, with a consequence that they're
all kind of samey.

Either way, the problem is that things necessarily start to get crowded
when you're trying to subdivide just one axis.

Fun fact: When taking steps of 1/φ mod 1 those "kind of similar" colours
occur at intervals of Fibonacci numbers.   Resize this boxes above to be
a Fibonacci number in width and observe the vertical stripes of like
colours.  Every Fibonacci-numbered step gets closer to your starting
point than any earlier step.

Another problem with OKLCh is that it's so easy to stumble out of gamut
-- outside of the range of colours which your display can represent
(generally in RGB) -- and the CSS policy for bringing things in-gamut is
currently not well defined, the existing guesses don't do anything
helpful, and the debates about how to define it well don't look like
they'll head anywhere helpful imminently.

TODO: discuss gamut mapping, very briefly.

But let's persevere with it for now.

Colour has three axes to work with.  Sort of.  To maintain contrast one
doesn't want to move luminance around and have it get too close to the
luminance of the background where it'll lack sufficient contrast to draw
things clearly.  So let's try exploring the whole hue/saturation plane
with a fixed luminance.

This raises the question "how do we do this even distribution thing in
two dimensions?".  That's a question that troubled me for years.  The
solution (strictly, "a" solution, but I  don't have a better one to show
you) is a [generalisation][quasirandom sequences] on the Golden ratio
trick.

What all that boils down to is that in two dimensions you add
(0.7548776662, 0.5698402910) (one over the Plastic ratio, ρ=1.3247, and
one over the square of the plastic ratio) to your coordinate, mod 1 in
each axis.  This behaves somewhat like 1/φ but in two dimensions, and a
bit more compromised in how well it distributes itself, because this
problem isn't easy.

Also we now switch to OKLab so our two dimensions appear evenly over the
plane.

TODO: explain the disc sampling alternative.
<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: oklab(
    70%
    {{n |times: 0.7548776662 |modulo: 1 |minus: 0.5 |times: 60}}%
    {{n |times: 0.5698402910 |modulo: 1 |minus: 0.5 |times: 60}}%);">{{n}}</span>
{%- endfor %}
</div>
<figcaption>OKLab(70% (n / ρ % 1 * 60 - 30)% (n / ρ² % 1 * 60 - 30)%</figcaption>
</figure>

One problem here is that the first coordinate is too close to 3/4.  This
means it appears to cycle between four points with a slow precession.
Resize that box and see for yourself.

Why is that?  Perhaps the metric for what the best numbers for this job
is is flawed, but I don't have a better one.

Anyway, as I see it, if you're red-green colourblind, and OKLab is
arranged so that your colourblindness runs along one axis, then you're
going to be stuck perceiving more of the other axis, and you don't want
that to be restricted to four clusters of very similar values.

So let's revisit the last axis.  Luma.

By extending the pattern to three axes we sidestep the 0.75 problem, and
we get more freedom to vary the colours to try to avoid collisions.

We just have to be careful to stay clustered well towards the
appropriate end of the luminance scale to provide good contrast from the
background colour (or from the line/text colour when used as a
background).

<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: oklab(
    {{n |times: 0.6710436067 |modulo: 1 |times: 0.25 |plus: 0.6}}
    {{n |times: 0.5497004779 |modulo: 1 |minus: 0.5 |times: 0.35}}
    {{n |times: 0.8191725134 |modulo: 1 |minus: 0.5 |times: 0.35}});">{{n}}</span>
{%- endfor %}
</div>
<figcaption>OKLab L,a,b stepping</figcaption>
</figure>

How does it stand up to colourblind filter tests?  Not so good.  That needs further research.

Also it helps to increase the saturation when the luminance is low, and
to decrease the saturation when the luminance is high.  It seems that
dark colours struggle to stand out with modest saturation, and light
colours are overpowering with too much saturation.

[opponent process]: <https://en.wikipedia.org/wiki/Opponent_process>

[quasirandom sequences]: <https://extremelearning.com.au/unreasonable-effectiveness-of-quasirandom-sequences/>

[shadertoy demo]: <https://www.shadertoy.com/view/MXdGR7>
[stack exchange version]: <https://math.stackexchange.com/questions/2360055/combining-low-discrepancy-sets-to-produce-a-low-discrepancy-set>
[OKLab]: <https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklab>
