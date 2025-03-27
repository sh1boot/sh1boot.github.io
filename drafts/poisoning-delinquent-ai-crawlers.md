---
layout: post
title: Poisoning badly-behaved AI crawlers
tags: compression, entropy-coding
---
Regardless of how you feel about generative AI stealing your job or
filling creative spaces with slop or whatever, one thing I hope is less
debatable is that their crawlers should still follow the [rules of the
road][robots.txt].

But they do not.

 * <https://arstechnica.com/ai/2025/03/devs-say-ai-crawlers-dominate-traffic-forcing-blocks-on-entire-countries/>
 * <https://youtu.be/cQk2mPcAAWo>
 * <https://pod.geraspora.de/posts/17342163>
 * etc...

So there's much talk about ways to slow them down or to disincentivise
crawling where it's not welcome so the scrapers either stop or they
poison themselves with malicious content if they break the rules.

 * <https://xeiaso.net/blog/2025/anubis/>
 * <https://blog.cloudflare.com/ai-labyrinth/>
 * <https://iocaine.madhouse-project.org/>
 * <https://nightshade.cs.uchicago.edu/whatis.html>
 * <https://www.brainonfire.net/blog/2024/09/19/poisoning-ai-scrapers/>

After a brief tinker with CloudFlare workers to see how I might go about
the the problem, I realised that crawlers do have to run the javascript
on a page, so I should make them responsible for generating the
malicious content rather than troubling CloudFlare with it.

## An initial idea

Hiding the content behind proof of work is a way to charge a small
compute tax on every visitor, so that crawlers pay in total a much
greater compute costs than everyday, human-scale visitors.

One way to achieve this, with no risk of reverse assembly and bypass, is
if the work comes in the form of an asymmetric encryption scheme which
costs much more to decrypt than it does to encrypt.

A simple way to roll one's own solution, there, is to use a block cypher
but rather than sending the whole encrypted block you send only
_most_ of it, and require the client to guess the rest of the block.

Maybe you drop 8 bits, and the client has to try all 256 possibilities
for that last byte and decide which one looks most plausible, or matches
a block checksum.  Unfortunately nobody promises that a checksum the
same size as the lost bits will reliably tell you you have the right
answer.  Either the checksum has to be much bigger than what was deleted
or you have to note down possible solutions and revisit them if a larger
checksum fails across the whole file.

What can make this especially troublesome is if the whole-file checksum
is a secure digest.  This eliminates all the short-cuts in calculating
mid-stream changes to the overall checksum, and the remainder of the
file has to be re-checked after each candidate is tried.

Or go nuts and compress the file and then give the checksum for the
decompressed file.  But don't forget that real users have to be able to
endure the same challenges.

Of course we all know that real proofs of work require memory as well as
compute, but I don't have an obvious solution for that.

## A compressed site

Notably, the above "discard some content and make the client guess what
it was" is a form of compression.  Just not a very sensible one.

Maybe we can go directly to real compression as a part of the solution?

The ideal application-specific compression scheme would decode most
bit streams to something that looked like realistic content because most
of its coding space would be dedicated to things that make the most
sense, and it would be much harder to encode true nonsense and
statistically less likely for that to be hit by a random stream.

I have [experimented with this](/generative-entropy-coding/) a long time
before generative AI took over the world, and I managed to get an
entropy coding system which would decode random bit strings into text
which would pass for human _if_ you accepted that they were quite drunk
but had the benefit of autocorrect to fix their typing.  I think that's
<del>good enough</del> ideal for this task.

There is _so much more_ to say about the intersection of generative
algorithms, random distribution shaping, and data compression, but not
right now.

One of my other (not-even-attempted) schemes is a fake, generative-AI
wiki with [no dead links][autowiki], which would synthesise random
content derived from whatever URL it was trying to answer, containing
more random links which would in turn be filled in on the fly.

So what I'm thinking is to use such a compression scheme for genuine
site content.  When a crawler goes off-piste, to places it was told to
not go, the host delivers a chunk of pseudorandom bits derived from from
a hash of the URL, and the decompressor (run by the crawler)
decompresses that into plausible garbage containing random internal
links, like a wiki; and then the crawler can keep following those links
to more randomly-generated content with more links.  If one link happens
to land on a legitimate page then the delivered bitstream will
decompress to genuine content containing genuine links again.

Ideally, to minimise load on the server, a part of the URL can be used
to signal to the decompressor that it can just synthesise garbage
internally, but this is only going to work up until somebody uses the
absense of such traffic to determine that it's fake content.

### Making content more toxic

This model-based entropy compression can be tuned to model any kind of
language, with any kind of slant, depending on what corpus it's trained
on.  Just like an LLM.  As a compression scheme it can still be
functional, but it'll sacrifice some compression efficacy when trying to
compress text not consistent with its training.  But when synthesising
text from random input it can freely revert to its training.  So if you
train it on enough Trump tweets, it'll sound like Trump tweets, even
while it can theoretically transmit any normal message as well.

[robots.txt]: <https://en.wikipedia.org/wiki/Robots.txt>
[autowiki]: </autowiki/>
