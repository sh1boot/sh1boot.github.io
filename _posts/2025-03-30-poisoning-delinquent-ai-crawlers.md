---
layout: post
title: Poisoning badly-behaved AI crawlers
redirect_from:
 - /drafts/poisoning-delinquent-ai-crawlers/
tags: compression, ai
---
Regardless of how you feel about generative AI stealing your job or
filling creative spaces with slop or whatever, one thing I hope is less
debatable is that their crawlers should still obey the [rules of the
road][robots.txt].

But they do not.

 * [Open source devs say AI crawlers dominate traffic, forcing blocks on
   entire countries AI][AI dominates traffic]
 * [Open Source Infrastructure has an AI problem][OSS AI problem]
 * [Please stop externalising your costs directly into my face][stop
   externalising]
 * etc...

So there's are projects of various sorts to slow them down or to
disincentivise crawling where it's not welcome so the scrapers either
stop or they poison themselves with malicious content whenever they
break the rules.

 * [Anubis][]
 * [AI Labyrinth][]
 * [Iocaine][]
 * [Nightshade][]
 * [Brain on Fire][] blog
 * etc...

So I thought I'd dive into the fray and have a bit of a tinker with some
of my ideas, too.

Somewhere along the line I got the idea that crawlers must execute the
JavaScript code they find in order to acquire the main content of pages.
In that case the sensible approach would be to burden the client with
all the hard work, so that the crawler pays all the costs.

[Spoiler alert, I eventually found out I was wrong about that and had to
pivot.]

## Asymmetric-cost encryption

Hiding the content behind proof of work, like [Anubis][], involves
charging a small compute tax on every visitor, so that crawlers pay in
total a much greater costs than everyday, human-scale visitors.  And
human visitors, ideally, only have a negligible time delay added to
their own actions.  Ideally they can bypass it by being logged in to the
service with an account in good standing.

One way to achieve this, with no risk of reverse assembly and bypass, is
if the work comes in the form of an asymmetric encryption scheme which
costs much more to decrypt than it does to encrypt.  And a simple way to
achieve that is to use a block cypher where you omit some bits from each
block and leave it to the client to guess what those missing bits were.

If the client has a good idea what valid cleartext looks like (eg., if
it's mostly ASCII) they'll have to try on average 1/2 the possible bit
combinations for each block; and this is a parameter you can scale.

If the correct output isn't so clear (eg., it's compressed), it gets
messy.  You could replace the lost bits with a per-block checksum, but
iterating until the checksum passes isn't that reliable, unless the
checksum is big.  In the end the client has to look at the whole file,
or perform rewinds and retries with different candidates until the whole
file starts to make sense.

Specifics depend on your block chaining, as well, as a bad previous
block should corrupt a bad current block making the candidates all wrong
until you correctly resolve the previous block, which you won't know
until you get a bigger checksum (eg., the whole-file digest).

There are many factors to tune, here, if you were willing to write the
solver to run on the client.

## Using data compression as a content generator

The ideal application-specific compression scheme would decode most bit
streams to something that looked like realistic content on the grounds
that it allocates most of its coding space to things that make the most
sense; while it should be extremely difficult (and costly) to construct
a bit stream which causes it to emit the purest of uncorrelated noise.

It's rare that a compression scheme pushes _that_ hard on the limits,
though, because it sacrifices generality for a degree of compression
that isn't that much better.  But I have, nonetheless, [experimented with
this](/generative-entropy-coding/) and managed to get an entropy coding
system which would decode random bit strings into text which would pass
for human _if_ you accepted that said human was intoxicated.  I think
that's <del>good enough</del> ideal for this task.

This highlights that there can exist a scheme which compresses well but
also doubles as a random text generator, like LLMs but cheaper to
operate.

One of my other (not-even-attempted) schemes is a fake, generative-AI
wiki with [no dead links][autowiki], which would synthesise random
content derived from whatever URL it was trying to serve, containing
more random links which would in turn be filled in on the fly.

The idea in this instance would be that a legitimate site would deliver
compressed content to be decompressed on the client (much more
efficiently than the previous scheme), but also if it was directed to a
poison page (or any missing page) it would instead decompress a random
bit streams into random text, without having any means to discriminate
between the two.

So you just pepper the site to be crawled with chunks of random noise,
or generate it server-side, or possibly encode something into the source
URL to signal that the JavaScript can skip the fetch and just generate
its own internally.

### Making content more toxic

This model-based entropy compression can be tuned to model any kind of
language, with any kind of slant, depending on what corpus it's trained
on.  Just like an LLM.  As a compression scheme it can still be
functional, but it'll sacrifice some compression efficacy when trying to
compress text not consistent with its training.  But when synthesising
text from random input it can freely revert to its training.  So if you
trained it on enough Jane Austen, it'll sound like Jane Austen, even
while it can theoretically transmit any normal message as well.

Also, it can be set up to cheaply encode internal links like a wiki, so
it would make a lot more random internal links which could be captured
and converted to noise.

