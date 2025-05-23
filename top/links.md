---
layout: page
title: external links
---
Sometimes I find myself posting the same reference to people over and
over.  Other times I keep going back to the same reference.  I thought I
should keep a list.

* [It's time for operating systems to rediscover hardware](https://youtu.be/36myc8wQhLo)
: I just point to this every time I get frustrated at the Linux
monoculture.  That's not really what it's about, but it articulates a
few reasons I have for actually _being_ frustrated.

* [Faster zlib/DEFLATE decompression on the Apple M1](https://dougallj.wordpress.com/2022/08/20/faster-zlib-deflate-decompression-on-the-apple-m1-and-x86/)
: I did work optimising zlib for a RISC-V CPU (unfortunately I based it
on an upstream which didn't want to maintain RISC-V code so most of the
patches languished, and I wasn't able to reparent them while I still had
access to the same class of CPU).  Then I discovered this effort which
drew most of the same conclusions and produced a very similar
implementation.

* [Quasirandom sequences](https://extremelearning.com.au/unreasonable-effectiveness-of-quasirandom-sequences/)
: This describes something I'd spent a long time thinking should exist
but not being able to find.  Then I found it.  Unfortunately, while it
seems mathematically solid, when I did experiments with it I found a
very pronounced artefact where one axis cycles between four phases which
seem to march slowly (meaning it has a ratio close to but not quite
1/4).  Clearly that mathematical purity is not a model of the thing I
_actually_ wanted.

Other times I've just had a tab in my browser open for so long that it
feels like it's become a part of my life:

* <https://gcc.gnu.org/onlinedocs/gccint/Named-Address-Spaces.html>
: Because useful or whatever.

* <https://www.corsix.org/content/alternative-exposition-crc32_4k_pclmulqdq>
: Because I mean to study it and maybe implement it for RISC-V.

* <https://forums.libretro.com/t/xbr-algorithm-tutorial/123>
: Hope to implement, or derive some extended implementation.
