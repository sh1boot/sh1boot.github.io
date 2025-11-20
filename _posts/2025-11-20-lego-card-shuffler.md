---
layout: post
title: Designing a Lego card shuffler
tags: electronics not-just-software
---
A problem with mechanical card shufflers is that they do things like
riffles with mechanical precision, and mechanical precision tends to produce
predictable outcomes (at least in theory).  Thinking about this gave me the idea that I could
do my own but with deliberate and controlled use of robust random numbers in
order to produce a true shuffle.

I figured the thing to do would be to enumerate the cards randomly and
then radix-sort them into place.  This seemed like a comparatively
(_comparatively_) easy mechanism to build.  As a side effect,
enumerating and reordering means that you could also add a camera and
then identify and sort the cards by their actual value.  It's also
much easier to verify that sorting has been done correctly than it is to
verify that shuffling has been done correctly.

In fact, the user could choose whether to sort or to shuffle simply by
placing the cards face-up or face-down.  Or if it's a real mess then the
deck can be separated into face-up and face-down stacks in one pass.

## Equivalence of shuffling, sorting, and riffling

### What's a riffle?

A [riffle][] can be modelled as dividing the cards into two stacks and
randomly picking either the left or right stack to deliver the next card
to the result, over and over until there are no more cards.  Each
choice is based on probabilities proportional to the number of cards in
each stack, and this model implies the dealer tries to mix the two
stacks evenly rather than letting one side expire early and then simply
dropping the rest of the cards from the other stack on top.

Unfortunately if you have too much precision then the outcome is that
you interleave the cards in a regular left-right-left-right pattern,
which is completely predictable.  Some people can do this deliberately!

If it is ideally unpredictable then you need to do at least six of these
to get a fair shuffle in a deck of 52 cards.  Probably more, but
certainly not less.

### What's a radix sort?

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

What you _should not_ do is to take a sorting algorithm and then make random
decisions at each comparison.  That rarely works.
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

A radix sort replays that same string of decisions but in reverse order.  Reading those same index numbers from the other end.

But look out.  Just assigning numbers this way allows the possibility that
two cards could have the same number, and then their final order
won't be changed from their initial order.  More riffles adds more bits
to the numbers, decreasing the chances of two numbers having the same
number and being "stuck together" for the whole shuffle, but it's a
coarse approximation of picking predictably unique numbers.

An ideal shuffle chooses _unique indices_ for each card, and then sorts
by that value.  Moreover; an ideal shuffle chooses one of the 52! possible
permutations and then puts the cards in that order, and that order can
be described by numbering the cards according to where they land.  A
pair of cards could still come out in the same order as they went in,
but only with a suitably low probability.

That's a thing we can do trivially in a microcontroller, but
not-at-all-trivially in a Victorian-era mechanical contraption.

## How to build a thing for that?

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

Here I would offer a picture, but the kids stripped my build for parts
and now we have a Lego Porsche 911 instead of a card shuffler.  So I'm
going to offer a quick and dirty 3D mockup instead:

{% include tinkercad.liquid id='bdK1J8czaCm' image='/images/radix-shelf.png' %}

### Dealing

Next we have to deal the cards one at a time from the top pile, and
decide where they should be delivered.  Dealing cards with Lego is a
problem that seems really hard.  How do I ensure only one card is drawn
at a time?  How does a printer do that?

I ran out of time for the project before I could build any prototype,
but I had thoughts and I hope to revisit the problem imminently.

My thinking, such as it is, involves a roller (motorised Lego wheel) on
top of the deck pushes at least the top card out, while a brush sits
beneath where the top card protrudes and tries to sweep back any other
cards which got dragged along with the top card.  Not sure if it's
necessary, but I feel like I at least have a plan if it turns out it is
necessary.

Once the top card is protruding far enough that I think the brush has
isolated it, slightly faster rollers can pick it up and get it moving on
its way.

This mechanism has to have a bit of vertical freedom so that it can
adapt to the shrinking pile, obviously, and I guess the smart thing
would be to sense when the pile is empty (ie., when there's no card
supporting the roller, and it falls beyond a threshold).  It also has to
get out of the way when the shuttle is trying to refill the pile.  I
figure that the refill action should lift both mechanisms together, and
then replace both mechanisms together.

I intend to use the same motor to drive the rollers and also to raise
and lower the shuttle and rollers.  Why?  Because I only bought two
motors and two motor controllers.  This means turning the motor in one
direction will lift things up and disengage the rollers, and then
turning that motor in the other direction will lower everything and at
the point it's seated further motion on the motor toggles over to
driving the rollers.

Slightly fiddly, but probably easier overall than adding more motors.

TODO: draw a diagram

### Routing

Every card drawn has to be directed to one of the two bins, and so some
kind of switch is in order.  I figure that's basically just a slide
which can be raised or lowered to point at the appropriate bin.  The
main complication comes from wanting to make sure that timing errors
don't cause a card to get jammed in a destructive way, so there has to
be clearance for the card to find a safe escape path if things move at
the wrong time, and it has to jump over this gap in normal operation.

