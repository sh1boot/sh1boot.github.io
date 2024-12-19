---
layout: post
title:  Stupid font tricks
---
I thought I'd try creating an LFSR in font substitution tables to turn a
string of the same character into a random string of variants of that
character to make things appear more organic.

Here's a font feature file which converts a string of capital O into a
string which randomly switches between capital and lowercase O:
```
languagesystem DFLT dflt;

@oo=[o O];

lookup STUPIDIDEA {
    sub o @oo @oo @oo o @oo @oo @oo' by o;
    sub o @oo @oo @oo O @oo @oo @oo' by O;
    sub O @oo @oo @oo o @oo @oo @oo' by O;
    sub O @oo @oo @oo O @oo @oo @oo' by o;
    sub               O  O   O   O'  by o;
} STUPIDIDEA;

feature calt {
    lookup STUPIDIDEA;
} calt;
```

So you could ruin a perfectly good font by writing the above to
`font-feature-file.fea` and stuffing it into a font with fonttools:
```sh
fonttools feaLib font-feature-file.fea input.ttf -o output.ttf
```

The reason I wanted to do this is because I felt that emoji would
benefit.  Given a uniform-looking string like:

🌻🌻🌻🌻🌻🌻🌻🌻🌻🌻🌻🌻🌻🌻🌻🌻

The glyphs could vary between a couple of different flavours; and sets
of two or three (or alternating sets of twos and threes) could be
grouped together into a single glyph, with a bit of perspective and
overlap or other interaction between them to look even more natural.

The same could be done for a zombie horde:

🧟🧟🧟🧟🧟🧟🧟🧟🧟🧟🧟🧟🧟🧟🧟🧟

Or a graveyard, or a pile of moneybags, or a pile of piles of poop, or
whatever...

In fact, a string of just "zombie" could already be made into a random
arrangement of "zombie, man zombie, woman zombie"; which would require a
base-3 LFSR rule sort of like this:
```
languagesystem DFLT dflt;

@abc=[a b c];

lookup STUPIDIDEA {
    sub a @abc @abc @abc @abc a @abc' by a;
    sub a @abc @abc @abc @abc b @abc' by c;
    sub a @abc @abc @abc @abc c @abc' by b;
    sub b @abc @abc @abc @abc a @abc' by b;
    sub b @abc @abc @abc @abc b @abc' by a;
    sub b @abc @abc @abc @abc c @abc' by c;
    sub c @abc @abc @abc @abc a @abc' by c;
    sub c @abc @abc @abc @abc b @abc' by b;
    sub c @abc @abc @abc @abc c @abc' by a;

    sub                    a  a   a'  by b;
} STUPIDIDEA;

feature calt {
    lookup STUPIDIDEA;
} calt;
```
Except that `a`, `b`, and `c` would need to be the names of the three
zombie glyphs.  Then you could merge some of these into ligatures:

```
lookup MERGE {
    sub a' a' a' by Z;
    sub b' b' b' by Y;
    sub c' c' c' by X;
    sub    a' a' by A;
    sub    a' b' by B;
    sub    a' c' by C;
    sub    b' a' by D;
    sub    b' b' by E;
    sub    b' c' by F;
    sub    c' a' by G;
    sub    c' b' by H;
    sub    c' c' by I;
} MERGE;

feature calt {
    lookup STUPIDIDEA;
    lookup MERGE;
} calt;
```

And so forth.  But it requires drawing a lot of extra glyphs and
clusters of glyphs to get there.

There might be a bit of mathematics about where to use combinations of
three and combinations of two so that you don't fall into a short loop.
I don't know the solution to that, though.  If you always group the same
number of glyphs it'll definitely be fine.
