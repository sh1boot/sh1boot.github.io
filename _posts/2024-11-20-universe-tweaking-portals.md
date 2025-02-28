---
last_modified_at: Sat, 15 Feb 2025 00:38:19 -0800  # 79e252a lots-of-tagging-work
layout: post
title:  Invisible, universe-tweaking portals
tags: games portals needs-work needs-example
---
I'm not going to describe the mechanics of the game [Portal][].  You
probably already know; but I've often [wittered on][tessellated
playfield] about how I think hidden portals would be a great way to
tweak the universe and fold a map back on itself.

In addition to recursion within a map, you can modify things like the
scale of the map relative to the player, and in fact somebody has
already done a technical demo of that:

{% include youtube.liquid id='kEB11PQ9Eo8' %}

But in my head I go further; the orientation of the portal could also
change things like the direction of gravity; so your subjective
experience is consistent but the external viewer sees you enter a portal
right-side up and then somewhere else on the map you turn up standing on
the ceiling or a wall.  Like Escher's Relativity.

And portals can vary the way the universe is rendered, and change your
relationship to other objects and players.  While subjectively you might
be on the red team, through the portal red and blue are swapped, and
while you pass through you remain red but those who haven't passed
through, or have passed through a different number of times, are no
longer on the same relative teams that they were.  You effectively
switch allegiance, but transparently.  Looking _through_ the portal
those same players already appear in their new colours, so as you walk
through you see no change.

And a bunch of other stuff like that.  You just have to be careful to
operate your rendering and mechanics in terms of a counter representing
the number of times the player transits each portal forward or backward.
And you have to change things such that the physics is consistent
between your universe and that of an external viewer.

So while two players might see an object differently they must have
consistent clipping regions so that the physics and interactions remain
consistent.  This means shrinking makes gravity a bit weird.  If you
shrink in the universe but maintain subjective gravity then the external
observer would see you fall much slower than they expect.  You expect to
drop about 5m in one second, and they expect you to drop about 5m in one
second, but you each have your own notion of what five metres is.  Or it
could be the other way around where you experience an increase in
gravity through the portal so others see you fall the way you should.
Or you could mix the two effects to make it a bit less jarring to both
parties.  Thankfully it's a second-order effect so there's no sudden
snap during the transit, and most things aren't usually falling anyway.

But anyway... I had an incident the other day which made me wonder about
additional possibilities.

First, the case where the portal exists to alter the universe without
altering your position on the map.  While there also exist alternate
paths where you get to the same place without transiting the portal.  If
you walk to the left of the pillar something changes.  If you walk to
the right, nothing changes.  But it all looks the same.

It could be something intangible, like the way NPCs interact with you.
Maybe you have better luck in matters of chance.  Or maybe a door is
left open instead of closed.

Second, what if that portal _is_ movable, and is represented by some
talisman you can pick up and move.  The portal is simply bounded by the
nearest the walls and floor and ceiling surrounding that talisman.

In the case that inspired me that talisman was a sign saying "only
authorised staff beyond this point".  I ignored it and what I
encountered was possible but statistically rare compared to other areas.
The next day I took an alternate route, I did not pass the sign, and
(hopefully coincidentally) those statistical anomalies reverted to
normal.  One can deduce from that that sign was actually a portal and by
breaking the rules I entered an alternate universe, and left it again
when I came back past the same sign.

This could be gamified in so many ways.

There's also this:
{% include youtube.liquid id='DTcfaHfDCEc' %}

TODO: discuss..


[tessellated playfield]: <https://www.halfbakery.com/idea/Tessellated_2c_20phase-shifted_20playfield>
