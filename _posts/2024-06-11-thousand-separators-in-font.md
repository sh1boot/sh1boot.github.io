---
last_modified_at: Fri, 13 Dec 2024 12:45:34 -0800  # ad6fdfb example-fonts-for-thousand-separation
layout: post
title:  Font-based digit grouping
categories: graphics, font, digit grouping, terminals
draft: true
---
Struggling to read absurdly large numbers in terminal windows many years
ago, I wondered how I might apply some logic in the terminal to subtly
bunch together groups of three digits as a form of [thousand
separator][digit grouping].  Eventually it occurred to me to try doing
it in the font with ligature rules (initially as a joke, but then I
looked into it) and it turned out [Numderline][] was a thing which
already did that.

But I didn't get along with underlines for digit grouping.  So I
spent some time [hacking around][my mess], tweaking it, and adding
hexadecimal support (that is, things starting with `0x` grouping by
fours), and generally making a huge mess, and struggling with bugs[^1] I
couldn't overcome.

So I [started again][my version].

### Why in the font?

The pragmatic answer is because I can usually insert a font as a
solution where the software doesn't already do what I want.

The more ambitious answer is that it does better at
abstracting the problem out to the presentation layer.  The application
doesn't have to worry about implementation details of presenting
thousand separators and trying to ensure that copy-paste operations
aren't impeded by the added characters.  It just has to relay the right
configuration to the font, and then render that font the way it asks to
be rendered.

And I want to reiterate, the underlying text does not have to be
modified.  There's no confusion between a string with this or that
thousand separator and a string which is meant to be parsed by another
tool.  With one caveat about the decimal separator they're the same
thing.  Even if the application bungles the locale settings, the
underlying text is _not_ going to get any worse, and is still bare-bones
copy-pasteable.

### Why not in the font?

- It's not designed for that?
- It's a solution using made-up codes which are not a part of any
  standard.
- Basically no fonts support it so it's rarely going to work, and even
  if you provide a known-working font the user should have the ability
  to override that font, and theirs probably won't support it.
- My feeling (untested) is that the complexity of the tables I've added
  to achieve this can't be very efficient.
- In a terminal emulator the cursor placement is a bit off; and the
  spacing of numbers are interfered with by spurious details like the
  edge of the screen, the position of the cursor, and their interactions
  with implementation details of each terminal.
- In terminals and text entry boxes, the digits can dance around as you
  type, which can be disconcerting.  Or as I've observed with Chrome,
  they don't update properly while you're typing except for sometimes
  when you don't expect it, but even then only partially.

### What I have now

I have a [font patcher][my version] which modifies a font to group sets
of three digits into thousands (threes digits only; sorry rest of the
world), four hexadecimal digits into 16-bit words, and five fractional
digits into whatever unit 10e-5 is.  I don't like that last one but it
seems to be a convention.

But also, since I found that most (not all) terminals support it, and
[CSS also supports it][CSS font features], I put everything under the
control of so-called "font features" to make a few things configurable
without re-patching the font.

