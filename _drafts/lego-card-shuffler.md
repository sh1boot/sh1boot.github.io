---
layout: post
title: Designing a Lego card shuffler
---
The trouble with a lot of mechanical card shufflers is that they do
things like riffles with mechanical precision, and this can lead to
predictable outcomes.  Thinking about this gave me the idea that I could
do my own but with deliberate and controlled use of random numbers.

After much deliberation, I decided that the thing to do would be to
enumerate the cards randomly and then radix-sort them into place.  I
thought this might be a comparatively easy mechanism to build.  As a
side effect, randomising and sorting means that you could also add a
camera and then identify and sort the cards.  In fact, the user could
choose which operation to perform simply by placing the cards face-up or
face-down (or if it's a real mess then the deck can be filtered by which
way up the cards are).

## Equivalency of shuffling, sorting, and riffling

### What's a riffle?
A riffle can be modelled as dividing the source into two piles and
randomly picking either the left or right pile to deliver the next card
over and over until we run out of cards.  Each choice is based on
probabilities proportional to the number of cards in each hand, as if
the dealer was trying to mix the two piles evenly rather than letting
one side expire first and the other merely being dumped on top.

Unfortunately if you have too much precision then the outcome is that
you interleave the cards in a predictable left-right-left-right pattern,
which is completely predictable.  Some people can do this on purpose!

You need to do at least six of these to get a fair shuffle in a deck of
52 cards.  Probably more, but certainly not less.

### What's a radix sort

It's kind of the same as a riffle, but inside-out.
TODO: elaborate

To use a sorting machine as a shuffler, you can randomly assign unique
numbers to each card, and then sort the cards by their associated
numbers.

What you _cannot_ do is to take a sorting algorithm and then make random
decisions at each comparison.  That's everybody's first thought but it
rarely works.  Radix sorting could perform comparatively well in this
role, but it's still not strictly correct.

### How are they similar?

If every card remembers whether it came from the left pile or the right
pile, for every riffle step in a shuffle, then it would come out with
six or seven boolean values, which you can combine as bits into a
number, which represents its index in the shuffled pile.  In essense
the process gives each card a random 6-bit number and then sorts them by
those numbers.

Unfortunately, assigning numbers this way allows the possibility that
two cards could have the same number, and then their final order
won't be changed from their initial order.  More riffles adds more bits
to the numbers, decreasing the chances of two numbers having the same
number and being "stuck together" for the whole shuffle, but it's a
coarse approximation of picking predictably unique numbers.

An ideal shuffle chooses a unique index for every card, and then sorts
by that value.  A pair of cards could still come out in the same order
as they went in, but only with a suitably low probability.

That's a thing we can do trivially in a microcontroller, but
not-at-all-trivially in a Victorian-era mechanical contraption.

## How to build a thing out of Lego?

I had a think, and considered a few different ideas, and here's what I
settled on and began to build...

### Binning

For this design what you need is a set of output bins (two at a minimum)
to which to deliver individual cards, and the means to move those
output bins back to the source for the next round of shuffling.

For this I decided on a vertical column with three shelves.  The source
pile at the top, and two output piles below that.  I then use a shuttle
to lift the bottom two piles to the top for the next round.

Here I would add a picture, but my build got stripped for parts by the
kids, and now we have a Porsche 911 instead of a card shuffler.  So I'm
going to have to draw a diagram instead.

TODO: draw a diagram

### Dealing

Next we have to deal the cards one at a time from the top pile, and
decide where they should be delivered.  Dealing cards with Lego is a
problem that worried me greatly.  How do I ensure only one card is drawn
at a time?  How does a printer do it?  

I'm thinking that a roller on top of the deck pushes at least the top
card out, and brush sits underneath where the top card slides out and
tries to brush back any other cards which are stuck to the top card.

And at a point where there should be only one card protruding, slightly
faster rollers pull that top card clear and deliver it to the routing
path.

TODO: draw a diagram

### Routing

Each round has to decide, for each card, whether it should go to the
upper or lower pile.  A switch is necessary to divert the card
appropriately.  This switch should be carefully designed to not damage
the cards if the timing is off.

TODO: more diagrams?
