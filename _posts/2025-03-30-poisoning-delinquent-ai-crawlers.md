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

## What are we up against?

An intelligent thing to do here would be to step back and ask what the
scrapers are trying to achieve, and what sort of content they want, and
what they plan to do with it, and what they value and what their
expenses are.

From that one could deduce the most effective way to disrupt and
discourage that activity.

I didn't do that.

I just ran with some vague ideas on themes I'd already seen others
discussing.  I did mix in attempts to draw attention to `robots.txt`,
and to make obeying the rules the easiest way forward for everyone, in
the vain hope that they would choose that path if they noticed my
efforts.

When I hear talk of doing distributed scrapes from domestic IP addresses
I wonder if they could be using machines whose compute costs aren't
valued by the attacker.  And when I search for "AI scraping" I get
articles about how to use AI to collect structured data from other
websites in order to re-present it in a useful way, which would quickly
dismiss unstuctured generated garbage I discuss here.

But I just ran with what I had.

## My ideas
### Asymmetric-cost encryption

Hiding the content behind proof of work, like [Anubis][], involves
charging a small compute tax on every visitor, so that crawlers pay in
total a much greater costs than everyday, human-scale visitors.  And
human visitors, ideally, only have a negligible time delay added to
their own actions.  Ideally they can bypass it by being logged in to the
service with an account in good standing.

One way to achieve this, without risk of reverse engineering and bypass,
is if the work comes in the form of an asymmetric encryption scheme
which costs much more to decrypt than it does to encrypt.  And a simple
way to achieve that is to use a block cypher where you omit some bits
from each block and leave it to the client to guess what those missing
bits were.

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

### Using data compression as a content generator

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
bit stream into random text, without having any means to discriminate
between the two.

So you just pepper the site to be crawled with chunks of random noise,
or generate it server-side, or possibly encode something into the source
URL to signal that the JavaScript can skip the fetch and just generate
its own internally.

#### Making "decompressed" content more disruptive

This model-based entropy compression can be tuned to model any kind of
language, with any kind of slant, depending on what corpus it's trained
on.  Just like an LLM.  As a compression scheme it can still be
functional, but it'll sacrifice some compression efficacy when trying to
compress text not consistent with its training.  But when synthesising
text from random input it can freely revert to its training.  So if you
trained it on enough Jane Austen, it'll sound like Jane Austen, even
while it can theoretically transmit any normal message as well.

Also, it can be set up to cheaply encode internal links like a wiki, so
it would habitually make random internal links which could be captured
and converted to noise.

## Trying less hard

For all of the modelling and heuristic work which could be used to
create plausible text output, that all seems to miss an important
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
nevertheless I'll repeat what I've stumbled across as I went along...

To make a Mad Libs generator it turns out there are these [template
literals][] which do the job nicely.

```javascript
// randint() left as an exercise for the reader.
const pick = (choices) => choices[randint(choices.length)];

const ProperNoun = () => pick(["Donald", "Mickey", "Scooby"]);
const Verbed = () => pick(["jumped", "walked", "sat"]);
const Noun = () => pick(["the table", "the floor", `${ProperNoun()}'s foot`]);

var message = `${ProperNoun()} ${Verbed()} on ${Noun()}`;
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

With those basics in place it's pretty easy to just mash the keyboard
with a bunch of random ideas.  Clump ideas together to form whole
paragraphs or lists or code fragments.  Use some loops and some random
switches to randomise the order and combinations, and eventually you'll
be generating plenty of output.

Get the kids to help with their ideas, too.  Kids love Mad Libs!

If there's any chance that the human behind the scraper eventually has a
look at what they're scraping, then it might also be helpful to arrange
that every story to end with an important life-lesson about reading and
respecting `robots.txt` before scraping websites.

You'll also want to include transforms to pick out random fragments of
sentences and linkify them to another poison page, so there's always
more to crawl.

The way I like to do things is to use a predictable RNG which is seeded
from a hash of the URL, so everybody visiting the same URL gets the same
content, and every URL yields valid content, so I can generate internal
links without really thinking about the validity of those links because
they're always valid.

## But wait!  Scrapers won't do the work for us?

Crap.

Crap crap crapitty crap.

[Somebody did the research][Vercel] and it looks like most bots don't
execute JavaScript.  Google does, but I assume Google respects
`robots.txt` so there's no sense in poisoning that.

Well, OK.  So it has to be server-side generation, then.  But services
like [CloudFlare][CloudFlare Workers] let you run workers which can do a
modest amount of this for free, or do more of it for a bit of money.

Conveniently, you can write that in JavaScript too.  You pretty much
just have to slap together an HTML page and send it off in response to
any request.

But this is where performance really starts to matter.

### Performance

CloudFlare has a quota system, allowing 100000 requests to be serviced
every day, and each of those being allowed to run for up to 10ms (with a
lot of leniency).

The result of my current fumbling about with JavaScript can squeeze out
200kB in about 13ms (1.5MB/s).  I think that's pretty poor.  All the
code really needs to do is follow a programme of pasting short strings
together.  It's a task comparable in complexity to Lempel-Ziv
decompression, which can run around 1000-3000MB/s (10-30MB per 10ms); so
it's off by a factor of 1000.  It probably _should_ be possible to
deliver something in the range of 3-10MB in 10ms, for a daily quota of
up to one terabyte of "training data".

The first thing I tried tweaking was turning off outbound compression.
That _seemed_ to get me down from 33ms to 13ms, but the rule seems to be
more of a guideline, and a lot of traffic seems to take the old amount
of time and I can't verify whether or not it was compressed, and when I
try to load pages myself I find that they sometimes do come through
compressed, and I don't know why.

