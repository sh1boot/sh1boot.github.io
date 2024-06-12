---
layout: post
title:  What I've learned so far about CSS, SVG, Liquid, and Jekyll
description: Embedded diagrams in Jekyll and GitHub Pages from the point of view of someone who wants to keep web technologies at arm's length.
categories: web, css, svg, liquid, jekyll, wtf-am-i-doing
---
From the point of view of knowing almost nothing about how any web techology
works, here's a bunch of stuff I had to pick up to draw a picture in a
GitHub-powered blog.

I'm sure it's all very basic stuff for professionals, but it's a few things I
had to grind through as somebody who doesn't really want to get involved in the
web at all if possible:
* TOC
{:toc}

### Inlining SVG
First, unsurprisingly, you can just inline SVG directly inside of markdown:
```html
<svg width="100%" height="100" viewbox="0 0 100 100">
  <circle cx="50" cy="50" r="40" />
</svg>
```
<svg width="100%" height="100" viewbox="0 0 100 100">
  <circle cx="50" cy="50" r="40" />
</svg>
Astounding!

### Drawing SVG with the proper colours
To respect dark-mode or other CSS overrides from the user it's important to
avoid black-on-black diagrams, but it's also good to avoid
black-on-**white-rectangle** diagrams, which can also be hard to read inside a
dark-themed page.

It turns out you can use `currentColor` in SVG to draw lines in the current
text colour whereever that SVG is embedded.  One assumes the text colour was
reliably chosen to contrast with the background.  The background of an SVG is
transparent by default, so implicitly consistent with the surrounding context.

Also, to make a shape solid one can use `currentColor` with a low opacity in
order to "tint" the background, rather than committing to a specific colour.

Hopefully that's all working as intended on above circle.
```css
svg {
  stroke:currentColor;
  stroke-width:1.5;
  fill:currentColor;
  fill-opacity:0.0625;
}
```
<style>
  svg {
    stroke: currentColor;
    stroke-width: 1.5;
    fill: currentColor;
    fill-opacity: 0.0625;
  }
</style>
Unfortunately this breaks SVG's text, which is normally rendered in the fill
colour with no outline stroke.  A fix-up is needed for that.

Also, I find it most convenient to anchor the text by its centre, so I can
easily line it up with the centre of the things that it's labelling.
```css
text {
  stroke:none;
  fill:currentColor;
  fill-opacity:1.0;
  dominant-baseline:middle;
  text-anchor:middle;
}
```
<style>
  text {
        stroke: none;
        fill: currentColor;
        fill-opacity: 1.0;
        dominant-baseline: middle;
        text-anchor: middle;
  }
</style>

### Liquid iteration to generate regular structures
To draw a bunch of very similar objects it can be easier to generate them
programmatically.  This [Liquid][] thingumy I seem to be using has loops,
but arithmetic is excruciating.  It seems to be a language very much in the
spirit of COBOL.
{% raw %}
```liquid
<svg width="100%" height="120" viewbox="0 0 320 120">
  <defs>
    <clipPath id="clip34">
      <rect x="3" y="3" width="34" height="34" />
    </clipPath>
    {%- for n in (0..15) -%}
      <g id="box{{n}}">
        <rect x="3" y="3" width="34" height="34" />
        <text x="20" y="20" clip-path="url(#clip34)">
          {{-n-}}
        </text>
      </g>
    {%- endfor -%}
  </defs>
  {%- for n in (0..7) -%}
    <use href="#box{{n}}"
        x="{{forloop.index0 | times: 40}}"
        y="0"
    />
  {%- endfor %}
  {%- for n in (0..7) -%}
    <use href="#box{{n | plus: 1 | modulo: 8}}"
        x="{{forloop.index0 | times: 40}}"
        y="40"
    />
  {%- endfor %}
  {%- for n in (0..7) -%}
    <use href="#box{{n | plus: 2 | modulo: 8}}"
        x="{{forloop.index0 | times: 40}}"
        y="80"
    />
  {%- endfor -%}
</svg>
```
{% endraw %}
<svg width="100%" height="120" viewbox="0 0 320 120">
  <defs>
    <clipPath id="clip34">
      <rect x="3" y="3" width="34" height="34" />
    </clipPath>
    {%- for n in (0..15) -%}
      <g id="box{{n}}">
        <rect x="3" y="3" width="34" height="34" />
        <text x="20" y="20" clip-path="url(#clip34)">
          {{-n-}}
        </text>
      </g>
    {%- endfor -%}
  </defs>
  {%- for n in (0..7) -%}
    <use href="#box{{n}}"
        x="{{forloop.index0 | times: 40}}"
        y="0"
    />
  {%- endfor %}
  {%- for n in (0..7) -%}
    <use href="#box{{n | plus: 1 | modulo: 8}}"
        x="{{forloop.index0 | times: 40}}"
        y="40"
    />
  {%- endfor %}
  {%- for n in (0..7) -%}
    <use href="#box{{n | plus: 2 | modulo: 8}}"
        x="{{forloop.index0 | times: 40}}"
        y="80"
    />
  {%- endfor -%}