Like this:
<div style="border-width:3px; border-style:solid; padding: 1em;">
  {% assign features = 'dgsp,dgap,dgco,dgdo,dgdc,dghx' | split: ',' %}
  <script>
    function sync_features() {
      var features  = [];
      {% for feature in features %}
        if (document.getElementById('{{feature}}-box').checked) features.push('"{{feature}}"');
      {% endfor %}
      const style = "font-feature-settings: " + features.join(", ") + ";";
      document.getElementById('font-test-box').setAttribute("style", style);
      document.getElementById('font-feature-view').textContent = style;
    }
  </script>
  <style>
    @font-face {
      font-family: "test-sans";
      src: url("/fonts/FiraDGSans-Regular.ttf");
    }
    @font-face {
      font-family: "test-mono";
      src: url("/fonts/FiraDGMono-Regular.ttf");
    }
    table { flex: 1em; }
    th { text-align: center; }
    td {
      font-size: large;
      text-align: right;
      width: 50%;
    }
  </style>
  <p>
  {%- for feature in features -%}
    <label><input type="checkbox" id="{{feature}}-box" onclick="sync_features()"
        {%- if feature == 'dgsp' %} checked{% endif %} />{{feature}}  </label>
  {%- endfor -%}
  </p>
  <code id="font-feature-view">font-feature-settings: "dgsp";</code><p/>
  <div id="font-test-box" style="font-feature-settings: 'dgsp';">
  <div style="display: flex; flex-flow: row wrap;">
  <table style="font-family: test-sans;">
  <tr><th colspan="2"><a href="/fonts/FiraDGSans-Regular.ttf">sans</a></th></tr>
{% capture testdata %}
  <tr><td>       1234.12</td> <td>0x1337</td></tr>
  <tr><td>      12345.12</td> <td>0x12deadbeef</td></tr>
  <tr><td>    1234567.12</td> <td>code1234</td></tr>
  <tr><td>   123.1234567</td> <td>1,000000</td></tr>
{% endcapture %}
{{testdata}}
  </table>
  <table style="font-family: test-mono;">
  <tr><th colspan="2"><a href="/fonts/FiraDGMono-Regular.ttf">mono</a></th></tr>
{{testdata}}
  </table>
  </div>
  </div>
</div>

In monospaced mode grouping involves moving digits closer together so
the group occupies the same space as before even after the addition of
the digit grouping separator.  In proportional mode the digit grouping
makes the number a bit wider.

### How it works
By default my new version uses `GPOS` rules to move the digits together
for monospaced applications, rather than inventing new glyphs (mostly)
like the old one did, and it uses [FontForge][]'s rule generation
directly because that lets me generate a `reversesub` rule without
crashing (though that interface also has its own bugs).

But it turns out some terminals don't work with `GPOS`, so there's a
separate mode to duplicate glyphs at different positions instead.

The process involves inserting a lot of table-based rules into the font;
first to mark out all the parts of the text containing digits, then more
rules to replace that markup with spacing glyphs at the proper
intervals, then more rules to remove all the cruft, then more rules to
change some of the spacing glyphs into different shapes.  If it's a
monospaced font then more rules shuffle things around a bit to make
numbers occupy the same space as if there were no thousand separators.

These rules are selectively enabled by different features, but the rules
must always run in the same order.  Within a lookup there are bail-out
rules to enable exclusion of specific patterns (there's no `[^a-z]xyz`,
so you need a test beforehand which bails out if it matches `[a-z]xyz`),
and these bail-outs don't reach across lookups so you can advance to the
next logical block that way.  If one block wants to prevent another from
running it can instead temporarily poison the text to prevent a
subsequent rule from matching it, and then a block at the end to mop
that up again.

For monospaced fonts, which are the ones I most care about, the glyphs
are shifted sideways to make room for the space without the group taking
up more space overall.  There are a few possible ways to shift things
around:
- move digits around the desired gap outwards
- move digits surrounded by gaps towards the middle
- move digits towards the [implicit] decimal point

So far I have only implemented the last two.  The last one is the one
that moves glyphs the furthest, which can introduce clipping problems on
terminals, _but_ it's the most reliable in terms of getting the expected
spacing.  Re-spacing around or between separators causes uneven gap
sizes or uneven spacing within a group of digits, which might look
a bit weird.

### How to use the result

The common way of stuffing extra ligature rules into a font is to put
them under the `calt` feature, which is on by default and you don't have
to think about how to enable it.  That's not what I did.  Instead, in
various applications in various places where you choose your font, you
should also have the option of specifying a bunch of other features by
[FourCC][] or by common names.  The [Iosevka][] font, for example,
offers [extensive customisation][iosevka-cv] in this space.

In CSS, for example, if using the patched font then spaces could be
enabled with:
```css
font-feature-settings: "dgsp";
```

