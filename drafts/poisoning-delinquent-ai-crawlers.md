---
layout: post
title: Poisoning badly-behaved AI crawlers
---
Regardless of how you feel about generative AI stealing your job or
filling creative spaces with slop, or whatever, one thing I hope is less
debatable is that their crawlers should follow the rules of the road.

But they do not.

So a lot of people talk about ways to fill the space beyond the
no-trespassing signs with landmines of various sorts to keep the
scrapers busy on low-quality data whenever they break the rules.

https://blog.cloudflare.com/ai-labyrinth/
https://iocaine.madhouse-project.org/
https://nightshade.cs.uchicago.edu/whatis.html
https://www.brainonfire.net/blog/2024/09/19/poisoning-ai-scrapers/

I thought I might have a bit of a tinker with CloudFlare workers to
build up my own machine-generated traps, without the promise to yield
only responsible content which put me right off of CloudFlare's
built-in solution.  I prefer my poison to more toxic.

But then I realised that the scraper probably has to run javascript from
the page it's scraping to make sure it gains access to the intended
content anyway.  In that case why should I trouble CloudFlare's workers
with the task?

### A compressed site

What if I were to use a custom compression algorithm on my site, so that
pages can be stored and delivered efficiently and then decompressed on
the client?

What if that compression was super effective?

In the case of a trap, the site could deliver nothing of consequence but
the "decompression" could just dynamically spew out garbage content of
unlimited length.  Peppered with links to other pages which would do the
same, and maybe a few links to pictures and other sites to look kind of
legitimate.

But what about the best of both worlds?

I have a plan...

### A good-faith implementation

Run a site which uses a javascript shim to download and decompress the
content for every page, using a proprietary compression scheme.

### The pivot

If the compression is specialised enough, then any random bit string
could decompress to something plausible.

Incidentally, if that compression is bijective, then it's possible to
decompress any random bit string and recompress it back to the same bit
string.  Consequently, you can compress, encrypt, and decompress text,
transmit the decompressed cyphertext, then recompress, decrypt, and
re-de-compress at the other end to get the original message.
Steganography!  (sort of)

### A bad-faith implementation

Start with a compressed good site, but when the crawler gets off-piste,
use the content of a random page and scramble it before decompression.

Where links are used, use a hash map and find the nearest collision to
decide what page should be returned (encrypted), so that all links
remain valid.  Some may even accidentally go back to the original site
where content is not scrambled.  So authentic!

### A badder-faith implementation

The compression can be tuned to favour particular language so that while
it's still bijective for any input it sacrifices some compression
quality in the good-faith case, but the bad-faith case preferentially
generates content in the chosen theme.  If you tune it on Trump tweets,
it'll sound like Trump tweets, even while it can theoretically transmit
any normal message.
