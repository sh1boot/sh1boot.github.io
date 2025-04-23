---
layout: post
title: Generating nonsense text even more efficiently
---

In my [previous post][], for the purpose of defining performance
expectations I compared the way in which I was generating text ([Mad-Libs][]
style string substitution and concatenation) to [Lempel-Ziv][] text
decompression.  That is, it's simply the task of scheduling a series of
string copies of various lengths and offsets.  The complexity of deciding which
strings to copy comes in one case from decoding the input stream to get
the instructions, or in the other case from navigating tables and
picking randomly from them.

Well-optimised LZ decompressors with low-complexity input decoders advertise
rates as high as a couple of GB/s on top-end machines.  After a bit of
tweaking I got my JavaScript-based generator up to 20MB in around 200ms,
or 100MB/s.  Just one order of magnitude less; which is probably OK.

This only needed heavy optimisation because I cannot get crawlers to
execute javascript on their end.

But actually there _is_ a programmable client-side mechanism I might be
able to work with.  They have the gzip decoder.  Normally one would
generate text and compress it; but that wouldn't be any help in reducing
server-side burden.  Instead it would be more use to synthesise the
compressed bitstream directly.

Doing that isn't entirely silly, since a gzip decompressor is just using
a Huffman decoder to unpack a schedule of literal bytes and string copies.  We
mostly just want the string copies.  We need only send enough raw text to
get things rolling, and then because the vocabulary is so limited it can
be all string copies from that point on.

Unfortunately that bit-packing is [comparatively] expensive and we don't
want to spend time on it, except we kind of have to because that is the
standard.

Much of this pain can be alleviated by not bothering with any of the
usual statistics of Huffman coding and instead contriving a fixed set of
symbols which always fall on byte boundaries.  Or at least small tuples
of usable symbols which end on byte boundaries.  Then in our pool of
strings we disregard the strings themselves and instead keep note of the
places to copy from and the length of the copies.  Pre-coded into a
packed bit-string which happens to be a whole number of bytes long
so there's no bit packing to do.

So instead of performing whole string copies, we just copy a couple of
bytes with some touch-ups.

That last bit is a little complicated.  First, strings can't be allowed
to fall out of the 32kB back-reference window.  If they do then there's
nowhere to copy them from and we'd have to insert them from literals.
Second, those touch-ups are about encoding the relative distance back to
the previous use of the target string; and different distances have
different encodings, so there's going to be some extra translation
between distance and symbols.

Another hassle is that the construction of the tables is always
[Canonical Huffman][], which doesn't leave any room for gaps.  Symbols can't
just look like whatever we want them to.  They're allocated in a prescribed
order.  Even if we can't get what we want and it did boil down
to manually bit-packing, hard-coding a symbol table can make the
job much easier than having to support dynamically changing symbol
sizes.

And then there's the checksum problem.  The checksums of the individual
strings can be pre-computed to save having to work on that, and the
previous state of the checksum can be quickly [fast-forwarded][adler32]
and added in to the precomputed checksum.  It's a bit of a fiddle, but
hopefully not too slow.

Alternatively, it might be possible to ignore the checksum.  Maybe
nobody would notice?

## The work so far...

In gzip we have variable-length codes in two dictionaries to consider.
The first is a unified literal and copy-length dictionary, and the
second, used whenever a copy length is read, is the back-reference
distance.  The copy lengths and the back references consume some number
of "extra bits", depending on the specific code.  To make these
fixed-length symbols the variable-length code will have to be
complementary in size to those extra bits.

Looking at the distance codes first there are two codes with 13 extra
bits, so one bit will be needed to distinguish between the two codes,
and one more will be needed to distinguish between those codes and all
the others.  Four codes have zero extra bits, and the longest those can
be is 15 bits.

That all fits very neatly.  All the distances can be made a constant
15 bits long:

