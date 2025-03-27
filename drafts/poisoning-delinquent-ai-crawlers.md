---
layout: post
title: Poisoning badly-behaved AI crawlers
---
Regardless of how you feel about generative AI stealing your job or
filling creative spaces with slop or whatever, one thing I hope is less
debatable is that their crawlers should still follow the [rules of the
road][robots.txt].

But they do not.

 * <https://youtu.be/cQk2mPcAAWo>
 * <https://pod.geraspora.de/posts/17342163>
 * etc...

So there's a lot of talk about ways to slow them down, or fill the space
beyond the no-trespassing signs with landmines of various sorts to keep
the scrapers busy on low-quality data whenever they break the rules.

 * <https://xeiaso.net/blog/2025/anubis/>
 * <https://blog.cloudflare.com/ai-labyrinth/>
 * <https://iocaine.madhouse-project.org/>
 * <https://nightshade.cs.uchicago.edu/whatis.html>
 * <https://www.brainonfire.net/blog/2024/09/19/poisoning-ai-scrapers/>

I had a bit of a tinker with CloudFlare workers to see how I might go
about such a thing myself, in a place that could handle the load, but
then I realised that I might be able to move even more of the load onto
the crawler itself.  Since most sites don't really work without
JavaScript, the crawler probably has to run the code, so that's the
ideal place to generate the garbage content.  Why trouble CloudFlare?

## An initial idea

One way to hide content behind proof-of-work without there being an easy
bypass would be to use an encryption scheme with an asymmetric cost,
where it's easy to encode but hard to decode.

A simple way to achieve that is by using a block cypher where you only
transmit a part of each block and the receiver has to guess the rest of
the block, trying every possible ending until it finds one that decrypts
to something which makes sense.  Guessing that you got it right is
probably not _too_ hard if you have plain old UTF-8 text, but otherwise
(eg., if the content is compressed) you might need a checksum included
to make sure.  Even a small a checksum might give multiple possible
solutions, so you should have a strong checksum across the whole file
(you should anyway) and then iterate through all the combinations of
multiple valid solutions until the final checksum matches.  Kind of a
nuisance, but not a major cost for a legitimate client visiting only a
few pages at human speeds.  You can scale this solution up and down by
the number of bits discarded according to heuristics and need.

Of course we all know that real proofs of work require memory as well as
compute, but I don't have an obvious solution for that.

## A compressed site

Notably, the above "discard some content and make the client guess what
it was" is a form of compression.  Just not a very sensible one.

Maybe we can go directly to real compression as a part of the solution?

The ideal application-specific compression scheme would decode most
bit streams to something plausible-looking, because most of its coding
space would be dedicated to things that make the most sense, and it
would be much harder to encode true nonsense and statistically less
likely for that to be hit by a random stream.

I experimented with this a long time before generative AI took over
the world, and I managed to get output comparable to a severely
inebriated human with autocorrect helping them along.  I think
that's <del>good enough</del> ideal for this task.

There is _so much more_ to say about the intersection of generative
algorithms, random distribution shaping, and data compression, but not
right now.

One of my other (unimplemented) schemes is a fake, generative-AI wiki
with [no dead links][autowiki], which would synthesise random content
derived from whatever URL it was trying to answer, containing more
random links which would in turn be filled in on the fly.

So what I'm thinking is to use such a compression scheme for genuine
site content.  When a crawler goes off-piste to places it was asked to
not go, the host delivers a chunk of pseudorandom bits derived from from
a hash of the URL, and the decompressor (run by the crawler)
decompresses that into plausible garbage containing random internal
links like a wiki; and the crawler keeps fumbling around following those
links.  If one link happens to land on a legitimate page then the
delivered bitstream will decompress to genuine content containing
genuine links again.

Ideally, to minimise load on the server, a part of the URL can be used
to signal to the decompressor that it can just synthesise garbage
internally, but this is only going to work up until somebody uses the
absense of such traffic to determine that it's fake content.

### Making content more toxic

The compression can be tuned to favour particular language so that while
it's still functional for any input it sacrifices some compression
quality in the good-faith case, but the bad-faith case preferentially
generates content in the chosen theme.  If you tune it on Trump tweets,
it'll sound like Trump tweets, even while it can theoretically transmit
any normal message.

[robots.txt]: <https://en.wikipedia.org/wiki/Robots.txt>
[autowiki]: </autowiki/>
