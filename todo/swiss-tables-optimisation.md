---
layout: post
title: An optimisation for Swiss Tables
---
I watched a [presentation][video] on [Swiss Tables][] years ago, and there's a
part where they cut the hash back to 7-bit so it can be stored in a byte
with a "valid" flag or something like that.  That flag implies that the
other seven bits are [mostly] unused.

I felt like it would be better to use a sentinel value which the hash
could not reach, and reduce the hash mod 253 rather than mod 128 so that
all possible byte values have meaning.  It's not necessarily that much
more complicated than bit-masking.

The benefit is fewer false positives, which might help branch prediction
be a little more robust when lookup misses are a reasonable possibility.

[video]: <https://youtu.be/ncHmEUmJZf4>
[Swiss Tables]: <https://abseil.io/about/design/swisstables>
[issue]: <https://github.com/abseil/abseil-cpp/discussions/1605>
