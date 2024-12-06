---
layout: post
title: Extended checks on manual arithmetic
mathjax: true
---
So you've done some arithmetic by hand and now you want to make sure
it's correct.  [Casting out nines][] is the conventional sanity check,
but that overlooks digit transpositions.  What if you want something
stronger?  Try this one weird trick.

First; this whole casting-out-nines thing, in brief, revoles around
identities like $a + b = c + oops$, where $oops$ will be zero if we
calculated $c$ correctly.  A thing that's generally easier to calculate
than the original sum is $a + b \equiv c + oops \mod 9$, and $a + b - c
\equiv oops \mod 9$ which should come out to zero if $oops$ is zero (but
also if it's any other multiple of nine).  This extends to other
arithmetic.

But a problem with mod 9 is that it's blind to digit transposition.  We
know this because we can quickly calculate the remainder mod nine of a
number by adding up all its digits, which is an operation that comes out
the same regardless of their order.

The next easiest test is casting out 11s, because mod 11 is calculated
as alternating addition and subtraction of digits.  This pair of tests
is equivalent to a mod 99 test.  From this we can infer that it has the
same blind spot for digit transposition but in base 100 rather than
base 10.  You can't swap two adjacent digits but you can swap digits
separated by one other digit.  Eg., $318 \equiv 813 \mod 99$

These are realistic human errors so they're not a good place for a
blind spot.  You'll see this consideration in the design of a lot of
[check digit][] systems.  Computers don't do that sort of thing so
you'll see order-insensitive checksums in things like [IPv4][internet
checksum].

The _easy_ remedy, here, is to just carry on making the test longer
until n-step-transcription is improbable.  Like so:

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
one-in-nine chance of being wrong.  More or less; don't forget that
blind spot.

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

Here's where I should provide some tricks for doing mod 73 and mod 137
arithmetic, but I haven't figured those out, yet.

TODO: do that

I think the holy grail here would be an expedient remainder algorithm
which does _not_ rely on repdigits, which I assume would help to hash
out more of those blind spots to the sorts of errors that happen in
decimal.  What got me thinking about this was a couple of [Stand Up
Maths][] things.  One showing off a bunch of [divisibility tests][]:
{% include youtube.liquid id='6pLz8wEQYkA' %}

And viewing those in the context of the [2024 Pi calculation
effort](https://youtu.be/LIg-6glbLkU), which involved techniques for
mitigating human error.  I like optimising things so the redundancy
gets my attention.

Initially I was hopeful of finding some easy divisibility tests which
were more interesting than [repdigits][repdigit].  My holy grail, above.
But after a bit of poking around I decided that mod 99999999 was "good
enough".  If I were to go one step further I would look at reducing the
numbers $mod 10^n - k$ for a small $k$ other than 1, looking for a value
with some manageable factors.  This is how the [Adler-32][] checksum
works, except that's in binary.

Those divisibility rules cut the number down to size by eating away the
top and the bottom ends with different rules.  Both rules rely on adding
or subtracting a multiple of the divisor and cutting chunks off of the
number once they're eliminated.  But cutting chunks off the bottom
part involves manipulating them to make the unit digit zero and then
discarding it by dividing by ten.  Division by ten corrupts the
remainder but it never changes it between zero and nonzero (provided the
test is not a multiple of five or two, which you should factor out
beforehand).  You can unwind those changes by remembering how many times
you divided by ten and then multiplying by ten mod the divisor, but to
make that useful you'll need more tricks.


[Adler-32]: </adler32-checksum/>
[casting out nines]: <https://en.wikipedia.org/wiki/Casting_out_nines>
[five-second rule]: <https://en.wikipedia.org/wiki/Five-second_rule>
[check digit]: <https://en.wikipedia.org/wiki/Check_digit>
[internet checksum]: <https://en.wikipedia.org/wiki/Internet_checksum>
[divisibility tests]: <https://www.dropbox.com/scl/fi/zednyqcvd4kfi0zgm8n6t/divisibility_tests_to_30000.txt?rlkey=k7x87cnex6r32cuior6w9kzo5&e=1&dl=0>
[repdigit]: <https://en.wikipedia.org/wiki/Repdigit>
[Stand Up Maths]: <https://standupmaths.com/>
