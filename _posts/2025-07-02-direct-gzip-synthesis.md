---
layout: post
title: How I made a gzip encoder faster than memcpy
tags: compression, number-theory, crc
---
In the compression world it's usual to compare the time spent
compressing and decompressing data with the time difference in
transmitting the compressed or uncompressed data over a given network.
In this experiment I managed to make the compression faster than the
bandwidth to RAM.  Sort of.  Under special circumstances and with no apologies for
the egregious clickbait headline.

In the simplest possible terms this compression works by maintaining a
dictionary of pre-cooked strings, appending those to the output
stream, and noting when they've already been emitted recently (a simple
index to last use with bounds check) and emitting a backreference code
instead of the full string in those cases.

Non-pre-cooked strings are not supported efficiently.  It's an encoder
restricted to very specific applications.  Probably.

The bit-packing overhead is obviated by contriving Huffman codes which
[always fall on byte boundaries][previously].  This is impossible for a
generic octet stream in the Delete format, but is achievable for UTF-8 text.

The _hard part_ turned out to be the checksum calculation.  When I
thought of the idea I assumed (hoped) it would be an Adler32 checksum
where it is easy to reason about appending precomputed checksums to the
running checksum.  It turned out gzip uses CRC32, and gzip is the
preferred format over zlib in web browsers.  So I had to figure out how to
append CRC checksums as efficiently as possible.

It turns out you can precompute the string checksum and store the string
length as a multiplier to be applied to the running checksum via [clmul][]
and folding that with a 64-bit crc32 operation.

Arm has CPU instructions for both of these operations, but x86 only has
the former (its CRC instruction uses the wrong polynomial), which means
using clmul to calculate the crc as well.  Typically this is optimised
for SIMD use, but a scalar operation is all that's needed here.  I
suspect the extra work to batch it into SIMD chunks would be worse than
the savings.

TODO: a bunch of extra exposition

Here's the code: [defl-8bit][].

## possible improvements
* Write a preprocessor to break input text into strings at the most
  appropriate boundaries, adding flexibility in random string
  generation.
* Implement the higher-level backref operator so multiple backreferences
  can be consolidated and their checksums can be computed as the
  difference between start and end of previous copy.
* Make larger backrefs using the conventional rolling hash thing, but on
  the precomputed string fragments rather than every byte.
* Or, remember previous backref distance and merge them when possible.
* Clean up the code.
* Figure out a proper generic interface with virtual methods in places
  that make sense and don't have scary performance implications.
* Add a practical fallback implementation for CRC for webasm
  compatibility (all that work for nothing!).
* Does the Adler-32 implementation even work?
* Tweak the clmul crc for performance.
* Tweak everything else for performance.
* Clean up this post.

[previously]: </more-efficient-nonsense-text/>
[clmul]: <Https://en.wikipedia.org/wiki/CLMUL_instruction_set>
[defl-8bit]: <https://github.com/sh1boot/defl-8bit>