</svg>
That looks a lot like it could use a nested loop, but I can't figure out how to
add two variables together, so I couldn't make it work that way.

Is it really worth it, trying to generate an SVG file from source,
programmatically, rather than just using some kind of editor?

Well, no, probably not but I did it anyway.  I change my mind so often that as
a project grows it gets progressively more tedious to re-arrange all the
components and update the individual elements.  Something CSS is meant to
simplify.

So onwards I grind...

### Iterating over strings, instead
While arithmetic is painful, you can convert simple ASCII plans for a diagram
with a bit of string manipulation.  Splitting, mostly.  So you can make 2D
arrays with two different delimiter characters:
{% raw %}
```liquid
<svg width="100%" height="120" viewbox="0 0 320 120">
  {%- assign table = " 0 1 2 3 4 5 6 7
                    : 1 2 3 4 5 6 7 0
                    : 2 3 4 5 6 7 0 1" %}
  {%- assign rows = table | split: ":" %}
  {%- for row in rows %}
    {%- assign cells = row | split: " " %}
    {%- for cell in cells %}
      <use href="#box{{cell}}"
          x="{{forloop.index0 | times: 40 | plus: 2}}"
          y="{{forloop.parentloop.index0 | times: 40 | plus: 2}}"
      />
    {%- endfor %}
  {%- endfor %}
</svg>
```
{% endraw %}

### Adding colour
Using approximately the same transparency trick before it's possible to define
a bunch of colours and then use those colours to tint solid objects to
highlight that they share some property, or whatever.  That's just standard CSS
stuff.

Here's a palette devised by rotating around hue in steps of 360/phi while
slowly ramping down the brightness and saturation to try to maximise the
distance between colours:
{% raw %}
```liquid
<style>
  svg {
    {%- for n in (0..20) %}
      --unique-color{{n}}: hsl({{-n | times: 222.5 | modulo: 360}},
                               {{-n | times: -3 | plus: 100}}%,
                               {{-n | times: -2 | plus: 50}}%);
    {%- endfor %}
  }
  {%- for n in (0..20) %}
  .tint{{n}} {
    fill: var(--unique-color{{n}});
    fill-opacity: 0.125;
  }
  {%- endfor %}
</style>
```
{% endraw %}
<style>
  svg {
    {%- for n in (0..18) %}
      --unique-color{{n}}: hsl({{-n | times: 222.5 | modulo: 360}},
                               {{-n | times: -3 | plus: 100}}%,
                               {{-n | times: -2 | plus: 50}}%);
    {%- endfor %}
  }
  {%- for n in (0..18) %}
  .tint{{n}} {
    fill: var(--unique-color{{n}});
    fill-opacity: 0.125;
  }
  {%- endfor %}
</style>

