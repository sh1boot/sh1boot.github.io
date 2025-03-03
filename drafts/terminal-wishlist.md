---
layout: post
title: I wish my terminal could do these things
---

## A different palette for background colours
There are eight colours settable via `\e[30m` &hellip; `\e[37m` (maybe
another eight if you count `\e[1m` on top), and most terminals let you
assign these numbers to a palette of your choosing.  The trouble is,
they also assign those same colours to `\e[40m` &hellip; `\e[47m`.

This means if you use a light palette for high contrast against black,
then none of the other background colours can be used with anything but
a black foreground, because the contrast is too little.

Why not just have separate palettes?

![palette sample](/images/twopaletteterminal.png)

There are, of course, the 256-colour and true colour extensions in most
terminals, but not all software supports those, or configuring it is
just too much hassle.

Sometimes box-drawing will fail to line up with the background of
adjacent characters, but if I cared that much I'd just use the
256-colour colours to force it.

Stretch goal: include alpha in the configuration of the background
palette.  Not sure why.  Just for completeness or something.

## Font feature 4cc escape sequences

Fonts come with a few features like substitution and ligature rules
which are switchable based on four-cc "feature" tags.  It would be cool
to be able to selectively enable features on small parts of the text,
like syntax highlighting.  Do things in small caps, or whatever.

[background palette]: <https://github.com/wezterm/wezterm/discussions/6263>
[font-features]: <https://github.com/kovidgoyal/kitty/discussions/8378>
