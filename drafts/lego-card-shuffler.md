---
layout: post
title: Designing a Lego card shuffler
tags: electronics not-just-software
---
The trouble with a lot of mechanical card shufflers is that they do
things like riffles with mechanical precision, and mechanical precision
tends toward predictable outcomes.  Thinking about this gave me the idea
that I could do my own but with deliberate and controlled use of random
numbers.

After much deliberation, I decided that the thing to do would be to
enumerate the cards randomly and then radix-sort them into place.  I
thought this might be a comparatively easy mechanism to build.  As a
side effect, enumerating and reordering means that you could also add a
camera and then identify and sort the cards.  And it's easier to verify
that sorting has been done correctly than it is to verify that shuffling
has been done correctly.

In fact, the user could choose whether to sort or to shuffle simply by
placing the cards face-up or face-down.  Or if it's a real mess then the
deck can be separated into face-up and face-down stacks in one pass.

## Equivalency of shuffling, sorting, and riffling

### What's a riffle?
A [riffle][] can be modelled as dividing the source into two piles and
randomly picking either the left or right pile to deliver the next card
to the resulting pile, over and over until we run out of cards.  Each
choice is based on probabilities proportional to the number of cards in
each hand, and this model implies the dealer would try to mix the two
piles evenly rather than letting one side expire early with the other
simply dropped on top.

Unfortunately if you have too much precision then the outcome is that
you interleave the cards in a regular left-right-left-right pattern,
which is completely predictable.  Some people can do this deliberately!

If it is ideally unpredictable then you need to do at least six of these
to get a fair shuffle in a deck of 52 cards.  Probably more, but
certainly not less.

### What's a radix sort

[Radix sorting][radix sort] is a multi-pass binning operation, where the
cards are sent to one of n (n will be two in this build) different bins
depending on whether they should be at the front or the back of the
sorted list.  Doing this in multiple stages means making the decision
based on different conditions on each pass.  You might separate even and
odd cards, then place one pile on the other for the next round, then low
and high numbered cards mod-4, then mod-8, etc., with the final pass
separating the red and black cards.

Technically separating the cards into two bins is the _opposite_ of
riffling; but the overall effect in either case is a permutation which
can be identified by the binary decisions made along the way.

To use a sorting machine as a shuffler you can randomly assign unique
numbers to each card, and then sort the cards by their associated
numbers.

What you _cannot_ do is to take a sorting algorithm and then make random
decisions at each comparison.  That's everybody's first thought but it
rarely works.

Radix sorting might perform comparatively well in this arrangement, but
it's still wrong.  In fact it's radix sort's good (but not perfect)
performance that makes riffle shuffling converge on a strong shuffle
after only one or two extra rounds beyond the theoretical minimum.

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

To build a radix-sorting machine I need to be able to take cards one at
a time from the source deck and to deliver them to one of two (or n)
other bins according to logic of some sort, and once all the cards are
redistributed, to combine those two piles and bring them back to the
starting point for the next round.

### Binning

Starting with the easiest bit; capturing the cards in multiple bins and
bringing them back together into a single pile for the next round.

For this I decided on a vertical column with three shelves.  The source
pile at the top, and two output piles below that.  A shuttle (also
acting as the bottom shelf) can then lift the cards to the top, but as
it lifts the cards, the shelves above have to get out of the way while
depositing their cards on top of those already on the shuttle.

To achieve this, I made the shelves a pair of forks, on diagonal
sliders.  Upward pressure from below would push the forks backwards out
of the way, while the wall they retreated into would keep the cards
lined up with the shuttle as it rose.  When the shuttle passed the forks
they would drop back into place behind it.

Then the shuttle needs to deposit the cards on the top shelf and go back
to the bottom.  To achieve this it's made of overlapping wings which
lift up and slip between the forks on the way back down, leaving the
cards on top of those forks.

And that actually worked!  Hurrah!

Here I would offer a picture, but the kids stripped my build for parts,
and now we have a Porsche 911 instead of a card shuffler.  So I'm going
to have to make a quick and dirty 3D mockup instead:

{% include tinkercad.liquid id='bdK1J8czaCm' image='/images/radix-shelf.png' %}

### Dealing

Next we have to deal the cards one at a time from the top pile, and
decide where they should be delivered.  Dealing cards with Lego is a
problem that worried me greatly.  How do I ensure only one card is drawn
at a time?  How does a printer do it?  

I ran out of time for the project before I could build a prototype, but
I had thoughts and I hope to revisit the problem imminently.

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

### Control

For the actual control logic I mean to use a [Micro:Bit][], because it's
cheap and because my employer gave me one to celerbate an anniversary.
And my boss gave me another one because he thought he'd never find the
time to use his.

Moreover, I really wanted an excuse to address a frustration I had with
Lego builds.  That the controller is absurdly expensive!  So I did a bit
of online shopping and found a couple of adapters and a couple of
prebuilt PCBs so that I could connect a Micro:Bit to Lego motors via
their standard connectors.

TODO: pictures
TODO: parts list and links

[radix sort]: <https://en.wikipedia.org/wiki/Radix_sort>
[riffle]: <https://en.wikipedia.org/wiki/Shuffling#Riffle>
[micro:bit]: <https://microbit.org/>
