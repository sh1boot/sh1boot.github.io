---
layout: post
title: Memory tagging
---
Years ago I happened across an early description of what's since become
[Arm MTE][].  It tied in neatly with other concepts I'd worked with in
memory aliasing and diagnostics, and it unlocked a world of potential.
Eventually I got to see the Arm design, and it was a far more muted
concept, and I lost all my energy for the idea.

Recently I learned that [Apple][Apple MIE] seem to have felt the same
way as I did, and they actually did something about it.  I haven't been
able to find much detail so far, but their discussion about having to do
it in conjuction with substantial OS and application rewrites rings
true.  Clearly Arm wanted something that people would adopt without all
that hassle.

Being that I can't find any straightforward explanation for Apple's
changes I reverted to form and just started making up all my own shit;
or resurrecting my old ideas or something.  I had a lot of ideas back in
the day, and they faded over time, but they're slowly coming back the
more I think about MTE.

## Repurposing memory

The first thing that troubled me was the performance implications of
changing tags when memory is re-used, deliberately, with an updated tag.
It feels like all of the memory needs to be visited in order to inform
the cache that it needs to use new tags.

But what if one didn't bother with that.

What if, instead, writes automatically erased the memory whenever the
tag didn't match (never raising any fault), and updated the tag to its
new value.  Then only reads raise faults on mismatched tags, if they
haven't already been written.

You shouldn't be reading something that you didn't initialise for
yourself anyway.  So if you get a fault trying to use your own memory
then it's probably uninitialised data and you should go fix your code.

This leaves open the possibility of a bad actor just trying to erase
legitimate date while it's being used.  In this case innocent code won't
be able to read what they injected because the updated tag will cause
that code to fault instead, but if they can inject a bad write before
a good write then all the data surrounding the good write can be
silently erased.

Now I get to this point and I think "OK, it's just a 12.5% tax to keep a
'valid' bit for each byte", so you can still fault on every undefined
read in a cache line which you've only partially written (or been
tricked into re-erasing by a bad actor).

Strictly that tax should run down the whole memory stack to account for
evictions at all the levels.  You can fudge it but that just means the
attacker has to force those evictions to make their attack viable.

But not every first memory access is a whole byte.  Many are necessarily
read-modify-write operations because they need to modify less than a
byte, or a bitfield which doesn't start and end on byte boundaries.
This means they'll get trapped on the initial read of those don't-care
bits which they'll simply write back again and, presumably, come back
around to overwrite later on or just never use.

Which leads me to thinking about having the compiler do analysis to
decide what data _might_ require a read-modify-write and to
pre-initialise just that memory with valid data.  The majority of cases
don't have bitfields anyway, so if they read before write there's
something not appropriate going on.

## Timing attacks

Not sure about the situation, here.  The Apple document mentions them
and points to a [PACMAN][] talk which mentions (at 13:50) the security
implications behind the "just do the fetch anyway" mitigation for timing
attacks having its own security implications.

I'm still wondering about "divert to aliasing address" so you get the
same eviction behaviour (don't necessarily fetch anything, just signal
the caches to behave as-if with an eviction).  Then you need to be able
to check the cached-ness of the target memory itself.  In theory it's
the attacker's pointer so it's not revealing new information, but it
goes deeper than that with multi-stage attacks and I really need to get
a more solid grasp on what specifically they meant about the security
implications.

OK, I just looked, and they point to Meltdown-style attacks; where you
perform a load an permissible load and use the data to pollute other
cache lines to determine what that value is while you're still
speculating, before the operation is trapped.

I think they didn't really address "do the eviction but withold the
data".

## Overlapping with pointer authentication

One of my early thoughts about pointer authentication and the way it
was specified (calculating the hash by encrypting the pointer), I
wondered why not just store the whole encrypted pointer.  So even if you
get a coincidental match you don't necessarily get a valid pointer.

Which has brutal implications for the debugger trying to examine register
contents.  But whatever.

I still think this way, to some extent.  I wonder if the tag could be
overlapped with the authentication, and encrypted and decrypted without
judgement as to whether or not those bits formed the correct address.
This means fewer bits get checked to confirm that the pointer signature
passes, with greater risk of false positives, but the encrypted and
decrypted tag will still has a good chance of being corrupted.

[Arm MTE]: <https://developer.arm.com/documentation/108035/0100/How-does-MTE-work->
[Apple MIE]: <https://security.apple.com/blog/memory-integrity-enforcement/>
[PACMAN]: <https://pacmanattack.com/>
