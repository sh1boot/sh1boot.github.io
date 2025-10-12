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
<span style="background: hsl({{n |times:0.618033989 |modulo:1 |times:360 |round}}deg, 60%, 70%);">{{n}}</span>
{%- endfor %}
</div>
<figcaption>HSL((n / φ % 1 * 360), 60%, 70%)</figcaption>
</figure>

There's a problem here.  It seems to visit relatively few colours before
coming back around to something very similar to a colour that's already
been used.  So things get indistinct much sooner than one might hope.

Fun fact: When taking steps of 1/φ mod 1 those "kind of similar" colours
occur at distances which are Fibonacci numbers.   You can resize the box
above to line up different columns.

HSL is tied to the numerical coding of colour in RGB.  It's made out of
up and down ramps of R and G and B without regard to how they're
perceived.  Maybe it would work better if the hue was evenly distributed
in human perception rather than what the display understands.

So let's try OKLCh:

<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: oklch(75% 30% {{n |times:0.618033989 |modulo:1 |times:360 |round}}deg);">{{n}}</span>
{%- endfor %}
</div>
<figcaption>OKLCh(75% 30% (n / φ % 1 * 360))</figcaption>
</figure>

This has the unfortunate design feature of flattening the lightness of
each colour, so all the obvious contrast is gone.  Maybe the hues are
more evenly spread, but it's hard to tell.

On the other hand, the contrast with the numbers written on the boxes is
a bit better.  And that's important.

If only the hue is varied then things get crowded very quickly.  If the
lightness varies too much then clarity can be compromised.

Another problem with OKLCh is that it's so easy to stumble out of gamut
(the range of colours which the display can represent) and the CSS
policy for bringing things in-gamut is currently not well defined, the
existing guesses don't do anything helpful for this situation, and the
debates about how to define it well don't look like they'll head
anywhere helpful imminently.

TODO: discuss gamut mapping, very briefly.

But let's persevere with it for now.

Being reluctant to mess about with lightness, let's see what else can be
done in the chroma plane.  That's "chromatic intensity" in OKLCh, or
saturation, or the green-red and blue-yellow channels in OKLab.

So how do you get the properties of $\frac{n}{\varphi} \mod 1$ in two
dimensions?  That's a question that troubled me for years.  The solution
(strictly, "a" solution, but I  don't have a better one to show you) is
a [generalisation][quasirandom sequences] on the Golden ratio trick.

What all that boils down to is that in two dimensions you multiply $n$
by (0.7548776662, 0.5698402910), which is one over the [Plastic
ratio][] (ρ=1.3247) and one over the square of the plastic ratio, mod 1
in each axis.  This maximises the minimum distance between points in two
dimensions, etc..

So here's that applied to OKLab:
<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: oklab(
{{-''-}}    .75
{{-' '-}}   {{n |times: 0.7548776662 |modulo: 1 |minus: 0.5 |times:0.4 |round:3}}
{{-' '-}}   {{n |times: 0.5698402910 |modulo: 1 |minus: 0.5 |times:0.4 |round:3}});">{{n}}</span>
{%- endfor %}
</div>
<figcaption>OKLab(70% (n / ρ % 1 * 60 - 30)% (n / ρ² % 1 * 60 - 30)%</figcaption>
</figure>

This fills a square in the chroma plane, so it has pointy corners of
extra saturation and is probably going out of gamut and being mapped
back in in unpredictable ways.

Sampling evenly across a disc is a bit more fiddly.  Given a uniformly
random number you need to take its square root before combining it with
a random angle to get a uniform distribution on a disc.  Here's that, in
OKLCh:

<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: oklch(
{{-''-}}     .75
{{-' '-}}    calc(sqrt({{n |times: 0.7548776662 |modulo: 1 |round:3}}) * .2)
{{-' '-}}    {{n |times: 0.5698402910 |modulo: 1 |times: 360 |round}}deg);">{{n}}</span>
{%- endfor %}
</div>
<figcaption>OKLCh(.7 sqrt(n / ρ % 1) (n / ρ² % 1 * 360)</figcaption>
</figure>

Both of these have notable issues between every fourth colour.  That's
because one of the factors here is so close to 3/4 (or the Plastic ratio
is so close to 4/3), so four times that mod 1 is close to zero.

Next step is to make adjustments to the lightness.  But only modest
adjustments so that all results still have strong contrast with the
background colour.

I don't know of a name for the next ratio after Golden and Plastic, but
its value is 1.22074408460575947536, and the reciprocals are
(0.8191725134, 0.6710436067, 0.5497004779).

This needs scaling to ensure we don't go across all of the lightness
axis.

<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: oklab(
{{-''-}}     {{n |times: 0.6710436067 |modulo: 1 |times: 0.25 |plus: 0.6|round:3}}
{{-' '-}}    {{n |times: 0.5497004779 |modulo: 1 |minus: 0.5 |times: 0.35|round:3}}
{{-' '-}}    {{n |times: 0.8191725134 |modulo: 1 |minus: 0.5 |times: 0.35|round:3}});">{{n}}</span>
{%- endfor %}
</div>
<figcaption>OKLab L,a,b stepping</figcaption>
</figure>

Here's an alternative way to reduce the range:
<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: oklab(
{{-''-}}     {{n |times: 0.6710436067 |modulo: 0.25 |plus: 0.6|round:3}}
{{-' '-}}    {{n |times: 0.5497004779 |modulo: 1 |minus: 0.5 |times: 0.35|round:3}}
{{-' '-}}    {{n |times: 0.8191725134 |modulo: 1 |minus: 0.5 |times: 0.35|round:3}});">{{n}}</span>
{%- endfor %}
</div>
<figcaption>another OKLab L,a,b stepping</figcaption>
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

[Golden ratio]: <https://en.wikipedia.org/wiki/Golden_ratio>
[Plastic ratio]: <https://en.wikipedia.org/wiki/Plastic_ratio>

