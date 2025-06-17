---
layout: post
title: mod poker
---
A thing that's always troubled me about poker is that you can know for
sure when you have an unbeatable hand; though you usually don't and you
would normally play as if you were unbeatable even with a really, really
good hand.

So I wondered if there was an arrangement where every possible hand
could be defined to be inferior to some other hand but cycles could only
exist if more than one person held the same card, which is impossible,
so cycles would be impossible and there'd always be a winner.

I no longer believe this to be possible, but I don't remember why.

One thing you can do, trivially, is to randomise the highest card.  Say,
by drawing a card at the start of a round but not revealing it until
it's needed.  Cards would work their way up from the next face value
after that card mod-13 and ending at that card.  The best hand you could
have is a royal flush, and the best one of those is unknown until the
high card is revealed to break ties.

But I feel like all that does is remove the royal flush from the list
and cap things at a straight flush with a random tie breaker.  Boring!

So how about this...

A set of 48 cards (maybe 49?) numbered 1..48.  One is drawn at the start
but kept hidden.  Or as another variant, revealed immediately.  TBD.

After that you poker around until everybody has five cards, and once
that's settled you reveal that initial card and everybody gets to choose
a factor of that number with which to form a hand.  A factor of 1 is not
an allowed except for when the value of the card is itself 1.

Forming a hand in this instance is to make combinations of straights or
n-of-a-kind; where a card showing value n has a value of n // f and a
suit of n % f, where f is the factor chosen from those offered by the
initial card.

So the first thing you're going to consider is "good chance 2 will be
available", and so you might try to go with all-even or all-odd for a flush
(just like everybody else, so it had better be a good one).  Or you
might look at your hand and think you're better off hoping for a factor
of 3, or something which is usable with a couple of different factors,
or which is likely to produce five of a kind if you can find a factor
which doesn't break it, or a straight if you can get a factor which
steps at a suitable interval.

Ties need to be broken somehow.  There are a few established poker rules
for this, but probably also compare who used the largest prime factor.

Faces of cards could me marked with tools to help you decide what they
do mod different factors (I imagine some kind of Vernier-inspired scale
down one edge of the card to be used when you fan your cards in the
conventional way, but I have no specifics in mind for this).

Variations:
* Everything is done mod-48 (this is actually much harder to think
  through, and it's where I started before I stripped it back)
* You may only choose a _prime_ factor
* Reveal the card before play.
* Reveal the card somewhere in the middle of play, after some
  choices have been made but others are yet to be made.
