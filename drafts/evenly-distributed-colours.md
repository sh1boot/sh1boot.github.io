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
    height: 100px;
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
figcaption {
    text-align: center;
    font-family: monospace;
}
</style>

One way to generate a palette of colours for distinguishing different
lines and objects in diagrams is to take regular steps around the hue
axis of the HSL colour wheel.  If you know how many you'll need then
your can subdivide the space evenly, or if you do not then you can use
1/φ as the interval instead.  But this has limitations...

Spoiler alert: this won't (directly) attempt to address accessibility
for colour-blind users.

Of course a much simpler solution is to just pick a bunch of reasonable
colours and put them in a table (eg., [1][Kelly's 22 colours] [2][Tube
map] [3][20 distinct colours]).  But doing things the hard way is more
interesting.

Also, I have extra constraints.  It's not much use knowing that black
and white won't be mistaken for each other when you want to draw them
both on the same background colour, likely black or white, and expect
them both to have strong contrast to that background.

So I don't want colours with an unnecessarily wide spread in lightness.

## Varying one axis

$\frac{n}{\varphi} \mod 1$ has the property that every new $n$ falls
inside one of the largest gaps, and inside the largest span of
contiguous largest gaps (when there are many largest-equal gaps), etc.,
subdividing that gap/span by 1:φ, which is tolerably close to 1:2.

That is to say that each new value is as far as possible from as many
previous values as possible without deciding in advance how many
values you'll need or changing step sizes at different stages in the
sequence.

Stepping this way around the hue of the HSL space gives these colours:

<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: hsl({{n |times:0.618033989 |modulo:1 |times:360 |round}}deg, 60%, 70%);">{{n}}</span>
{%- endfor %}
</div>
<figcaption>HSL(n / φ % 1 &times; 360&deg;, 60%, 70%)</figcaption>
</figure>

There's a problem here.  It seems to visit relatively few colours before
coming back around to use something very similar to a colour that's
already been used.  So things get indistinct much sooner than one might
hope.

Fun fact: When taking steps of 1/φ mod 1 those "kind of similar" colours
occur at distances which are Fibonacci numbers.   You can resize the box
above to line up different columns.

HSL is tied to the numerical coding of colour in RGB.  It's made out of
up and down ramps of R and G and B without regard to how they're
perceived.  Maybe it would work better if the hue was evenly distributed
in human perception rather than what the display understands.

So let's try again but with OKLCh:

<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: oklch(75% 30% {{n |times:0.618033989 |modulo:1 |times:360 |round}}deg);">{{n}}</span>
{%- endfor %}
</div>
<figcaption>OKLCh(75% 30% (n / φ % 1 &times; 360&deg;))</figcaption>
</figure>

This has the unfortunate effect (a feature in any other setting) of
flattening the lightness of each colour, so some of the bonus contrast
is taken away.  Maybe the hues are more evenly spread, but it's hard to
tell.

On the positive side, the contrast with the numbers written on the boxes
is more even.  And that's important.

Another problem with OKLCh is that it's so easy to stumble out of gamut
(the range of colours which the display can represent) and this brings
[gamut mapping][] into play, and that's not well defined right now and
it may never be defined in a way that's useful for these purposes.  It's
not always obvious if or when the test swatches I'm using here are being
clipped to fit the display capabilities, and not everybody will have the
same results.

But let's persevere with it for a while longer...

## Varying two axes

Whichever space is used here, changing just the hue is trying to pack
too much into the one axis.  The next parameter we can add is
saturation, or C for "chromatic intensity" in OKLCh.  Alternatively, the
a (green-red) and b (blue-yellow) axes of OKLab.