Change that to `dgco` for comma separators, `dgap` for apostrophes,
`dgdo` for dots.

I've also added `dghx`, to force the grouping of hex strings without any
prefix as hexadecimal, and to group them appropriately.  This might be
useful when you have CSS markup on a column of data which is definitely
hexadecimal.  It's not a thing you would want to enable by default in a
terminal emulator.

The `dgdc` feature, to interpret comma as the decimal separator, is in a
similar situation; in most programming languages I can think of trying
to use a decimal comma would be problematic, but if you know the data
you have is like that then you can tag it as such to get the intended
spacing.

The way these are enabled in a terminal emulator varies, but there's
typically a way to do it in most of the terminals which support
ligatures.

### Doing it properly

Fonts live complicated lives dealing with a lot of different
expectations from different languages.  Digit grouping doesn't seem to
be an exception.

After reading some documentation my understanding is that even though
fonts have the means to tie configuration items to different languages
and scripts, the design intent of OpenType is that the application _is_
still on the hook for signalling all the locale-specific behaviours to
the font, so that the font can then deliver the right tables to the
shaper.

If one were to make a concerted effort on this there would be a bunch
more rules for all the different spacing rules around the world, and
feature names to enable each of them.

As far as I can tell, the process would involve reserving a bunch of
different "[features][OpenType features]" identifying different
conventions, for which I can (and already did) just go ahead and make up
my own.  If a serious effort was worthwhile then things would need
to be more structured and complete than what I've cobbled together,
though.

But I've entirely abandoned any notion of handling various conventions.
It's all much too complex and while I do not enjoy telling anybody to
conform to a monoculture I really don't have the energy for much beyond
one international standard.  Although I'm not sure what there is in the
way of international standards around fraction digit grouping.  I just
followed Wikipedia but I would prefer sixes or threes myself, to
continue the pattern of aligning with SI prefixes (in fact, looking at
the relevant [wikipedia
page](https://en.wikipedia.org/wiki/Metric_prefix#List_of_SI_prefixes),
they break from their own convention and use threes on that table!).

So that's where I stopped.  Because I have what I want and I'm not sure
anybody else in the world cares that much.

Things I guess _could_ be done:
- Apply similar logic to different scripts which have their own digits
  and have their own group separators.
- Include features to specify different grouping choices for whole
  numbers, whole hexadecimal numbers, and fractional numbers.
- Include features that describe independent separator glyphs for whole
  and fractional parts of numbers.


[^1]: see for example the original [Numderline][Numderline 2] mention of such).  Somebody helpfully posted [a comment](https://github.com/sh1boot/numderline/issues/2#issuecomment-1781467431) on my own bug on that matter, but I don't need to worry about that anymore.


[my mess]: <https://github.com/sh1boot/numderline/>
[my version]: <https://github.com/sh1boot/digitgrouper/>
[Numderline]: <https://thume.ca/2019/11/02/numderline-grouping-digits-using-opentype-shaping/>
[Numderline 2]: <https://blog.janestreet.com/commas-in-big-numbers-everywhere/>
[Iosevka]: <https://typeof.net/Iosevka/>
[iosevka-cv]: <https://github.com/be5invis/Iosevka/blob/main/doc/character-variants.md>
[FontForge]: <https://fontforge.org/en-US/>

[CSS font features]: <https://developer.mozilla.org/en-US/docs/Web/CSS/font-feature-settings>
[FourCC]: <https://en.wikipedia.org/wiki/FourCC>
[digit grouping]: <https://en.wikipedia.org/wiki/Decimal_separator#Digit_grouping>
[decimal separators]: <https://en.wikipedia.org/wiki/Decimal_separator#Other_numeral_systems>

[OpenType features]: <https://learn.microsoft.com/en-us/typography/opentype/spec/featurelist>
[enabling stylistic-sets]: <https://github.com/tonsky/FiraCode/wiki/How-to-enable-stylistic-sets>
