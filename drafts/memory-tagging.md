---
layout: post
title: Memory tagging
---
Years ago I happened across an early description of techniques which
subsequently became [Arm MTE][].  It tied in neatly with other concepts
I'd worked with in memory aliasing and diagnostics, and I saw it as
unlocking a huge world of potential, and I raved at length about
possibilities.  However, the final design turned out to be something a
lot more muted than all the ideas I had, and when I saw it I lost most
of my energy for the idea.

Fair enough, though.  I always approach these things much too
aggressively, with no regard to backward compatibility or just what a
nightmare it would be to rework the software to achieve all the things I
see could be done.  These are obstacles to adoption for people who
aren't as unhinged as I.  Clearly Arm wanted something that people would
adopt without all that hassle.

But just recently I learned that [Apple][Apple MIE] seem to have felt
the same way as I did, and they actually did something about it.  I
haven't been able to find much detail so far, but their discussion about
having to do it in conjuction with substantial OS and application
rewrites rings true.  Just my scene.

Since I can't find any straightforward explanation for what Apple wanted
changed I reverted to form and just started making up all my own things
all over again.  Possibly resurrecting my old ideas or something.  I
forget everything I thought the first time, but I do remember being
talked down from a couple of ideas which I seem to have re-invented
again in this iteration.

One thing I do remember is that my initial mental model worked at a
cache line granularity, because there are a lot of shortcuts that this
allows.  The official spec goes down to 16 byte granularity, which means
I have to think a lot harder about some implications.

## Memory tagging in brief

Basically every address (at 16 byte granularity) gets embedded within it
a tag of around four bits.  If you try to use memory with the tag that
is not assigned to that memory then you get told off at the hardware
level.  Data caches already examine addresses in detail to see if they
have the data, so it's no great stretch to define a hit as a "well yes,
but actually no" as needed.  You just sacrifice tag granularity to
achieve it that way.

To make this useful, you colour adjacent objects in memory with
different tags so that pointers to one thing can't encroach on adjacent
memory designated for other things.

When memory is freed you can mark it with a different tag so the old
pointers with the old tag don't work anymore, and when it's re-allocated
the new pointers will have a new tag and the old pointers can't
interfere with it.

But it's only a few bits so there's still some risk of collision, and
that makes it hard to exploit in more ambitious applications like
generic heap colouring.

## Repurposing memory

The first thing that stands out to me is how you change the tag
assignment of a piece of memory.  If you execute instructions to change
the tags of each cache line (or backing store for memory not resident in
the cache right now) then that's potentially a very tedious operation.

But what if one didn't bother with that?

What if, instead, writes automatically erased the memory whenever the
tag failed to match (no need to raise a fault just yet), and
simultaneously updated the tag to its new value?  No need to visit SDRAM
in that case.  Note that a tag update hits (and erases) the whole
16-byte chunk (I _so_ wish this was a cache line) line even though the
data will typically be narrower.  The rest needs zeroing.

Then it's down to the reads to raise faults when they hit a bad tag.
That'll be a fault if the wrong pointer is trying to access memory, or
the current owner hasn't yet initialised the memory, but also if a bad
actor has tried to stomp on that memory with an incorrect tag (albeit in
a deferred way).

You shouldn't be reading something that you haven't already initialised
for yourself anyway.  So if you get a fault trying to use your own
memory then it's probably uninitialised data and you should go fix your
code.

Except, not exactly...

First, this leaves open the possibility of a bad actor just trying to
erase legitimate date while it's being used.  In this case innocent code
won't be able to read what they injected because the updated tag will
cause that code to fault instead, but if they can inject a bad write
before a good write then all the data surrounding the good write can be
silently erased.

Now at this point I'm inclined to think "OK, it's just a 12.5% tax to
keep a 'valid' bit for each byte", so you can still fault on every
undefined read in a cache line which you've only partially written (or
been tricked into re-erasing by a bad actor).

Strictly that tax should run down the whole memory stack to account for
evictions at all the levels.  That's untenable.  You can fudge it when
it gets too far away from the CPU but that just means the attacker has
to force evictions to make their attack viable, and they've never had
any difficulty doing that.

It gets worse, though, because not every first memory access is a whole
byte.  Many are necessarily read-modify-write operations because they
need to modify less than a byte, or it involves a bitfield which doesn't
start and end on byte boundaries.  This means they'll get trapped on the
initial read of those don't-care bits which they would simply write back
again and, presumably, come back around to overwrite later on or just
never use.

### softening read-before-write penalties

This leads me to thinking about having the compiler do analysis to
decide what data _might_ require a read-modify-write and to
pre-initialise just that memory with valid data.  The majority of cases
don't have bitfields anyway, so if those read before writing that's
plausibly something dangerous (not necessarily dangerous, but a fix should
be a price worth paying for greater safety in the general case).

Another approach might be to pre-erase on both reads and writes of wrong
tags, but to also refer to an out-of-band structure with dedicated
mechanisms for fast set-up of tag patterns (conventional data caches
are not fast at this), and to check in that structure, albeit in a less
responsive way than L1 cache, so that a fault can be raised if that
provisional erasure was a misstep.  If we don't get assent from the tag
check then the program is broken and must die, so the spurious erasure
is not the top concern.  Go get yourself a victim cache if that makes
you sad.

Overlooking the matter of how to set up the out-of-band part, this does
mean that L1 cache can switch efficiently _at least_ in the cases where
programs follow the write-before-read data model, while still trapping
faulty behaviour.

Maybe there's a hybrid opportunity, here, where the fault can be trapped
by MSAN to examine the bitfield cases more closely and simulate
bit-accurate tagging as needed.

This seems to leave open a little window of speculation attack surface
where you might trick the application into reading zero and behaving as
if a function call succeeded while it's still speculating.  I don't
expect any branch decisions to be affected during speculation based on
speculative calculations, but maybe masking and clamping operations
could be fooled.

Have to think about how bad that might be...

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
perform an unpermitted load and use the data to pollute other cache
lines to determine what that value is while you're still speculating,
before the operation is trapped.

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
decrypted tag will amount to having the same chance of producing an
unusable address.

## Overlapping with memory erase

If tags auto-erase, then they're implementing the first stage in a bulk,
lazy `bzero()` system which elides memory operations and replaces them
with zeroes which will need to be written back later.  The original
4-bit tagging scheme is not going to be reliable for large-scale erasure
between tasks (which is critical, and not just a helpful debugging
feature).  But there are a couple of ways to mitigate that.  One is to
extend the tag with a task ID (it doesn't have to fit in the address
register any longer, so its size is not so limited), which the OS
contrives to guarantee to be unique.  Another might be to have a
separate "definitely erase" bit alongside the tag id, so it's treated as
a mismatch regardless.  This requires updating or flushing the L1
cache, though, so it's comparable to just calling `bzero()` before
handing the page over.

[Arm MTE]: <https://developer.arm.com/documentation/108035/0100/How-does-MTE-work->
[Apple MIE]: <https://security.apple.com/blog/memory-integrity-enforcement/>
[PACMAN]: <https://pacmanattack.com/>