```
|      |Extra|             |                 |
| Code | Bits|   Distance  |       VLC       |
|------|-----|-------------|-----------------|
|   0  |   0 |       1     | 111111111111110 |
|   1  |   0 |       2     | 111111111111111 |
|   2  |   0 |       3     | 111111111111100 |
|   3  |   0 |       4     | 111111111111101 |
|   4  |   1 |      5,6    | 11111111111100x |
|   5  |   1 |      7,8    | 11111111111101x |
|   6  |   2 |      9-12   | 1111111111100xx |
|   7  |   2 |     13-16   | 1111111111101xx |
|   8  |   3 |     17-24   | 111111111100xxx |
|   9  |   3 |     25-32   | 111111111101xxx |
|  10  |   4 |     33-48   | 11111111100xxxx |
|  11  |   4 |     49-64   | 11111111101xxxx |
|  12  |   5 |     65-96   | 1111111100xxxxx |
|  13  |   5 |     97-128  | 1111111101xxxxx |
|  14  |   6 |    129-192  | 111111100xxxxxx |
|  15  |   6 |    193-256  | 111111101xxxxxx |
|  16  |   7 |    257-384  | 11111100xxxxxxx |
|  17  |   7 |    385-512  | 11111101xxxxxxx |
|  18  |   8 |    513-768  | 1111100xxxxxxxx |
|  19  |   8 |   769-1024  | 1111101xxxxxxxx |
|  20  |   9 |   1025-1536 | 111100xxxxxxxxx |
|  21  |   9 |   1537-2048 | 111101xxxxxxxxx |
|  22  |  10 |   2049-3072 | 11100xxxxxxxxxx |
|  23  |  10 |   3073-4096 | 11101xxxxxxxxxx |
|  24  |  11 |   4097-6144 | 1100xxxxxxxxxxx |
|  25  |  11 |   6145-8192 | 1101xxxxxxxxxxx |
|  26  |  12 |  8193-12288 | 100xxxxxxxxxxxx |
|  27  |  12 | 12289-16384 | 101xxxxxxxxxxxx |
|  28  |  13 | 16385-24576 | 00xxxxxxxxxxxxx |
|  29  |  13 | 24577-32768 | 01xxxxxxxxxxxxx |
```

The distance symbols only appear after a copy length.  Since the
distances are all 15 bits, we need the lengths to all be 9 bits so the
pair falls on a byte boundary.

Length codes use the same alphabet as literals -- the 256 different byte
values -- and the end code (code 256):

```
|     |Extra|         |           |
|Code | Bits| Length  |   VLC     |
|-----|-----|---------|-----------|
| 257 |   0 |    3    | ????????? |
| 258 |   0 |    4    | ????????? |
| 259 |   0 |    5    | ????????? |
| 260 |   0 |    6    | ????????? |
| 261 |   0 |    7    | ????????? |
| 262 |   0 |    8    | ????????? |
| 263 |   0 |    9    | ????????? |
| 264 |   0 |   10    | ????????? |
| 265 |   1 |  11,12  | ????????x |
| 266 |   1 |  13,14  | ????????x |
| 267 |   1 |  15,16  | ????????x |
| 268 |   1 |  17,18  | ????????x |
| 269 |   2 |  19-22  | 0111000xx |
| 270 |   2 |  23-26  | 0111001xx |
| 271 |   2 |  27-30  | 0111010xx |
| 272 |   2 |  31-34  | 0111011xx |
| 273 |   3 |  35-42  | 011000xxx |
| 274 |   3 |  43-50  | 011001xxx |
| 275 |   3 |  51-58  | 011010xxx |
| 276 |   3 |  59-66  | 011011xxx |
| 277 |   4 |  67-82  | 01000xxxx |
| 278 |   4 |  83-98  | 01001xxxx |
| 279 |   4 |  99-114 | 01010xxxx |
| 280 |   4 | 115-130 | 01011xxxx |
| 281 |   5 | 131-162 | 0000xxxxx |
| 282 |   5 | 163-194 | 0001xxxxx |
| 283 |   5 | 195-226 | 0010xxxxx |
| 284 |   5 | 227-257 | 0011xxxxx |
| 285 |   0 |   258   | ????????? |
```

Here things get a little complicated, which is why the table above is
incomplete.

In order to be able to write out literals, those literals are going to
have to be exactly 8 bits long.  There's not going to be enough space
for all of them alongside the already-allocated encoding for length
codes, so sacrifices must be made.

### Control characters

Most control characters aren't important for plain text.  Only line
feeds are essential, but HTML can probably get by even without that.
But that's a little extreme, though, so let's try to keep it.

If it did turn out to be challenging to squeeze in a line feed as an
8-bit code, then the alternative would be to find something to pair it
with to make it a round number of bytes.  Carriage return fills that
role neatly so it would be possible to make a 12-bit code for carriage
return, and a 12-bit code for line feed, and send the two of them
together, and most recipients should have no complaint about that.

### Printable ASCII

These really need to be eight-bit codes.  Thankfully there are only 95
of them to worry about, leaving some space for a couple of other codes
of the same length or longer.

### The end-of-block code

code 256, not mentioned in the length table above, is used to signal the
end of the block.  Because this isn't an optimised dynamic Huffman
system there's no point ending the block more than once, so once that's
done it'll be padded to the end of the byte and the file is finalised.
So it doesn't matter how long this code is.

### Non-ASCII characters

Trying to find byte-aligned encoding for the rest of the characters in,
eg., ISO-8859 would probably be impossible.  There's not that much room
in the 8-bit symbol space along with everything else we need, and
there's no guarantee that things will appear in tuples which combine to
a multiple of eight bits.

Thankfully UTF-8 is where it's at, and that _does_ have constraints we
can work with.

#### UTF-8