So how do you get the properties of $\frac{n}{\varphi} \mod 1$ in two
dimensions?  That's a question that troubled me for years.  The solution
(strictly, "a" solution, but I  don't have a better one to show you) is
a [generalisation][quasirandom sequences] on the Golden ratio trick.

What all that boils down to is that in two dimensions you multiply $n$
by (0.7548776662, 0.5698402910), which is one over the [Plastic
ratio][] (ρ=1.3247) and one over the square of the plastic ratio, mod 1
in each axis.  This maximises the minimum distance between points in two
dimensions, etc..

Here's how that looks in OKLab:
<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: oklab(
{{-''-}}    .75
{{-' '-}}   {{n |times: 0.7548776662 |modulo: 1 |minus: 0.5 |times:0.4 |round:3}}
{{-' '-}}   {{n |times: 0.5698402910 |modulo: 1 |minus: 0.5 |times:0.4 |round:3}});">{{n}}</span>
{%- endfor %}
</div>
<figcaption>OKLab(.75 (n / ρ % 1 &times; .4 - .2) (n / ρ² % 1 &times; .4 - .2))</figcaption>
</figure>

This gives uniform coverage of a square in the chroma plane, so it has
pointy corners of extra saturation.  It's probably going out of gamut
and being clipped in unpredictable ways.

We can convert this to a uniform disc by randomising radius and angle,
instead.  To make this uniform you have to take the square root of the
radius, which compensates for what would otherwise be an
over-concentration of points at the centre (because with a shorter
radius the different angles around that circle fall closer together).

Here's what that gives us for OKLCh:
<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: oklch(
{{-''-}}     .75
{{-' '-}}    calc(sqrt({{n |times: 0.7548776662 |modulo: 1 |round:3}}) * .2)
{{-' '-}}    {{n |times: 0.5698402910 |modulo: 1 |times: 360 |round}}deg);">{{n}}</span>
{%- endfor %}
</div>
<figcaption>OKLCh(.75 (sqrt(n / ρ % 1) &times; .2) (n / ρ² % 1 &times; 360&deg;))</figcaption>
</figure>

Something unfortunate about the plastic ratio shows up, here.  It's too
close to 4/3.  This has the consequence that one axis appears nearly
periodic mod 4, with quite a slow precession.  For example, in the polar
test case, we start at 0 so the first radius is zero (grey), and every
fourth colour after that is very grey as well, and it takes a long way
to climb out of that hole.  If we switch the axes around then the
problem will manifest in the hue instead of the saturation:

<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: oklch(
{{-''-}}     .75
{{-' '-}}    calc(sqrt({{n |times: 0.5698402910 |modulo: 1 |round:3}}) * .2)
{{-' '-}}    {{n |times: 0.7548776662 |modulo: 1 |times: 360 |round}}deg);">{{n}}</span>
{%- endfor %}
</div>
<figcaption>OKLCh(.75 (sqrt(n / ρ² % 1) &times; .2) (n / ρ % 1 &times; 360&deg;))</figcaption>
</figure>

## Varying three axes

Next step is to make adjustments to the lightness.  But only modest
adjustments so that all results still have strong contrast with the
background colour.

I don't know of a name for what comes after Golden and Plastic, but its
value is g=1.22074408460575947536, and the reciprocals of the powers are
(0.8191725134, 0.6710436067, 0.5497004779).

The lightness figure needs compression to ensure we don't wander too
far.

<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: oklab(
{{-''-}}     {{n |times: 0.8191725134 |modulo: 1 |times: 0.25 |plus: 0.6|round:3}}
{{-' '-}}    {{n |times: 0.6710436067 |modulo: 1 |minus: 0.5 |times: 0.35|round:3}}
{{-' '-}}    {{n |times: 0.5497004779 |modulo: 1 |minus: 0.5 |times: 0.35|round:3}});">{{n}}</span>
{%- endfor %}
</div>
<figcaption>OKLab((n/g % 1 &times; .25 + 0.6) (n/g² % 1 &times; .35 - .175) (n/g³ % 1 &times; .35 - .175))</figcaption>
</figure>

But I preferred the result with the terms in a different order:
<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: oklab(
{{-''-}}     {{n |times: 0.6710436067 |modulo: 1 |times: 0.25 |plus: 0.6|round:3}}
{{-' '-}}    {{n |times: 0.5497004779 |modulo: 1 |minus: 0.5 |times: 0.35|round:3}}
{{-' '-}}    {{n |times: 0.8191725134 |modulo: 1 |minus: 0.5 |times: 0.35|round:3}});">{{n}}</span>
{%- endfor %}
</div>
<figcaption>OKLab((n/g² % 1 &times; .25 + 0.6) (n/g³ % 1 &times; .35 - .175) (n/g % 1 &times; .35 - .175))</figcaption>
</figure>

Instead of scaling it, another way might be to use a smaller modulo:
<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: oklab(
{{-''-}}     {{n |times: 0.6710436067 |modulo: 0.25 |plus: 0.6|round:3}}
{{-' '-}}    {{n |times: 0.5497004779 |modulo: 1 |minus: 0.5 |times: 0.35|round:3}}
{{-' '-}}    {{n |times: 0.8191725134 |modulo: 1 |minus: 0.5 |times: 0.35|round:3}});">{{n}}</span>
{%- endfor %}
</div>
<figcaption>OKLab((n/g² % .25 + 0.6) (n/g³ % 1 &times; .35 - .175) (n/g % 1 &times; .35 - .175))</figcaption>
</figure>
But this version becomes distinctly worse at intervals of 22.  Which is
respectable, but it's not as good as the previous version.

Those all have that pointy-corner problem (though I trimmed the
saturation a little to help).  Back to polar:
<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: oklch(
{{-''-}}     {{n |times: 0.6710436067 |modulo: 1 |times: 0.25 |plus: 0.6|round:3}}
{{-' '-}}    calc(sqrt({{n |times: 0.5497004779 |modulo: 1 |round:3}}) * 0.2)
{{-' '-}}    {{n |times: 0.8191725134 |modulo: 1 |times: 360 |round}});">{{n}}</span>
{%- endfor %}
</div>
<figcaption>OKLCh((n/g² % 1 &times; .25 + 0.6) (sqrt(n/g³ % 1) &times; .2) (n/g % 1 &times; 360&deg;))</figcaption>
</figure>

And back to HSL:
<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: hsl(
{{-''-}}     {{n |times: 0.8191725134 |modulo: 1 |times: 360 |round}}deg,
{{-' '-}}    calc(sqrt({{n |times: 0.5497004779 |modulo: 1 |round:3}}) * 70%),
{{-' '-}}    {{n |times: 0.6710436067 |modulo: 1 |times: 25 |plus: 55 |round}}%);">{{n}}</span>
{%- endfor %}
</div>
<figcaption>HSL((n/g % 1 &times; 360&deg;), (sqrt(n/g³ % 1) &times; 70%), (n/g² % 1 &times; 25% + 55%))</figcaption>
</figure>

In another order:
<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: hsl(
{{-''-}}     {{n |times: 0.5497004779 |modulo: 1 |times: 360 |round}}deg,
{{-' '-}}    calc(sqrt({{n |times: 0.8191725134 |modulo: 1 |round:3}}) * 70%),
{{-' '-}}    {{n |times: 0.6710436067 |modulo: 1 |times: 25 |plus: 55 |round}}%);">{{n}}</span>
{%- endfor %}
</div>
<figcaption>HSL((n/g³ % 1 &times; 360&deg;), (sqrt(n/g % 1) &times; 70%), (n/g² % 1 &times; 25% + 55%))</figcaption>
</figure>

And another:
<figure>
<div class="example">
{%- for n in (0..59) %}
<span style="background: hsl(
{{-''-}}     {{n |times: 0.6710436067 |modulo: 1 |times: 360 |round}}deg,
{{-' '-}}    calc(sqrt({{n |times: 0.8191725134 |modulo: 1 |round:3}}) * 70%),
{{-' '-}}    {{n |times: 0.5497004779 |modulo: 1 |times: 25 |plus: 55 |round}}%);">{{n}}</span>
{%- endfor %}
</div>
<figcaption>HSL((n/g² % 1 &times; 360&deg;), (sqrt(n/g % 1) &times; 70%), (n/g³ % 1 &times; 25% + 55%))</figcaption>
</figure>

