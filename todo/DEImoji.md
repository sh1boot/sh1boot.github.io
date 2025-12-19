---
layout: post
title: DEImoji font
---

I wrote up 99% of this idea in [stupid font tricks][], but I was
thinking that where Unicode has a lot of man/woman/person emoji, and
five shades of skin tone on top of that, the generic case could be
hijacked to emit a random variation based on a hash of the surrounding
text, and groups of uniformly generic people would become a diverse mix
of all that Unicode has to offer at that codepoint.

I think Google's [Noto Emoji][] font is distributed in a form that might
let me hack that into it, but I have to do some fiddling to see.

And of course, if I'm hashing the surrounding context I'm not restricted
to cycling between existing glyphs.  I can also add ones for which there
is no specific codepoint.


[stupid font tricks]: </stupid-font-tricks/>
[Noto Emoji]: <https://github.com/googlefonts/noto-emoji>
