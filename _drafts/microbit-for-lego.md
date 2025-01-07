---
last_modified_at: Tue, 11 Jun 2024 17:41:44 -0700  # 6f7a754 some-drafts
layout: post
title:  "Using Micro:Bit as a Lego controller"
tags: micro-bit lego
draft: true
---

After seeing a [Numberphile][] video on [card shuffling][] I decided I'd look
at building my own card shuffler out of Lego.

It turned out that the logic controller for Lego Mindstorms is unreasonably
expensive.  I could afford it but I resented it.  I didn't think an educational
tool should have such an absurd markup[^1].  So I decided to build my own,
which would inevitably cost me several times as much but would at least prove
the concept that it _could_ be done cheaply.

If I could get all the support software together then I could do a dedicated
PCB and put its design on one of those sharing/ordering sites so that others
could have a much cheaper robotics experience with their Lego as well.

And as luck would have it I was given a [micro:bit][] at around about that
time.  And that _is_ cheap.  Hurrah!

So I went shopping and got some of those RJ12-like connectors with the offset
latches, and a motor controller pre-assembled on a PCB and some breadboard and
some bits of wire and started hacking.  And I ordered some of the motors
directly from lego.com.  Those prices are much less shocking.

TODO: show the parts and the schematics and stuff, some of which is on [project page][].

The Lego Mindstorms motors contain quadrature encoders so you can tell how far
they've rotated, and DC motors, so you can rotate.

What was needed was a driver for the quadrature decoder in the micro:bit
(though to support more than one motor would require a manual implementation of
same, because there's just the one decoder), and a [PID controller][] loop.

The PID was interesting.  It's interesting to feel how the motor responds to
you when you push against it when running the controller with different control
parameters and different polling rates.  Notably (horrifyingly) my initial
uneducated guess at what sort of polling rate would be needed (1kHz) was _way_
off.  Re-checking the code it looks like I needed 50kHz, which I think was a
figure I got from the ev3dev community.

I got both of those working (TODO: talk it through), and then I had a kid and I
didn't have time to finish anymore.  The end.


[^1]: Somebody please assure me that Lego grossly overcharges consumers in
wealthy countries in order to subsidise huge discounts for schools in
underprivileged countries.  This could be a thing, right?  Is it a thing?

[project page]: <https://github.com/sh1boot/testqdec>
[Numberphile]: <https://www.numberphile.com/>
[card shuffling]: <https://www.numberphile.com/videos/the-best-and-worst-ways-to-shuffle-cards>
[micro:bit]: <https://microbit.org/>
[PID controller]: <https://en.wikipedia.org/wiki/Proportional-integral-derivative_controller>
