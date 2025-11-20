---
layout: post
title: Shadow stack and physical registers
tags: computer-architecture security
---
Something I feel the world missed when it adopted shadow stacks for
security is that if that stack is secreted away in a place the
application shouldn't be able to interfere with, then there's a much
weaker coherency contract needed with the rest of the memory system.
This stack address register is a `restrict` pointer and the local thread
can reorder and defer writes as much as it pleases and nobody can
complain.

If I did a shadow stack then I would be inclined to store not just
return addresses but also every spilled register and variable to which
no pointer is taken.

Couple this with dedicated instructions (or generic instructions with a
dedicated register I guess is the same thing), with only constant offset
encodings, and you have what is notionally marked as a load/store
instruction but which might actually be implemented as something
different.  At least temporarily.  It might just be a mov between
physical registers.  That threshold can be drawn at an arbitrary offset
distance (not necessarily just the encodable offset), but if you switch
modes halfway along then that coherency contract may raise its ugly head
again.

So where register spills normally go straight to the memory interface,
which was a tipping point dictated by the architectural register set and
a bit of compiler guesswork, perhaps there's scope to apply different
policies, in hardware, which suit the particular implementation better.
Keeping the memory interface and all its coherency faff out of the
picture for longer.

With a huge (_huuuuuuge_) caveat that at some point these writes do need
to find their way to memory, and this evokes the SPARC stack frame and
all the associated difficulties.  Maybe learn from their mistakes and
challenges but without necessarily being scared off by them.

Do I remember reading about an architecture which invalidated the tip of
its stack when returning from functions?  Or is that a thing I invented
for my own purposes?  Well... that would be a thing, here, anyway.
Invalidate the tip of your stack and hope it never reaches memory at all.

TODO: also store entropy magic, canaries, etc...
