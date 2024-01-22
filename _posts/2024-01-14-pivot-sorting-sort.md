---
layout: post
title:  "Pivot-sorting quick sort"
categories: quick sort, pivot, sorting, wip
---
{% include svg.html %}

Regarding those quick-sort variants which do things like median-of-k pivot
selection before subdividing...

A couple of years ago (before I lost access to the write-up I did at that time)
it struck me that the diminishing-returns of using the median of larger samples
could be amortised over multiple levels of recursion by keeping the outcome for
later; because computing the median is a fair way towards sorting the whole
sample.

So I wrote [plpqsort][], which might have stood for something like
"pivot-list-prefixed quick sort", and maybe it could be pronounced "plippick
sort".  It's hard to say what I was thinking back then.

But don't worry about the name.  It takes a lot more careful thought to do a
better quicksort than what's many people have put a lot of effort into already,
and I only wanted to demonstrate a concept and slap a silly name on it so
people could draw inspiration from its singular innovation.

## How it works

The way this works is to take a random sampling of the unsorted data, and to
move that sample to the front of the list (doing it this way isn't efficient,
but it represents a simpler conceptual model).

<svg width="100%" height="60" viewbox="0 0 660 60">
  <defs>
    {% for v in (0..15) %} <path id="value{{v}}" width="10" height="40"  d="M5 {{v | times:-2 | plus: 44}} V50" stroke-width="6" /> {% endfor %}
    <rect id="element" width="10" height="40" y="10" class="block1" />
    <rect id="pivot" width="10" height="40" y="10" class="block0" />
  </defs>
  <rect id="array" width="640" height="40" y="10" x="10" />
  {% assign array="11 1 7 6 7 9 1 1 5 7 0 2 8 2 8 4 4 7 15 0 13 8 11 6 14 12 0 4 4 8 8 3 12 9 0 5 8 5 4 3 2 14 8 15 7 14 15 13 5 14 3 11 11 3 1 0 2 15 0 11 1 14 4 8" | split: " " %}
  <use x="100" href="#element" />
  <use x="120" href="#element" />
  <use x="200" href="#element" />
  <use x="330" href="#element" />
  <use x="400" href="#element" />
  <use x="460" href="#element" />
  <use x="570" href="#element" />
  {% for e in array %}<use x="{{ forloop.index0 | times:10 | plus: 10 }}" href="#value{{e}}" />{% endfor %}
  </g>
</svg>

The median of these is going to be our pivot.  But rather than compute just the
median, the whole sample is sorted fully.  This is now our "pivot-list prefix",
and the median picked from the middle of that prefix.

<svg width="100%" height="60" viewbox="0 0 660 60">
  <use href="#array" />
  {% assign array="0 2 2 3 7 12 14 1 5 11 0 1 8 2 8 4 4 7 15 7 13 8 11 6 14 12 0 4 4 8 8 3 6 9 0 5 8 5 4 7 2 14 8 15 7 9 15 13 5 14 3 11 11 3 1 0 1 15 0 11 1 14 4 8" | split: " " %}
  <use x="10" href="#element" /> <use x="10" href="#value0" />
  <use x="20" href="#element" /> <use x="20" href="#value2" />
  <use x="30" href="#element" /> <use x="30" href="#value2" />
  <use x="40" href="#pivot"   /> <use x="40" href="#value3" />
  <use x="50" href="#element" /> <use x="50" href="#value7" />
  <use x="60" href="#element" /> <use x="60" href="#value12" />
  <use x="70" href="#element" /> <use x="70" href="#value14" />
  {% for e in array %}<use x="{{ forloop.index0 | times:10 | plus: 10 }}" href="#value{{e}}" />{% endfor %}
  <use href="#unsorted" />
</svg>

Then partition the data after that prefix in the usual way.