When UTF-8 introduces a multi-byte codepoint it starts with a value that
tells us how many extension bytes follow, and then we have that many
bytes with values that can't appear anywhere else in a legal UTF-8
stream.

If we start with the latter and assign them n-bit symbols, then we can
calculate from that how many bits the corresponding prefix code must be
to round out the whole codepoint to a multiple of 8 bits.

By choosing a 10-bit extension code we can determine that UTF-8
codepoints with one extension byte (beginning with 0xC0-0xDF) need
the first symbol to be either six or 14 bits long.  Six is too short for
the 32 different prefixes, so 14 it is.  If there are two extension
bytes then that's 20 bits needing a 12-bit prefix, and three extension
bytes need a 10-bit prefix.

That not going to be good for some languages.  An alternative might be
to use 9-bit extension codes (64 of those), requiring 30 prefixes of
length 7, 16 prefixes of length 6, and 8 prefixes of length 5, and then
stripping the ASCII alphabet down to the bare minimum to support HTML,
but it's a tight fit and may still not be possible.

### The result

This all has to be coded in a header which describes the length of each
symbol.  The header also uses variable-length codes and a bit of
run-length syntax, so it may be necessary to fiddle things about a
little to make it end at a byte boundary; but this shouldn't be too
difficult.  Once it's done it can be handled as a hard-coded blob.

Here are the rest of the variable-length codes I ended up with:

```
8-bit codes:
01111000....... BEL  (7)
01111001....... BS  (8)
01111010....... TAB  (9)
01111011....... LF  (10)
01111100....... VT  (11)
01111101....... FF  (12)
01111110....... CR  (13)
01111111....... ESC  (27)
10000000....... ASCII    (32)
10000001....... ASCII !  (33)
...
11011101....... ASCII }  (125)
11011110....... ASCII ~  (126)
11011111....... End of block  (256)
11100000x...... length 11-12  (265)
11100001x...... length 13-14  (266)
11100010x...... length 15-16  (267)
11100011x...... length 17-18  (268)

9-bit codes:
111001000...... NUL  (0)
111001001......   (1)
111001010......   (2)
111001011......   (3)
111001100......   (4)
111001101......   (5)
111001110......   (6)
111001111...... DEL  (127)
111010000...... length 3  (257)
111010001...... length 4  (258)
111010010...... length 5  (259)
111010011...... length 6  (260)
111010100...... length 7  (261)
111010101...... length 8  (262)
111010110...... length 9  (263)
111010111...... length 10  (264)
111011000...... length 258  (285)

10-bit codes:
1110110010..... UTF-8 ext  (128)
1110110011..... UTF-8 ext  (129)
...
1111110000..... UTF-8 ext  (190)
1111110001..... UTF-8 ext  (191)
1111110010..... UTF-8 4-byte prefix (240)
1111110011..... UTF-8 4-byte prefix (241)
...
1111111000..... UTF-8 4-byte prefix (246)
1111111001..... UTF-8 4-byte prefix (247)

12-bit codes:
111111101000... UTF-8 3-byte prefix (224)
111111101001... UTF-8 3-byte prefix (225)
...
111111110110... UTF-8 3-byte prefix (238)
111111110111... UTF-8 3-byte prefix (239)

14-bit codes:
11111111100000. UTF-8 2-byte prefix (192)
11111111100001. UTF-8 2-byte prefix (193)
...
11111111111110. UTF-8 2-byte prefix (222)
11111111111111. UTF-8 2-byte prefix (223)
```

Since we don't have any control over the order of the symbols (they're
ordered by length and then by code), there's going to need to be a
look-up table to convert even simple ASCII into the byte-aligned codes
we have.

And the lengths and distances get even worse treatment.  They're a
combination of big-endian and little-endian coded data, as an
unfortunate complication of the way the bit packing was defined for a
little-endian architecture against the way bitstreams naturally parse.

## Generation

The idea would be to have an engine which emitted pre-cooked strings and
made a note of where it had last put them.  When a string is needed, if
it's in-range then emit the length and distance tuple.  If it's new or
if it's fallen out of range then emit the raw literals for the string.
Either way, update the last-emitted position.

Part of the pre-cooking would be to compute the Adler-32 checksum of the
string.  Upon emitting a given string the rolling checksum can be
fast-forwarded by the number of bytes in the string, and the
pre-computed string checksum can be added to that.

This would all make much less less sense if the intended output was not
already a recurring concatenation of a small set of repeated strings.


[previous post]: </poisoning-delinquent-ai-crawlers/>
[adler32]: </adler32-checksum/>

[RFC1951]: <https://datatracker.ietf.org/doc/html/rfc1951>
[Lempel-Ziv]: <https://en.wikipedia.org/wiki/Lempel-Ziv>
[Canonical Huffman]: <https://en.wikipedia.org/wiki/Canonical_Huffman_code>
[Mad-Libs]: <https://en.wikipedia.org/wiki/Mad_Libs>