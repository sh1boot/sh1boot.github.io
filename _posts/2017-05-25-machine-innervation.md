---
last_modified_at: Tue, 7 Jan 2025 14:30:48 -0800  # 5d3af96 a-tagging-system
layout: post
title:  Machine innervation
tags: ai reliability electronics wtf-am-i-doing
---
Looking at the faults my espresso machine develops over time, I've often
wondered if fault detection and error messages could be better.  It's probably
safe to assume that the cost of including sensors for all possible faults and
developing code to check and understand all those sensors is prohibitive and
unreliable, so I've wondered about a different approach.

How about this.  Stencil the chassis of the machine with a couple of layers of
conductive paint in elaborate patterns, and then attach to that just enough
electronics to send and receive electromagnetic pings through the paint, which
would be distorted by thermal and mechanical stresses in the chassis.  And then
use AI to sort out the meaning and location of those distortions?

A single layer of stencil might not do much interesting on its on, being
mostly just resistive.  I'm assuming it would work better in two or three
conductive layers with an insulator between them to make the circuit
more reactive (capacitive, mostly), and more likely to express different
characteristics under strain or heat.

There's already [a company][Bare Conductive] selling 'electric paint' for much
simpler tasks.  This one might need electronics closer to an SDR antenna than
to a toy computer GPIO.  Also more consistent fabrication, if that problem
can't be auto-calibrated away (along with variaton due to weather).

Why AI?  Well, for the same reason as every other AI thing.  Because I don't
know how to design it correctly but I can see that such could be designed in
principle and AI could probably figure out how that and then some more.  And,
of course, variation in manufacturing implies a lot of autocalibration, which
would make manual design even hairier.

Maybe this could be done in the cloud.  Use some basic configuration to decide
what's normal, and if anything goes outside of that then have the machine
phone home to say it feels a bit weird, and then have that service check the
symptoms (aberrations in stencil response) against the symptoms witnessed in
machines that subsequently got serviced.

[Dermatome]: <https://en.wikipedia.org/wiki/Dermatome_(anatomy)>
[Power-on self-test]: <https://en.wikipedia.org/wiki/Power-on_self-test>
[Bare Conductive]: <https://www.bareconductive.com/>
