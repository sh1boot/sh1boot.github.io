---
layout: post
title:  "Font-based digit grouping"
categories: font, digit grouping, terminals
draft: true
---

A while back I got frustrated with struggling to read absurdly large numbers in
terminal windows, and set about thinking how I might apply some logic in the
terminal to subtly bunch together groups of three digits as a form of thousand
separator.

I did nothing about that for years and then I got the idea to do it in the
font, and when I went looking into that I discovered [numderline][].  Using the
font is a bit restrictive in that not every terminal respects the ligature
rules that are needed, but if you have such a terminal then I would say it
works quite well.

Except when your cursor is in the middle of a number, or your number wraps
around the edge of the terminal, or you're currently typing a number in and
everything starts to dance.  But one gets used to such things eventually.

I didn't really get along with the underline-based grouping, though, so I
started [hacking on it][my version], adding hexadecimal support (based on `0x`
prefix, meaning it overlooks things like git hashes) and using so-called "font
features" which can be switched on and off externally to the font so it can be
reconfigured without the need for multiple versions of the font file.

I didn't do Indian or Chinese spacings, though.  I got bored of the effort
before getting that deep in.  I should probably fix it, but there are other
problems like the damage done to the other font features in the input file.
Some rando on GitHub made a suggestion about that but I still haven't found
time to follow up.

Making the font configurable meant looking into what the proper way to
configure it would be.  I had to make up my own four-character codes, and there
was a lot in the standard about specifying rules only for certain languages and
scripts; and I feared that the proper thing would be to auto-detect the
language and choose the rules accordingly.

But on looking closer at some other documents it seems that that's not the
thing to do.  All this behaviour should be controlled by the application
program.  Which, I guess, means making distinct 4CCs for grouping by 3, 4, or
3-then-2 before the decimal separator, and grouping by 3, 4, or 5 after the
decimal separator.  And whether or not to support hexadecimal, I guess, but
really that's probably a bit niche, and `0x` is certainly not the only hex
prefix out there.

All of this could be complicated by an international userbase which is used to
dealing with English software which doesn't support their native systems
properly (and, little by little, a userbase which doesn't even know their own
native systems any more), meaning that sometimes localisation efforts can be
seen as unhelpful and confusing.  A good reason for the font to not make its
own attempt, I guess.

But if you use font ligatures on a website then you can choose different
display settings via CSS, without changing the underlying text and making
copy-paste even more of an internationalisation headache than it was already.


[my version]: <https://github.com/sh1boot/numderline/>
[numderline]: <https://blog.janestreet.com/commas-in-big-numbers-everywhere/>
[numderline 2]: <https://thume.ca/2019/11/02/numderline-grouping-digits-using-opentype-shaping/>
