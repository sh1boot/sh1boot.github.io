---
layout: post
title:  Stupid font tricks revisited
tags: graphics fonts vibe-coding
redirect_from:
  - /drafts/stupid-font-tricks/
---
Following on from my previous "[stupid font tricks][]" post, I went down a
handful of rabbit holes, including the design of the [non-binary LFSRs][] which
would be needed to generate the patterns.  More recently I got an AI to start
[hacking][DEImoji] on [Noto Emoji][] to make this actually happen.

Neither ChatGPT nor I are great graphic artists; but AI is a top-notch
plagiarist, so that was useful.

Like all my slopcoding projects it's a bit of a mess, but it gets the idea
across and that's all I ever hoped to accomplish.

Super-quick recap: OpenType fonts have embedded rules for ligatures and
contextual substitutions which give you the control to program all sorts of
silliness which modern font rendering engines support, so you can get these
effects in a lot of software just through manipulation of the font itself.

### Core ideas
#### random clustering
<p class="deimoji">🪦🪦🪦🪦🪦🪦🪦🪦🪦🪦🪦🪦</p>

For a long string of the same glyph, randomly ligate either two or three of the
characters.  This allows some depth to a cluster, where some instances can be
moved back a bit.

In the implementation I have so far, I use a binary, five-position LFSR.  That
is, depending on the last five decisions made in this class the next decision
will be whether to combine two or three of the same codepoint into a single
glyph.

five taps means the period is 31 (leaving out the all-zeroes case because LFSRs
are like that).  31 is prime, so it has the desirable property of making it
co-prime to any other generator I'm likely to contemplate in the short term.

#### Random skin-tone
<p class="deimoji">✊✊✊✊✊✊✊✊✊✊✊✊</p>

Since many emoji can be modified with a skin tone, of which there are five (you
can't really include Simpsons-yellow, because that stands out too much; as does
zombie-green).  So a base-five, four position LFSR inserts skin tone modifiers
against every emoji.  Whether they need it or not.

It doesn't have to be _used_ as skin tone, though.  It's just a modifier, and it
can make any random modification, even if it's just "more permutations".

#### Random gender
<p class="deimoji">🧑🧑🧑🧑🧑🧑🧑🧑🧑🧑🧑🧑</p>

Same deal as above; you can add male and female modifiers, or not.  Call that
base three, because the no-annotation option does work in this instance.

#### A stupid project name
The idea of imposing an even distribution of skin tones and genders across all
emoji is what puts the "DEI" into the "DEImoji" project name.

Not to coment on anybody's politics or ideals, of course.  It's just maths.

#### Random hair colour and age
I skipped these because it wasn't going to affect many of the emoji by leaning
on the pre-existing combining rules.  And more permutations is just more work
and more storage, and there's plenty of that already.

#### More permutations
<p class="deimoji">🧟🧟🧟🧟🧟🧟🧟🧟🧟🧟🧟🧟</p>
As mentioned, not all emoji can change skin colour or gender or hair colour.
But that doesn't prohibit the use of the combining markers to generate other
variations.

Zombies, for example, have their own skin tone.  So what I can do instead is
just make a bunch of random zombies with different looks, and mix them up into
five variants of pairs, and five variants of trios.  Then the random mix of
pairs and trios helps to break up the regularity even further.

### Where things get difficult
#### Longer generators
The longer you make a generator, the harder it is to seed.  This means that it's
likely to start with the same pattern and carry on with the same pattern, and
then the string will end before feedback can make it interesting.

#### PRNG seeding
My original plan was that I would scan a bunch of surrounding text to establish
some kind of randomised starting state for the LFSRs.  This fell through almost
immediately.  What I soon realised is that an emoji font is the fallback font
that the renderer will _switch_ to when its regular text can't provide a glyph.
That switch is a barrier to external context.  You can't hash the text leading
up to a string of emoji in order to establish a random starting state.

The effect of that is that every string of the same characters starts the same
way and continues the same way.  The runners always wear the same shirts and
follow the same pattern from that point on, and there's no entropy source to mix
it up and make it varied.  Under normal conditions you probably don't see more
than half a dozen emoji strung together, and they'll always be the same
variants up to the end of the string.

A small mitigation for this is to hash the whole string ahead of time.  At least
this way you get to make the best use of everything that is available.
Different length strings of the same character can start differently, and
continue differently, even if same-length strings must always be the same.

#### RTL PRNG seeding
To achieve this it's possible to make a right-to-left rule set, which iterates
from the end of the string back to the beginning, which can integrate characters
in the string into a running hash which then gets stored at the start of the
string.  The result of that pass can then be used by the PRNGs to go directly to
a starting state which integrates influence from the entire string.  Any
variation anywhere in the string can lead to a different starting condition.

But the string still ends when the font changes.  So a space or a period or an
obscure glyph that the main emoji font doesn't support resets the whole game.

#### Performance
Normally these are very short strings (unfortunate for variety) and the rules
are linear, so it's not a grossly disproportionate cost.  However, with a very
long string these rules can interact badly with line wrapping.

What happens is that the renderer has to figure out where to cut the string.
Those cuts are decided by some Unicode stuff, and that'll do whatever it does
without being affected by this.  However, to get the length of the string to
decide where to cut you have to work through these shaping rules.  Once you cut
it you then have to double-check that the cut didn't change the lengths of the
two pieces by interrupting a shaping rule.

In order to determine whether or not the cut changed the answer [HarfBuzz][]
keeps a running dependency check along the shaped string, indicating whether a
cut requires another shaping run to compensate, and how far that work must
extend before the old work can be re-used.

And by making the initial state of a PRNG depend on the whole string means that
there is _no_ place to cut which is free of that requirement.  And this is where
quadratic time starts to become a risk for very long strings.

So... just don't do that, I guess?

#### Improving performance
It is possible, but quite fiddly, to limit the length of the readahead.  You can
use forward rules to drop periodic barriers which interrupt the entropy sweeps.
The challenge is to define such a rule in a way that doesn't itself straddle the
barrier and cause a new dependency there.

I fiddled with this a bit and then decided that it wasn't worth the complexity,
and I defer to my previous solution.  Just don't do that.  Keep strings
sensibly sized.

<p class="deimoji">🌻🌻🌻🌻🌻🌻🌻🌻🌻🌻🌻🌻</p>
<p class="deimoji">🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉</p>
<p class="deimoji">🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥</p>
<p class="deimoji">💰💰💰💰💰💰💰💰💰💰💰💰</p>
<p class="deimoji">🎆🎆🎆🎆🎆🎆🎆🎆🎆🎆🎆🎆</p>


[stupid font tricks]: </stupid-font-tricks>
[non-binary LFSRs]: </non-binary-linear-feedback-shift-registers>
[Noto Emoji]: <https://github.com/googlefonts/noto-emoji>
[DEImoji]: <https://github.com/sh1bot/DEImoji>
[HarfBuzz]: <https://harfbuzz.github.io/>

<style>
  @font-face {
    font-family: "DEImoji";
    src: url("https://sh1bot.github.io/DEImoji/fonts/DEImoji-COLRv1.woff2")
         format("woff2");
    font-display: swap;
  }

  .deimoji {
    text-align: center;
    font-family: "DEImoji", sans-serif;
    font-feature-settings: "calt" 1, "kern" 1;
    font-size: 2em;
  }
</style>