Also, I need a sensor to regulate the timing of the switching.  One
which will tell me when the next card is passing by.  Or, in the fancy
version a sensor to read the face value of the cards, and also that the
next card is passing by.

There's no Lego sensor for the second version, so I'm sticking with the
first (though I do have a thing in a box somewhere...?).

TODO: more diagrams?

### Actuation

#### controller

For the actual control logic I went with a [micro:bit][], because it's
cheap and because my employer gave me one to celerbate an anniversary.
Also my boss gave me another one because he thought he'd never have time
to use his.

Moreover, at the time I felt that the [EV3 brick][] was unreasonably
expensive and I wanted to do my part in making that cheaper so that Lego
education kits could be stretched a bit further.  But that whole thing
is for another blog post.

Here's all the bits I needed on some breadboard:

![interface logic][]

Parts: [edge connector][], [driver][], [connector][].

Since then Lego has changed its connector standard (again).  I have the
older motors right now, but I think I should re-do the build for the
modern connectors at some point.  Maybe Lego will stop changing the
connector standard now?

#### motors

Lego Mindstorms "servo" motors are a combination of 9V DC motor and
[quadrature encoder][].  That and a PWM output from the controller are
enough for a [PID control loop][PID] to manage speed and position, but
it won't know its absolute position at boot.

One solution to this is to have a bump switch to confirm the zero
position at start-up.  Alternatively, Lego has a [clutch gear][] and at
boot time you can just over-extend the position and let that slip to
reset the zero position.  This introduces the risk of drift and may
require periodic re-homing, but (depending on levers and stuff) it may
also lessen the damage if a card gets jammed in the wrong place.

I have to say, playing with a PID loop on a Lego motor is fun and
everybody should try it at least once.  It's interesting to feel how the
poll rate and parameters affect the feel of the motor as it resists you
pushing on it.  It can feel disconcertingly solid in contrast with the
elastic feeling of a motor without control -- depending on parameters.

#### logic

With all the machinery in place I have to actually write some code.
Well, I wrote some code early on.  Starting with a driver for the
quadrature decoder which is provided by the [nRF51822][] on the
micro:bit, and the PID controller... but none of that means much without
a machine to attach it to.  Which I don't have.  I just have a racing
car, a bunch of rubber-band launchers, and some stuff the dog's been
chewing on.

But what I _would_ do is:

With the cards set on the top shelf, turn the first motor forwards
continuously, feeding cards one at a time towards the ramp.  In the
first pass it doesn't matter where the ramp points, because we're just
counting the cards (or checking the current face value order if we're
fancy).  Keep rolling until a sensor tells us we're out of cards.

Here we stop and do some thinking to decide what order we want to put
the cards into.  If we saw n cards we enumerate them in random
order from 1..n, and that's going to be our target order.  Knowing how
many cards we have we also know we'll have to do `ceil(log2(n))` passes.

Next reverse the motor, which stops the rollers and lifts the shuttle
and rollers.  Keep doing that until [TBD], then turn the motor forwards
again to begin lowering everything.  At this point rollers are still
disengaged and the cards are on the shuttle which is above the top
shelf.

On they way down the shuttle deposits the cards on the top shelf and
passes between the forks.  Once the shuttle hits the bottom, the [TBD]
mechanism disengages from the shuttle and begins turning the rollers
again.  As each card passes by, move the ramp up or down to direct the
card appropriately for its planned position in the final sort.

This is just an LSD radix sort.  Odd numbered cards go up, even numbered
cards go down, or whatever.  Keep going until we run out of cards.  Make
sure the count is consistent with last time, or we've done a whoopsie.

Shuttle up, shuttle down.  Repeat.  This time the shuttle position is
determined by the next bit in the cards' indices.

Over and over until we've done enough passes to fully shuffle the cards.
All done.  Yay!


Now I just have to rebuild what I used to have, build and test the bits
I didn't already have, write the code, ???, and profit!

One day.  When I'm retired, or whatever.


[radix sort]: <https://en.wikipedia.org/wiki/Radix_sort>
[riffle]: <https://en.wikipedia.org/wiki/Shuffling#Riffle>
[PID]: <https://en.wikipedia.org/wiki/Proportional-integral-derivative_controller>
[quadrature encoder]: <https://en.wikipedia.org/wiki/Incremental_encoder#Quadrature_outputs>
[micro:bit]: <https://microbit.org/>

[nRF51822]: <https://www.nordicsemi.com/Products/nRF51822>
[EV3 brick]: <https://www.bricklink.com/v2/catalog/catalogitem.page?P=95646c01>
[EV3 medium]: <https://www.bricklink.com/v2/catalog/catalogitem.page?P=99455>
[clutch gear]: <https://www.bricklink.com/v2/catalog/catalogitem.page?P=60c01>
[interface logic]: </images/lego-interface-board.jpg>
[edge connector]: <https://shop.pimoroni.com/products/edge-connector-breakout-board-for-bbc-micro-bit>
[driver]: <https://www.pololu.com/product/2130>
[connector]: <http://www.mindsensors.com/ev3-and-nxt/58-breadboard-connector-kit-for-nxt-or-ev3>