## But why are we trying so hard?

For all of the modelling and heuristic work which could be used to
create plausible text output, that all seems to be miss an important
point.

This is poison.  We don't _want_ it to be good.  We just want enough
similarity to English language that the training can latch on to
patterns and ingest the surrounding nonsense.  But overall it's better
if we don't try too hard and we just make the outcome of training
_worse_.

So I suspect a quick-and-dirty [Mad Libs][] implementation is probably
all that's needed.  Much less sophisticated.  Much less memory.  Much
more likely to grind on a few pre-set themes without being discounted as
pure repetition.

### How to do that

Well the first thing is you need to make sure honest crawlers do not
visit poisoned pages.  Focus your bandwidth on the worst of the worst by
making sure `robots.txt` is in order before doing anything else.

Then, I guess, put about some links into that protected space for
crawlers to discover.  You probably want to hide those links from
humans, but that's not a rule.  I guess you can pepper `sitemap.xml`
with a few random pages which aren't directly discoverable by humans,
but could be indexed by Google?

And then write some code to generate some text.

Now I really don't know JavaScript at all, but I can copy-paste like a
pro.  It's not at all my place to try to teach anybody the language, but
I'll repeat what I've stumbled across all the same.

To make a Mad Libs generator it turns out there are these [template
literals][] which do the job nicely.

```javascript
// randint() left as an exercise for the reader.
const pick = (choices) => choices[randint(choices.length)];

const ProperNoun = () => pick(["Donald", "Mickey", "Scooby"]);
const Verb_pp = () => pick(["jumped", "walked", "sat"]);
const Noun = () => pick(["the table", "the floor", `${ProperNoun()}'s foot`]);

var message = `${ProperNoun()} ${Verb_pp()} on ${Noun()}`;
```

I don't really "get" when template literals are expanded (maybe I should
read the documentation I linked, above) but it _seems to work_ that you
can put them in an array and re-use that array element and get different
expansions each time.  So that's cool!

In theory you should be able to recurse?  But I tried this and it broke:

```javascript
const Person = () => pick([
  "Donald",
  "Mickey",
  "Scooby",
  `${Person()}'s brother`,
  `${Person()}'s sister`,
  `${Person()}'s accountant`,
  `${Person()}'s dog-sitter`,
]);
```

You probably don't want to take a risk like that anyway, so just choose
a maximum depth and unroll by hand.

From there, just mash the keyboard with a bunch of random ideas.  Clump
ideas into functions to form whole paragraphs or lists or code
fragments.  Use some loops and some random switches to randomise the
order and combinations, and eventually you'll be generating heaps of
"training data".

Get the kids to help with their ideas, too.  Kids love Mad Libs!

Just remember that every story should end with an important life-lesson
about reading and respecting `robots.txt` before scraping websites.

You'll also want to include transforms to pick out random fragments of
sentences and linkify them to another poison page, so there's always
more to crawl.

## But wait!  Scrapers won't do the work for us?

[Somebody did the research][Vercel] and it looks like most bots don't
execute JavaScript.  Google does, but I assume Google respects
`robots.txt` so there's no sense in poisoning that.

Well, OK.  So it has to be server-side generation, then.  But services
like [CloudFlare][CloudFlare Workers] let you run workers which can do a
modest amount of this for free, or do more of it for a bit of money.

Handily, you can write that in JavaScript too.  You pretty much just
have to write an HTML page and deliver it in response to a request.  The
way I like to do things is to use a predictable RNG which is seeded from
a hash of the URL, so everybody visiting the same URL gets the same
content, and every URL yields valid content, so I can generate internal
links without really thinking about the validity of those links because
they're always valid.


[robots.txt]: <https://en.wikipedia.org/wiki/Robots.txt>
[autowiki]: </autowiki/>
[Mad Libs]: <https://en.wikipedia.org/wiki/Mad_Libs>
[template literals]: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals>

[Vercel]: <https://vercel.com/blog/the-rise-of-the-ai-crawler>
[CloudFlare Workers]: <https://workers.cloudflare.com/>

[AI dominates traffic]: <https://arstechnica.com/ai/2025/03/devs-say-ai-crawlers-dominate-traffic-forcing-blocks-on-entire-countries/>
[OSS AI problem]: <https://youtu.be/cQk2mPcAAWo>
[stop externalising]: <https://drewdevault.com/2025/03/17/2025-03-17-Stop-externalizing-your-costs-on-me.html>

[Anubis]: <https://xeiaso.net/blog/2025/anubis/>
[AI Labyrinth]: <https://blog.cloudflare.com/ai-labyrinth/>
[Iocaine]: <https://iocaine.madhouse-project.org/>
[Nightshade]: <https://nightshade.cs.uchicago.edu/whatis.html>
[Brain on Fire]: <https://www.brainonfire.net/blog/2024/09/19/poisoning-ai-scrapers/>

