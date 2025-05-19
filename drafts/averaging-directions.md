---
layout: post
title: Averaging directions as unit vectors
---
An interview question I have seen in the past is how to take the average
of a bunch of compass readings or other such values in a
modular/circular psace.

To which one is expected to answer that the values can be summed as unit
vectors in two dimensions, and to compute a final direction from the
average.  One also gets a kind of confidence estimate from the length of
that vector, where an average value close to zero represents a lot of
conflicting readings.

But I've worked with a few cases where forwards and backwards versions
of the direction should be counted as equivalent.  The above solution
would have opposites cancel completely, when they should actually
reinforce each other.  And taking the angle mod 180° has more or less
the same problem as trying to average angles instead of vectors.

It turns out that the solution here is almost as simple as in the first
case.  If you regard the vector as a complex number then by squaring it
you double its angle (and square its length).  This means that the
vector's angle is wrapped twice around the circle, so that angles
separated by 180° end up pointing in the same direction, but now there's
no discontinuity half way around.

Here's an example of that technique in action:
{%- include 'shadertoy.liquid' id='mdsfzn' -%}

What I find interesting about this is the side-effect of squaring the
length.  This makes the operation analoguous to RMS, or quadratic mean,
whereas the un-squared average is the good old arithmetic mean.

There are a few important things to understand about when it's
appropriate to take the RMS and when it's appropriate to take the
arithmetic mean, or quadratic mean, or any of the others.  So it makes
me wonder if the cases where squaring the vector solves my fundamental
problem of ignoring the direction aren't also problems where I should
want the RMS rather than the mean but I haven't understood the problem
well enough to realise that.

[mean]: <https://en.wikipedia.org/wiki/Mean>
[Hölder mean]: <https://en.wikipedia.org/wiki/Generalized_mean>
