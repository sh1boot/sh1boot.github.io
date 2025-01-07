---
last_modified_at: Sun, 8 Dec 2024 18:57:17 -0800  # a7cd9ad refine-arithmetic-check
layout: post
title: Extended checks on manual arithmetic
mathjax: true
tags: mathematics number-theory
opening:
  image: /images/human_error.jpeg
  alt: A human errorer
  caption: >-
    "Hello.  Are you, like us, a human who suffers from the embarrassing
    problem of <i>human errors</i>?"
---
So you've done some arithmetic by hand and now you want to make sure
it's correct.  [Casting out nines][] is the conventional sanity check,
but that has weaknesses.  What if you want something stronger?  Try this
one weird trick.

To start off, this whole casting-out-nines thing, in brief, revolves
around identities like $a + b = c + oops$, where $oops$ will be zero if
we managed to calculate $c$ correctly.  Something that's generally
easier to calculate than the original sum is $a + b \equiv c + oops \mod
9$, and $a + b - c \equiv oops \mod 9$ which should come out to zero if
$oops$ is zero (but also if it's any other multiple of nine).  This
extends to other arithmetic.

But a problem with mod 9 is that it's blind to digit transposition.  We
know this because we can quickly calculate the remainder mod nine of a
number by adding up all its digits, which is an operation that comes out
the same regardless of their order.

The next easiest test is casting out 11s, because mod 11 is calculated
as alternating addition and subtraction of digits rather than straight
addition.

This pair of tests is equivalent to a mod 99 test.  From this we can
infer that it has the same blind spot for digit transposition but in
base 100 rather than base 10.  You can't swap two adjacent digits but
you can swap digits separated by one other digit.  Eg., $318 \equiv 813
\mod 99$

Notice that going from mod 9 to mod 99 is taking well-known base 10
shortcuts and expanding them to base 100 by simply coupling adjacent
digits.  This can go on forever; not just for powers of two but any
regular grouping.

Unfortunately digit transposition is a thing humans do often.  You'll
see this as a consideration in the design of a lot of [check digit][]
systems.  On the other hand computers don't generally make that sort of
mistake so it's also common to see order-insensitive checksums in things
like [IPv4][internet checksum].  If you've ever bought a thing in a
supermarket you'll know that while bar codes are designed to be read by
machines, sometimes they still need to be transcribed manually, so that
uses an order-sensitive check digit as well.

The _simple_ remedy in our case is to just carry on making the test
longer until n-step-transcription is improbable.  But we don't want to
make check arithmetic longer or it won't be a labour-saving device
anymore.

We can moderate its growth a little by breaking each stage in half.
Like so:

First, calculate the remainder of the inputs and outputs over 99999999
-- that's eight nines.  To do this, break the number up into groups of
eight digits, starting from the right, and add all these up.

If the sum is more than eight digits long, just scoop up those extra
digits and add them back in at the bottom before anybody notices.
That's the [five-second rule][].

Now break that in half.  Two four-digit numbers.

Subtract the high half from the low half and put that result to one
side.  This is the value mod 10001.  If it's negative then add 10001.

Also add the high half to the low half.  If the result is more than four
digits, take that extra digit and add it back in at the bottom just like
last time.

Thats the value mod 9999.

Break it in half again.  Two two-digit numbers.

Subtract the high half from the low half just like last time.  This is
the value mod 101.  Top it up if it's negative.

Add the high half to the low half.  If the result is more than two
digits then fix it in the usual way.

Now we have mod 99.

Finally, continue the pattern to get mod 9 and mod 11 values in the
usual way.

Now for each value $x$ you should have $x \mod 9$, $x \mod 11$, $x \mod
101$, and $x \mod 10001$.

Do the casting-out-nines test.  If that goes OK then you have a
one-in-nine chance of being wrong.  Give or take the comparative risks
of digit transposition.

Next you can try the same thing mod 11.  Now you have a one in 99 chance
of being wrong.  Digit transpositions only sneak through if they're
swapped across an interval of two.

Next you can try mod 101 for a one in 9999 chance of being wrong, and
digit transpositions must be across an interval of four.

You have a choice, here.  You can stop and say that's good enough
(protip: pick this one!).  You can continue the pattern mod 10001.  You
can break 10001 into its factors of 73 and 137 and do those
independently.  Or you could start over with a different length
[repdigit][] on the basis that repdigits with co-prime lengths will have
a digit transposition insensitivity the length of the product of their
lengths.

Or, of course, you could just use a computer like any sensible person.

At this point questions come up about arithmetic mod 73 and mod 137.
How do we do it?  Are there easy shortcuts?  Because they're not one
away from a power of ten does this mean they have different weaknesses
from the other tests we've done?

Last question first: no.

What got me started on this post was wondering the same thing after
seeing this [Stand Up Maths][] video showing off a bunch of
[divisibility tests][]:
{% include youtube.liquid id='6pLz8wEQYkA' %}
and thinking about that in relation to their [2024 Pi calculation
effort](https://youtu.be/LIg-6glbLkU).

But when you note that you can do a 10001 test via its prime factors it
becomes apparent that those prime factors must have the same weaknesses
as that product.  You're not making mod 73 weaker by also doing mod 137.
They just both have that property inherently.

And so it is for any prime (overlooking 2 and 5), because eventually you
can find a value one off a power of ten which it divides (proof left as
an exercise for the reader).  It may just be a very big power of ten,
requiring more digits than you started with so there can't possibly be
such a transposition.

Those divisibility tests are optimised in such a way that they don't
give correct remainders (or they do but you'd have to do extra work to
recover them), so I kind of set that aside.  There may be a magic prime
that isn't too big but has an uncommonly long decimal period and isn't
hard to take the reainder of in decimal arithmetic but I don't know what
it is.

So to the second and first questions: I don't know, and I don't care.
It doesn't look promising so I'm not trying to figure it out.

Instead, it's probably easier and more productive to just write up the
generalisations for mod $10^n+1$ arithmetic, and develop some shortcuts
for doing that efficiently.

Naïvely it's just a matter of doing the arithmetic and then folding the
high digits back as described above, but there might be some internal
optimisations to work out to make things even easier.

TODO: do that

The process of computing mod $10^n - 1$ and mod $10^n + 1$ by batching up
digits does have useful generalisations.  You can calculate the
remainder over $(10^g)^n - k$ by taking the $i$th group of $g$ digits
and multiplying it by $k^i$ before adding them all up.  It's just that
if $k$ is not on the unit circle then it's going to grow and grow so you
can't group and add up everything concurrently like you can with $1^i$
and $(-1)^i$.

This is part of how the [Adler-32][] checksum is calculated efficiently,
except that's done in binary rather than decimal.

But yes, I said unit circle, which means I do want to address the
possibility that $k$ is complex.  I briefly entertained the idea of
setting $k$ to 90 degrees in the complex plane, so its integer powers
would orbit around the four cardinal directions and I could break the
groups into four sets and add them in different directions.  This meant
exploring [Gaussian integers][] and it does look like it could really be
made to work.

Can this be extended to the unit hypersphere in [quarternions][]?  I
don't know.  My cursory thoughts on the matter amounted to "why not?",
and I wonder if hyperdimensional [Chinese Remainder Theorem][] could be
used to reconstitute the original value after breaking extremely long
number into many dimensions and doing arithmetic mod smaller numbers.
This reminded me of how one can use fourier transforms to reduce
multiplication to a linear problem at the cost having to do the
transforms before and after (which is a bit less complicated than a very
long multiplication).  Except here we might be able to do addition and
multiplication without extra transforms.  Or not.  I don't know.  I'm
not sure how much crosstalk there is between the dimensions when
reconciling the overflows after each operation.  That might be
prohibitive.

TODO: Figure all that out?  Probably not.

[Adler-32]: </adler32-checksum/>
[casting out nines]: <https://en.wikipedia.org/wiki/Casting_out_nines>
[five-second rule]: <https://en.wikipedia.org/wiki/Five-second_rule>
[check digit]: <https://en.wikipedia.org/wiki/Check_digit>
[internet checksum]: <https://en.wikipedia.org/wiki/Internet_checksum>
[divisibility tests]: <https://www.dropbox.com/scl/fi/zednyqcvd4kfi0zgm8n6t/divisibility_tests_to_30000.txt?rlkey=k7x87cnex6r32cuior6w9kzo5&e=1&dl=0>
[repdigit]: <https://en.wikipedia.org/wiki/Repdigit>
[Stand Up Maths]: <https://standupmaths.com/>
[Gaussian integers]: <https://en.wikipedia.org/wiki/Gaussian_integer>
[quarternions]: <https://en.wikipedia.org/wiki/Quaternion>
[Chinese Remainder Theorem]: <https://en.wikipedia.org/wiki/Chinese_Remainder_Theorem>