In my experiments the bright greens seemed to collide first, but they
seemed better separated at lower saturation.  Numerically they _must_ be
closer, but I guess it's a display or perception thing.  I don't see
this oddity in OKLCh, which probably means it's giving that linear
perceptual spacing needed for this task.

## Adjusting to match the context

Simple line art can be drawn in SVG using `currentColor` lines over a
transparent background.  This means that whatever colour text and
background the user has set up will follow through into diagrams and
everything will look consistent rather than having big white rectangles
around each diagram, or black-on-black diagrams.

Then some lines might need to be distinguished by colour (along with
other cues, for accessibility) and some shapes might similarly need to
be filled with distinguishing colours in the same way.

Using the same palette in all four situations is going to result in poor
contrast.

If a colour is good for drawing clear lines on a black background, it's
not going to be a good fill colour where white text might be added over
the top.  If a colour is a good background tint for a box with text on
top, it's probably going to be a bad at drawing lines which contrast
with the default background.  Etc..

So what we need is two to four palettes.  A set of good line colours for
light backgrounds, a set of good line colours for dark backgrounds, and
sets of good tint colours for filling boxes while remaining true to the
light or dark background, so that the same text colour can be used with
high contrast on top of the tint.


I can't back this up with any science, but in my experience viable
colours exist in two regions:

* low-saturation light colours (pastels)
* high-saturation dark colours (deep colours)


In CSS you can deduce a contrasting background colour with something
like: `HSL(from currentColor 0, 0, clamp(0, l * -100 + 50, 1))` This
negates the luminance and amplifies 100-fold so as to hit the limits
imposed by `clamp()` right away.  Resulting in either black or white
being chosen.

TODO: elaborate

[opponent process]: <https://en.wikipedia.org/wiki/Opponent_process>

[quasirandom sequences]: <https://extremelearning.com.au/unreasonable-effectiveness-of-quasirandom-sequences/>

[shadertoy demo]: <https://www.shadertoy.com/view/MXdGR7>
[stack exchange version]: <https://math.stackexchange.com/questions/2360055/combining-low-discrepancy-sets-to-produce-a-low-discrepancy-set>
[OKLab]: <https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklab>

[Golden ratio]: <https://en.wikipedia.org/wiki/Golden_ratio>
[Plastic ratio]: <https://en.wikipedia.org/wiki/Plastic_ratio>
[Kelly's 22 colours]: <https://artshacker.com/wp-content/uploads/2014/12/Kellys-22-colour-chart.jpg>
[20 distinct colours]: <https://sashamaps.net/docs/resources/20-colors/>
[Tube map]: <https://en.wikipedia.org/wiki/Tube_map#Line_colours>
[Gamut mapping]: <https://en.wikipedia.org/wiki/Color_management#Gamut_mapping>