But 13ms still sucks.

It's easy to shrug and say JavaScript sucks (and it does), but it's also
commonly understood that if you use it right then it can do a decent
job of getting close to plain old C.

I'm clearly not using it right.  Let's not forget, I am not a JavaScript
developer.  I have no idea what the proper idioms are, or how people
work with or around the language in everyday use.  Most of the advice on
StackOverflow looks worryingly out of date, and I'm just hacking angrily
at something I do not understand for no reason but my own foolish
belligerence -- mixed with morbid curiosity.

But here's some stuff I noticed, all the same.

#### string composition

I made a few guesses and blindly optimised against them.  My first
thought was that I probably didn't want to composite a lot of strings
piecemeal.  That seems to be conventional wisdom.  Save it all up in an
array and use `.join()` to concatenate everytihng at once.  Otherwise
you end up doing many redundant copies concatenating pieces of strings
to other pieces of strings and then concatenating those to other
concatenated pieces.

#### string reference composition

Trouble is, the average string length in my early experiments was
something like 12 bytes.  I don't know how references to strings are
stored, but it's easy to imagine they're at least 8 bytes long, so
building the array of references isn't actually shunting that much less
data around.  However, it probably does have the benefit of working in
fixed-size allocations and having an array `push()` method which
understands that there will probably be more pushes imminently and
pre-allocating space for them is prudent.

#### single-buffer incremental string composition

Still; to be sure it doesn't get moved around halfway through I should
probably pre-allocate my own buffer and edit it in-place without needing
to grow it.  And if I'm doing to do that, maybe I just pre-allocate the
string buffer itself, rather than a buffer of pointers which will still
need another pass to form a contiguous string.

#### WTF JavaScript?

But something that stood out when I started reasoning about that is that
Javascript uses UTF-16, not UTF-8, so all those `TextEncoder().encode()`
calls have to actually do work.

At least that's what the internet told me.  It is possible that a
runtime could optimise this into storing UTF-8 internally and just
pretend to be using UTF-16 to the application in the hope that the
conversion savings outweigh the complexity of the fakery.

#### Pre-UTF-8-encoding string literals

Since all I want to do is paste strings together over and over in
different arrangements, it seems silly to re-run the encoding logic over
and over to get the same answers over and over.  So a bit of a hack to
transcode the strings at start-up is in order.  That should be easy,
give or take those template literals mentioned earlier.

Oh, and scope.  While you might want to keep some definitions local to a
function for clarity, you get taxed on that by having to re-create the
object every time the function is entered.  I couldn't find a `static
const` to fix that.  Classes have `static` (but not `static const`?) but
apparently functions do not.

#### Memoised conversions for local literals

You might memoise the conversions, but you're quickly burning up good
will with your CPU cache on table lookups.  At best you might hope to
minimise the table by leaving all the globals _out_ of the table since
they've already been replaced once and then won't be revisited, and then
the tables can focus on just the locals.  But "don't do it at all" is
still the best optimisation.

#### Moving templates to global scope

Hoisting the literals to more permanent scope also proves to be a little
tricky.  It turns out those template literals can't refer to variables
which aren't defined when they template literal is defined.  That seems
fair, but if you have a function which has some useful dynamic context
(eg., the content of the URL that triggered the generation) it has to be
put somewhere, and ideally not in a global variable.

#### What I ended up with (so far)

In the end I went with a decoder object whith a method to expand things
recursively; handling several types of object as it goes.

First, template literals are tagged with `ml` and the function to handle
those just converts (memoised, perhaps unnecessarily) the literal
strings to UTF-8 and stores those and the argument values in an object.

Then in the main compositing function, if it's an array then pick a
random entry from said array and carry on.  If it's a UTF-8 string then
copy it in, if it's one of the above `ml` objects then expand that into
alternating runs of UTF-8 strings and other argument types.  If it's a
link object then emit some HTML and emit the argument twice -- once as
the link target, then again as the linked text, then go back and clean
the dangerous characters out of the link (use a size-preserving squash
rather than %-encoding to avoid complexity).  Etc...

Those locals that cannot be put into a template literal are instead
copied into a reference object at initialisation, and extra logic can
look up names in that as needed without the names needing to be defined
when the template is created.

But as I say, overall this still misses by three orders of magnitude.
It's not ideal.

#### A little more investigation

I already know the code that is there today has no hope of meeting the
target.  Deliberate optimisation would involve changing so many other
things, but I'm not going to do that without having a much better idea
how to insrument and profile JavaScript code properly.

That said, I did have a fiddle with the developer tool option offered by
wrangler and that did give a few additional hints.  For example, where I
thought "Just one little local template, when I've already memoised the
conversions, what possible harm?" yields the answer "a lot!".

Come on, JavaScript.  Make an effort!

And while it's tempting to assume that every library call is a highly
optimised routine which must be faster than doing the same thing
by hand in JavaScript, it turns out that the interfaces can cause the
garbage collector to come in and ruin everything -- because where's the
damned stack?  So maybe it actually is better to pay the overhead of
JIT-compiled code in order to avoid the temporary buffers needed to
communicate with the library calls.

That `forEach()` method was a disappointment, too.  I'm not sure what
the intent there is, but it didn't help me any.  More unexpected
temporaries, more garbage collection.  Get rid of that.

But at least the template literals offer a comparatively tidy syntax for
mad-lib style solutions, compared to C++.  So it's got that going for
it, which is nice.

An update to celebrate April Fool's Day; here's a live example:

<https://wiki.6502.pro> (with [source](https://github.com/sh1boot/madlib123))

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
