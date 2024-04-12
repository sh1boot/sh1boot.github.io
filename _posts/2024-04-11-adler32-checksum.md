---
format: post
title: Optimising Adler-32 checksum
categories: checksum
---
{% include mathjax.html %}

The [Adler-32][] checksum consists of two 16-bit sums.  One is the sum of all
the bytes in the data, plus one, and the other is the sum of all those
intermediate sums, which works out to be the same as the sum of all the bytes
multiplied by their distance from the end of the buffer plus the length of the
buffer.  Both modulo 65521.

Mod isn't an operation you want to do regularly, so one typically does the sums
in larger registers and periodically applies the mod before overflow can occur.

Pretty straightforward stuff on a scalar CPU.

To vectorise this, though, you can split the streams into N independent streams
and then merge them somehow at the end.

Here's how.

Supposing you have N-way SIMD accumulators, you can quickly calculate N
independent Adler-32 checksums by adding incoming bytes to the first
accumulator and adding that accumulator into the second accumulator.

If the buffer is not a multiple of N long, you can pad it to a multiple of N by
[notionally] stuffing zero bytes in front, because zeroes at the beginning do
not affect the cumulative sum (zeroes at the end cause all the values in the B
sum to get multiplied differently, so you can't do that).

This gives you N sums in the form:

$$\begin{align}
  A_i = &\sum_{j=1}^{length/N} data_{(j-1)N+i} \mod 65521 \\
  \\
  B_i = &\sum_{j=1}^{length/N} (length/N - j + 1)data_{(j-1)N+i} \mod 65521
\end{align}$$

When what we really wanted was:

$$\begin{align}
  A = 1 + &\sum_{j=1}^{length} data_{j} \mod 65521 \\
  \\
  B = length + &\sum_{j=1}^{length} (length - j + 1)data_{j} \mod 65521
\end{align}$$

Which we can derive thus:

$$\begin{align}
  A = 1 + &\sum_{i=1}^{N} A_{i} \mod 65521 \\
  \\
  B = length + &\sum_{i=1}^{N} N \times B_{i} + (N - i)A_{i} \mod 65521
\end{align}$$

Or something like that, anyway.  I haven't checked for things like off-by-one
in my half-baked conversion from C notation to mathematical notation.

(TODO: make sure they're actually right)

Now it might seem like to avoid regular overflow and regular modulo we would
need to use 32-bit accumulators with periodic resets.  But actually not so
much.

Given a loop in the form:
```c
while (...) {
  A += *byteptr++;
  B += A;
}
```

If A and B start at zero, then it takes at least 258 iterations for A to
overflow a 16-bit counter $(255 \times 257 = 65535)$, but only 23 iterations
for B to overflow $(255 \times 22 \times (22+1) / 2 = 64515)$.  So using 16-bit
counters we can do 22 iterations and both A and B will still be less than
65521.

We prefer 16-bit counters because in typical SIMD we get twice the throughput
of 32-bit counters.

Then we need to fold those 16-bit sums back into larger counters, or do more
modulo arithmetic.

Like so:
```c
while (...) {
    // In the following loop A would get added into B 22 times, but we're
    // setting A16 to zero to keep it small, and so we do those sums ahead of
    // time:
    B += 22 * A;

    uint16_t A16 = 0, B16 = 0;
    for (int i = 0; i < 22; ++i) {
      B16 += A16;
      A16 += *byteptr++;
    }
    B += B16;
    A += A16;
}
```

But since we're only doing those larger sums every 22 iterations, maybe it'd be
better do the modulos to keep the arithmetic in 16-bits for twice the
throughput there as well?

Yes and no.

Assuming A was previously less than 65521, `A += A16` can't ever be bigger than
71130, so we can simply test it for overflow and subtract 65521 if necessary.

That's _slightly_ complicated by 16-bit arithmetic, but we can make it work
something like this:
```c
uint16_t tmp = 65521 - A;
A += A16;
if (A16 >= tmp) A = (A + 65536 - 65521) & 0xffff;
```

And if we spend just a couple of extra operations on keeping the A accumulator
within 16 bits then we have ensured that B only has to handle growing by up to
$23 \times 65520$ per iteration.  Which means that we can confidently run
around 2900 outer iterations without worrying about overflow.

Is it also worth reducing B to a 16-bit counter?  Well, no, not really.  The
supposed benefit would be that we can do twice as many 16-bit adds as 32-bit
adds, but without the knock-on effects on another accumulator the extra work in
doing the modulo doesn't justify itself.  And this time we have to deal with 22
times a 16-bit value, mod 65521; so we're locked in on that 32-bit temporary
register anyway.

There's probably a clever trick to do $(x \times 22) \mod 65521$, in 16-bit
arithmetic but I don't know what it is (I may try to figure it out for fun, but
it's still not going to help here).

Also, since we're really only trying to step back from the brink we don't
necessarily have to get the modulo exactly right.  There's a more expedient
option:
```c
if (periodic_overflow_control) {
  uint16_t top = B >> 16;  // close to division by 65521, but easier
  B -= 65521 * top;
}
```
It's so rare it's probably not worth optimising for performance, but if you
don't have the necessary instruction available then writing this is much easier
than writing a manual divide operation.  We just have to use a more
conservative reset period to stay safe.

Here's what that looks like in practice:
[adler32_simd.c](https://github.com/chromium/chromium/blob/ca5b63a1c07af201/third_party/zlib/adler32_simd.c#L374-L4540)

[Adler-32]: <https://en.wikipedia.org/wiki/Adler-32>
