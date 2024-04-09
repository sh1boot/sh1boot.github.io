---
layout: post
title:  "On the endianness of bitstreams"
categories: bitstream, endian, bit parsing, zstd, zlib, deflate
---

Where I'm from conventional wisdom has always been that while it's an objective
fact that little endian is the one-true-and-correct endian, bit-streams should
always be packed as big-endian data.

It's a constant source of amusement (actually frustration) to see another data
format stumble with this because x86 is little endian and ARM is little endian,
and everything that matters is little endian, and somebody thinks they can
simplify something by doing their bit packing in little endian as well.

I don't think that's a good idea.

The implication is that if you read just the first byte of the bitstream then
you have the least-significant bits of some symbol (depending on its size you
may have all the bit of that value and the low bits of the symbol after it, but
let's not get ahead of ourselves).  If there are more significant bits to be
gathered then they'll be in the next byte.  This is consistent with a
little-endian architecture where loading a word at that address means you can
just shift the relevant bits into place.

Now looking at [Deflate][], for example, it's notionally described as a
little-endian format but when it comes to stuffing Huffman codes into the
bitstream the codes are expressed in reverse order from the way they're
constructed.

This is because the first bits you can extract are the least-significant bits,
and with variable-length codes you can't know how many bits you need until
you've interpreted a portion of the prefix, and so the prefix must be the
least-significant bits.

This makes building Huffman tables a bit of a headache (which in the case of
zlib this is done fairly frequently) because equivalent codes with unused
suffixes jump around throughout the table, and it means you can't pull more
bits than you need and use magnitude comparison to decide which family of code
lengths a symbol belongs to.

Conversely, if your bitstream is packed in big-endian order, then the next byte
has the most-significant bits of your next symbol.  If you read at least enough
bits to decode any symbol then comparing those bits with a threshold will
always work, and in the case of canonical Huffman that can tell you how long
the symbol is and in other coding schemes it may tell you the value of the
symbol as well.

The joke is that there's nothing inherently better about big-endian bit
packing, but it just means that if you want to go little-endian then you should
read your bitstream starting from the far end (the higher addresses) where the
most-significant bits are.

So recently, when I was digging through [Zstd][], I was amused to see that
while it's yet another coding system using a little-endian packing, it does
indeed start at the far end!

I haven't analysed it that deeply.  I can't say for certain whether it would
help to turn the whole thing around and decode it in the conventional order
with a big-endian processor.  I just found it amusing.  So I wrote this post.

[Deflate]: <https://en.wikipedia.org/wiki/Deflate>
[Zstd]: <https://en.wikipedia.org/wiki/Zstd>
