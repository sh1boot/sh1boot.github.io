---
layout: post
title: Generating nonsense text even more efficiently
---

In my [previous post][], for the purpose of defining performance
expectations I compared the way in which I was generating text (Mad-Libs
style string substitution and concatenation) to Lempel-Ziv text
decompression.  That is, it's simply the task of scheduling a series of
string copies of various lengths.  The complexity of deciding which
strings to copy comes in one case from decoding the input stream to get
the instructions, or in the other case from navigating tables and
picking randomly from them.

Well-optimised LZ decoders with low-complexity input decoders advertise
rates as high as a couple of GB/s on top-end machines.  After a bit of
tweaking I got my JavaScript-based generator up to 20MB in around 200ms,
or 100MB/s.  Just one order of magnitude; which is probably OK.

But this only needed heavy optimisation because I cannot get crawlers to
execute javascript on their end.

But actually there _is_ a programmable client-side mechanism I might be
able to work with.  They have the gzip decoder.  Normally one would
generate text and compress it; but that wouldn't be any help to reducing
server-side burden.  Instead it would be more use to synthesise the
compressed bitstream directly.

Doing that isn't entirely silly, since a gzip decompressor is just using
a Huffman decoder to unpack a schedule of bytes and string copies.  We
mostly just want the block copies.  We need only send enough raw text to
get things rolling, and then because our vocabulary is so limited it can
be all string copies from that point on.

Unfortunately that bit-packing is expensive (comparatively) and we don't
want to spend time on it, except we kind of have to because that is the
standard.

Much of this pain can be alleviated by not bothering with any of the
usual statistics of Huffman coding and instead contriving a fixed set of
symbols which always fall on byte boundaries.  Or at least small tuples
of usable symbols which end on byte boundaries.  Then in our pool of
strings we disregard the strings themselves and instead keep a note the
places to copy from and the length of the copies.  Pre-coded into a
packed bit-string which happens to be a round number of bytes long.

So instead of performing string copies, we just copy a couple of bytes
with some touch-ups.

That last bit is a little complicated.  First, strings can't be allowed
to fall out of the 32kB back-reference window.  If they do then there's
nowhere to copy them from and we'd have to insert them from literals.
Second, those touch-ups are about encoding the relative distance back to
the previous use of the target string; and different distances have
different encodings, so there's going to be some extra translation
between distance and symbols.

Another hassle is that the construction of the tables is always
Canonical Huffman, which doesn't leave any room for gaps.  Symbols can't
just look like whatever we want them to, all the coding space has to be
filled for a given length before it can advance to the next length.
That's probably fine for copy lengths, because you can stuff unused
literals in the corners to pack it out.  It may be harder with
back-references; but probably not impossible.  Even if it did boil down
to having to manually bit-pack, hard-coding a symbol table can make the
job much easier than having to support dynamically changing symbol
sizes.

And then there's the checksum problem.  The checksums of the individual
strings can be pre-computed to save having to work on that, and the
previous state of the checksum can be quickly [fast-forwarded][adler32]
and added in to the precomputed checksum.  It's a bit of a fiddle, but
hopefully not too slow.

Alternatively, it might be possible to ignore the checksum.  Maybe
nobody would notice?

So yeah, that's all a possibility.  One I have to write down in the hope
that that will help me stop thinking about it, because I really do not
have time to dig into a practical implementation.

If I did do it, though, I wouldn't do it in JavaScript again.

[previous post]: </poisoning-delinquent-ai-crawlers/>
[adler32]: </adler32-checksum/>