<svg width="100%" height="60" viewbox="0 0 660 60">
  <use href="#array" />
  <use x="10" href="#element" /> <use x="10" href="#value0" />
  <use x="20" href="#element" /> <use x="20" href="#value2" />
  <use x="30" href="#element" /> <use x="30" href="#value2" />
  <use x="40" href="#pivot"   /> <use x="40" href="#value3" />
  <use x="50" href="#element" /> <use x="50" href="#value7" />
  <use x="60" href="#element" /> <use x="60" href="#value12" />
  <use x="70" href="#element" /> <use x="70" href="#value14" />

  <g id="unsorted_lo">
  <use x="80" href="#value1" />
  <use x="90" href="#value0" />
  <use x="100" href="#value1" />
  <use x="110" href="#value2" />
  <use x="120" href="#value0" />
  <use x="130" href="#value3" />
  <use x="140" href="#value0" />
  <use x="150" href="#value2" />
  <use x="160" href="#value3" />
  <use x="170" href="#value3" />
  <use x="180" href="#value1" />
  </g>
  <use x="190" href="#value0" />
  <use x="200" href="#value1" />
  <use x="210" href="#value0" />
  <use x="220" href="#value1" />
  <path d="M230 2 V58" />
  <g id="unsorted_hi">
  <use x="230" href="#value5" />
  <use x="240" href="#value11" />
  <use x="250" href="#value8" />
  <use x="260" href="#value8" />
  <use x="270" href="#value4" />
  <use x="280" href="#value4" />
  <use x="290" href="#value7" />
  <use x="300" href="#value15" />
  <use x="310" href="#value7" />
  <use x="320" href="#value13" />
  <use x="330" href="#value8" />
  <use x="340" href="#value11" />
  <use x="350" href="#value6" />
  <use x="360" href="#value14" />
  <use x="370" href="#value12" />
  <use x="380" href="#value4" />
  <use x="390" href="#value4" />
  <use x="400" href="#value8" />
  <use x="410" href="#value8" />
  <use x="420" href="#value6" />
  <use x="430" href="#value9" />
  <use x="440" href="#value5" />
  <use x="450" href="#value8" />
  <use x="460" href="#value5" />
  <use x="470" href="#value4" />
  <use x="480" href="#value7" />
  <use x="490" href="#value14" />
  <use x="500" href="#value8" />
  <use x="510" href="#value15" />
  <use x="520" href="#value7" />
  <use x="530" href="#value9" />
  <use x="540" href="#value15" />
  <use x="550" href="#value13" />
  <use x="560" href="#value5" />
  <use x="570" href="#value14" />
  <use x="580" href="#value11" />
  <use x="590" href="#value11" />
  <use x="600" href="#value15" />
  <use x="610" href="#value11" />
  <use x="620" href="#value14" />
  <use x="630" href="#value4" />
  <use x="640" href="#value8" />
  </g>
</svg>

Then, exchange the top part of the low portion for the top part of the pivot
list (again, maybe not an efficient way to go about it), and set the start of
the second partition to start at the part of the prefix that was just moved.

<svg width="100%" height="60" viewbox="0 0 660 60">
  <use href="#array" />
  <use x="10" href="#element" /> <use x="10" href="#value0" />
  <use x="20" href="#element" /> <use x="20" href="#value2" />
  <use x="30" href="#element" /> <use x="30" href="#value2" />
  <use x="40" href="#value0" />
  <use x="50" href="#value1" />
  <use x="60" href="#value0" />
  <use x="70" href="#value1" />

  <use href="#unsorted_lo" />
  <path d="M190 2 V58" />
  <use x="190" href="#pivot"   /> <use x="190" href="#value3" />
  <use x="200" href="#element" /> <use x="200" href="#value7" />
  <use x="210" href="#element" /> <use x="210" href="#value12" />
  <use x="220" href="#element" /> <use x="220" href="#value14" />
  <use href="#unsorted_hi" />
</svg>

Now we have two partitions, one less than or equal to the pivot, and one
greater than the pivot; and each partition begins with a sorted prefix.
Exclude the old pivot.  We're done with that.

<svg width="100%" height="60" viewbox="0 0 660 60">
  <rect x="10" y="10" width="180" height="40" />
  <use x="10" href="#element" /> <use x="10" href="#value0" />
  <use x="20" href="#pivot" /> <use x="20" href="#value2" />
  <use x="30" href="#element" /> <use x="30" href="#value2" />
  <use x="40" href="#value0" />
  <use x="50" href="#value1" />
  <use x="60" href="#value0" />
  <use x="70" href="#value1" />
  <use href="#unsorted_lo" />

  <rect x="200" y="10" width="450" height="40" />
  <use x="200" href="#element" /> <use x="200" href="#value7" />
  <use x="210" href="#pivot" /> <use x="210" href="#value12" />
  <use x="220" href="#element" /> <use x="220" href="#value14" />
  <use href="#unsorted_hi" />
</svg>

And recurse.

Now we're beginning to amortise.  Since the prefix is already sorted we don't
need to do that again.  It is half the size, but so long as it's not _too_
small we can still use it.  Otherwise collect a fresh sample and sort that.

That's it.

## the result

Does it work?  Hard to say.  My implementation is dumb, and my benchmark is
dumber.

The only metrics I looked at were swaps and compares, and they didn't turn out
great.  A serious implementation would probably break out of STL and resort to
SIMD optimisations and suchlike, and make a proportion of the operations
not-worth-measuring; and I just wasn't going to spend the time on that because
it's not meaningful until the rest of the algorithm has been carefully designed
and tested.

The prefix list also offers insights which I didn't try to exploit because I
didn't have a realistic benchmark in which to validate that effort.

* Before you sort the prefix, is it already sorted (collect samples at
  ascending offsets to benefit from this)?  That might be worth a closer look.
* After you sort the prefix, is some value grossly overrepresented in the
  sample?  Or at the very least, does the pivot value also appear at some
  distance threshold from the middle of the prefix (it's sorted so there's no
  scanning involved to figure this out)?

But it's an idea.  With a name.

[plpqsort]: https://github.com/sh1boot/plpqsort