{% raw %}
```liquid
<svg [...] >
  <defs>
    {%- for n in (0..7) %}
      <g id="cbox{{n}}" class="tint{{n}}"><use href="#box{{n}}" /></g>
    {%- endfor %}
  </defs>
  [...]
</svg>
```
{% endraw %}
<svg width="100%" height="120" viewbox="0 0 320 120">
  <defs>
    {%- for n in (0..7) %}
      <g id="cbox{{n}}" class="tint{{n}}"><use href="#box{{n}}" /></g>
    {%- endfor %}
  </defs>
  {%- assign table = " 0 1 2 3 4 5 6 7
                    : 1 2 3 4 5 6 7 0
                    : 2 3 4 5 6 7 0 1" %}
  {%- assign rows = table | split: ":" %}
  {%- for row in rows %}
    {%- assign cells = row | split: " " %}
    {%- for cell in cells %}
      <use href="#cbox{{cell}}"
          x="{{forloop.index0 | times: 40 | plus: 2}}"
          y="{{forloop.parentloop.index0 | times: 40 | plus: 2}}"
      />
    {%- endfor %}
  {%- endfor %}
</svg>
There.  A touch of synaesthesia to emphasise the presence of diagonal stripes
if the digits didn't already do it for you.

### Grouping related objects for mouse-over highlighting
To make it possible to for the user to choose to emphasise one class of thing
(like all the '0' tiles below), a `:hover` property can be used.  It can
even be animated without JavaScript.
{% raw %}
```liquid
<style>
  @-webkit-keyframes glow {
    0% { fill-opacity: 0.5; }
    50% {fill-opacity: 0.0; }
    100% {fill-opacity: 0.5; }
  }
  {%- for n in (0..20) %}
  .tint{{n}}:hover {
    fill:var(--unique-color{{n}});
    fill-opacity: 0.50;
    font-weight: bold;
    font-size: larger;
    -webkit-animation-name: glow;
    -webkit-animation-iteration-count: infinite;
    -webkit-animation-duration: 1.5s;
  }
  {%- endfor %}
</style>
```
{% endraw %}
<style>
  @-webkit-keyframes glow {
    0% { fill-opacity: 0.5; }
    50% {fill-opacity: 0.0; }
    100% {fill-opacity: 0.5; }
  }
  {%- for n in (0..20) %}
  .tint{{n}}:hover {
    fill:var(--unique-color{{n}});
    fill-opacity: 0.50;
    font-weight: bold;
    font-size: larger;
    -webkit-animation-name: glow;
    -webkit-animation-iteration-count: infinite;
    -webkit-animation-duration: 1.5s;
  }
  {%- endfor %}
</style>

If you apply the class to a whole `<g>` group, then (at least as far as I've
tested) everything inside the group reacts to the `:hover` style in unison:
{% raw %}
```liquid
<svg width="100%" height="640" viewbox="0 0 640 640">
  {%- assign table = " 0  1  2  3  4  5  6  7   8  9 10 11 12 13 14 15
                     : 8  9 10 11 12 13 14 15  0  1  2  3  4  5  6  7
                     : 4  5  6  7  0  1  2  3  12 13 14 15  8  9 10 11
                     :12 13 14 15  8  9 10 11  4  5  6  7  0  1  2  3
                     : 2  3  0  1  6  7  4  5  10 11  8  9 14 15 12 13
                     :10 11  8  9 14 15 12 13   2  3  0  1  6  7  4  5
                     : 6  7  4  5  2  3  0  1  14 15 12 13 10 11  8  9
                     :14 15 12 13 10 11  8  9   6  7  4  5  2  3  0  1
                     : 1  0  3  2  5  4  7  6   9  8 11 12 13 12 15 14
                     : 9  8 11 12 13 12 15 14   1  0  3  2  5  4  7  6
                     : 5  4  7  6  1  0  3  2  13 12 15 14  9  8 11 10
                     :13 12 15 14  9  8 11 10   5  4  7  6  1  0  3  2
                     : 3  2  1  0  7  6  5  4  11 10  9  8 15 14 13 12
                     :11 10  9  8 15 14 13 12   3  2  1  0  7  6  5  4
                     : 7  6  5  4  3  2  1  0  15 14 13 12 11 10  9  8
                     :15 14 13 12 11 10  9  8   7  6  5  4  3  2  1  0" %}
  {%- assign pass = "0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15" | split: " " %}
  {%- for filter in pass %}
    <g class="tint{{filter}}">
      {%- assign rows = table | split: ":" %}
      {%- for row in rows %}
        {%- assign cells = row | split: " " %}
        {%- for cell in cells %}
          {%- if cell == filter %}
            <use href="#box{{cell}}"
                x="{{forloop.index0 | times: 40 | plus: 2}}"
                y="{{forloop.parentloop.index0 | times: 40 | plus: 2}}"
            />
          {%- endif %}
        {%- endfor %}
      {%- endfor %}
    </g>
  {%- endfor %}
</svg>
```
{% endraw %}

Enjoy these disco lights by waving your mouse over them:
<svg width="100%" height="640" viewbox="0 0 640 640">
  {%- assign table = " 0  1  2  3  4  5  6  7   8  9 10 11 12 13 14 15
                     : 8  9 10 11 12 13 14 15  0  1  2  3  4  5  6  7
                     : 4  5  6  7  0  1  2  3  12 13 14 15  8  9 10 11
                     :12 13 14 15  8  9 10 11  4  5  6  7  0  1  2  3
                     : 2  3  0  1  6  7  4  5  10 11  8  9 14 15 12 13
                     :10 11  8  9 14 15 12 13   2  3  0  1  6  7  4  5
                     : 6  7  4  5  2  3  0  1  14 15 12 13 10 11  8  9
                     :14 15 12 13 10 11  8  9   6  7  4  5  2  3  0  1
                     : 1  0  3  2  5  4  7  6   9  8 11 12 13 12 15 14
                     : 9  8 11 12 13 12 15 14   1  0  3  2  5  4  7  6
                     : 5  4  7  6  1  0  3  2  13 12 15 14  9  8 11 10
                     :13 12 15 14  9  8 11 10   5  4  7  6  1  0  3  2
                     : 3  2  1  0  7  6  5  4  11 10  9  8 15 14 13 12
                     :11 10  9  8 15 14 13 12   3  2  1  0  7  6  5  4
                     : 7  6  5  4  3  2  1  0  15 14 13 12 11 10  9  8
                     :15 14 13 12 11 10  9  8   7  6  5  4  3  2  1  0" %}
  {%- assign pass = "0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15" | split: " " %}
  {%- for filter in pass %}
    <g class="tint{{filter}}">
      {%- assign rows = table | split: ":" %}
      {%- for row in rows %}
        {%- assign cells = row | split: " " %}
        {%- for cell in cells %}
          {%- if cell == filter -%}
            <use href="#box{{cell}}"
{{-' '-}}       x="{{forloop.index0 | times: 40 | plus: 2}}"
{{-' '-}}       y="{{forloop.parentloop.index0 | times: 40 | plus: 2}}"
{{-' '-}}  />
          {%- endif %}
        {%- endfor %}
      {%- endfor %}
    </g>
  {%- endfor %}
</svg>

One might imagine how this could be useful when creating a graph with too many
lines to distinguish by colour, but being able to point at the key to highlight
that line on the graph itself.

### Optimisation
{% raw %}
With the last pattern it becomes important to acknowledge the `{%-` and `-%}` I've used in the Liquid code.  the addition of an hyphen on the left or the right deletes any whitespace on that side of the tag.  That's not generally a big deal but it builds up if you're selectively filtering a lot of stuff in needed loops.

I got dinged by some linting tools for generating HTML files which were too big and I got things under the threshold mostly by just adding those hyphens.  I also used `{%-''-%}` and `{%-' '-%}` at the start of lines I wanted to indent to dissolve this indents in the output.
{% endraw %}

Compression would be the next obvious step.  I suppose it should be possible to gzip SVG data down to a small fraction of the size and to mime64 encode it and inline it with `src="data:image/svgz+xml;mime64,..."` or outboard it as a separate file, but I'm not sure about how thoae options work with CSS and shared definitions and all that.  And I'm not sure that's a plug-in supported by Pages which works so the translation.


### SVG viewbox versus width and height
Worth mentioning because it confused me.  The view box is the rectangle within
the SVG coordinate space (the units the SVG `<rect>` and `<circle>` objects
use) which will be scaled to fit the minimum of the `width` and `height`
parameters in the context of whatever contains the SVG.

[CSS]: https://developer.mozilla.org/en-US/docs/Web/CSS
[SVG]: https://developer.mozilla.org/en-US/docs/Web/SVG
[Liquid]: https://shopify.github.io/liquid/basics/introduction/

