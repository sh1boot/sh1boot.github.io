---
last_modified_at: Sat, 3 Aug 2024 12:34:18 -0700  # 29ae209 permissions-fixes
layout: post
title:  Font-based digit grouping
categories: font, digit grouping, terminals
draft: true
---
A while back I got frustrated with struggling to read absurdly large numbers in
terminal windows, and set about thinking how I might apply some logic in the
terminal to subtly bunch together groups of three digits as a form of thousand
separator.  Eventually it occurred to me to try doing it in the font with
ligature rules (initially as a joke, but then I looked into it) and it turns
out [Numderline][] is a thing which does that.

Well, it does it in terminals which support font ligature rendering, with
caveats about efficiency, cursor placement, screen edges, and digits which
dance as you type... but I would suggest these compromises have been worth it.

You could discover that for yourself, of course, so what am I adding?

I didn't really get along with underlines for [digit grouping][].  I would
prefer to stick with spaces, because they're a more common convention.  So I
[hacked around][my version] a bit, tweaking up the spacing support and adding
hexadecimal support (that is, things starting with `0x` grouping by fours).

Because my emphasis was on adding a gap (and optionally filling it with
a comma or period [TODO: apostrophe]) but based on a tool which
emphasised adding markup, I fairly lazily used extra glyphs to implement
what would usually be in `GPOS` rules.  What I should _really_ do is
insert thin spaces (or commas or periods or apostrophes or some distinct
and not-misleading variation on those glyphs) into the string directly,
and if it's a monospaced font then use `GPOS` to reflow those glyphs
into their proper cells.

I just have to confirm that terminals actually apply `GPOS` effectively
when they're trying to do glyph caching and all that.  It might also be
prudent to squeeze the digits in both directions away from the gap, so
that they deviate from their character cell less far, and are less
likely to be clipped.

But also, since I found that most (not all) terminals support it, and [CSS also
supports it][CSS font features], I decided to rely on so-called "font features"
to make the digit grouping configurable.

The common way of stuffing extra ligature rules into a font is to put them
under the `calt` feature, which is on by default.  But in various applications
in various places where you choose your font, you should also have the option
of specifying a bunch of other features by [FourCC][] or by common names.
The [Iosevka][] font, for example, offers [extensive customisation][iosevka-cv]
in this space.

So to test this I used the codes `dgsp` ("digit spaces", I guess), `dgco`,
and `dgdo` (for commas and dots).

In CSS, for example, if using the patched font then spaces could be enabled
with:
```css
font-feature-settings: "dgsp";
```

Then I extended on that with `dgcd` and `dgdd` if you want such marks to the
right of the decimal point as well.  Personally I find that a bit disorienting
(especially when the dot has to be changed to a comma, which just is a big fat
lie), so I like to stick with spaces throughout.

But there's so much more that I did not do.  I did not implement Chinese
spacings (except in hexadecimal, I guess).  I did not do Indian spacing.  I
didn't do apostrophes as separators.  I did not add the option to group digits
after the decimal by fives like Wikipedia does.  I didn't do anything at all
for any numeral system outside of US-ASCII.

I also didn't do anything about things like git hashes, which have no prefix to
signal that they're hexadecimal.  They just come out messy.  What I probably
should do, there, is to disable decimal digit grouping for anything that abuts
a letter (though this falls down for, eg., currency, like `CAD1000000`).

TODO: all those things

And also I haven't figured out how to do all this without breaking the existing
ligature rules, because of the specific combination of tools and bug
workarounds needed to make forward progress (see for example the original
[Numbderline][Numbderline 2] mention of such).  Somebody helpfully posted [a
comment](https://github.com/sh1boot/numderline/issues/2#issuecomment-1781467431)
on my own bug on that matter, but I have not yet followed up.

TODO: that thing, too

Before going any further with extensive configurability, I stopped to ask
myself what the point of it all would be if I did do that, when I already have
what _I_ want.

In the abstract I think the principal benefit is not having to handle text in
quite such a locale-specific way (with an outstanding caveat about the decimal
comma versus dot, etc.).  It becomes a presentation-layer problem.  This means
you can cut and paste it elsewhere and you won't be foiled by extra glyphs
causing confusion in other software.  Application settings or CSS can make
their best effort at internationalised font configuration, but if you
copy-paste the text it's still in its original bare-bones format.

So I looked into more documentation on how and when to use font features, and
what to do with my made-up codes.

I found a lot of verbiage about language and script support, which seemed
sufficient to auto-detect the appropriate configuration.  Thankfully other
documentation said specifically to not do that (TODO: find that reference).
The application is meant to make all such decisions and signal what it wants by
configuring the font appropriately.

After all, this would be complicated by an international userbase who are used
to dealing with English software which doesn't support their native systems
properly (and, little by little, a userbase which doesn't even know their own
native systems any more), meaning that sometimes localisation efforts are seen
as unhelpful and confusing.  Certainly a strong case for the font not making
its own deductions.

I think configuring the font among many different conventions means reserving a
bunch of different "[features][OpenType features]" identifying different
conventions, for which I can (and already did) just go ahead and make up my
own.  But if a serious effort was worthwhile then things would need to be more
structured and complete.

And then I stopped, because I don't know of anybody who actually cares about
all that.

[my version]: <https://github.com/sh1boot/numderline/>
[Numderline]: <https://thume.ca/2019/11/02/numderline-grouping-digits-using-opentype-shaping/>
[Numderline 2]: <https://blog.janestreet.com/commas-in-big-numbers-everywhere/>
[Iosevka]: <https://typeof.net/Iosevka/>
[iosevka-cv]: <https://github.com/be5invis/Iosevka/blob/main/doc/character-variants.md>

[CSS font features]: <https://developer.mozilla.org/en-US/docs/Web/CSS/font-feature-settings>
[FourCC]: <https://en.wikipedia.org/wiki/FourCC>
[digit grouping]: <https://en.wikipedia.org/wiki/Decimal_separator#Digit_grouping>
[decimal separators]: <https://en.wikipedia.org/wiki/Decimal_separator#Other_numeral_systems>

[OpenType features]: <https://learn.microsoft.com/en-us/typography/opentype/spec/featurelist>
[enabling stylistic-sets]: <https://github.com/tonsky/FiraCode/wiki/How-to-enable-stylistic-sets>
