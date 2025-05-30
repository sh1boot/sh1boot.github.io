---
last_modified_at: Sun, 30 Mar 2025 21:47:59 -0700  # d854e5e publish-pointer-authentication
layout: post
title: Pointer authentication weakness and mitigations
redirect_from:
 - /drafts/pointer-authentication-vulnerability/
tags: security computer-architecture
---
[Pointer authentication][] involves taking things like the return address
and inserting an authentication tag into unused bits -- a cryptographic
signature -- before storing the pointer to memory, and then confirming
that the signature agrees with the pointer destination after loading it
back from memory and before using it again.

Years ago I noticed an issue here, in the case where the process of
verifying the signature does not lead to an immediate fault.  In that
case if the signature fails then it produces an invalid pointer and
correspondingly, to prevent misuse of this situation, trying to sign an
invalid pointer results in a pointer with a _deliberately incorrect_
signature.

### Tail call optimisation

You can see both of these cases working together in function tail call
optimisation.  When one function ends by calling another function, to
avoid extra steps it can jump directly to the beginning of the next
function and let that function perform the return to where the first
function was originally called.

When this optimisation is used the first function needs to ensure that
the link register points to the place it was called from.  Typically by
loading this value from the stack.  With pointer authentication this
value loaded from the stack would have its signature checked, and if the
signature fails then the pointer is set to an invalid value.

If the function returned here it would raise a fault trying to branch to
the invalid pointer.

But with tail call optimisation program flow instead jumps to the next
function.  That function adds a new authentication code to the pointer
in order to store it back on the stack.  But that operation also
recognises that the incoming pointer is invalid and so it corrupts the
signature to ensure that the next authentication check also fails and
eventually leads to a fault when it's used for a return branch.

### The incorrect signature

The problem is, the incorrect signature has to be a value which is
definitely not correct.  The way this was defined was to take the
correct signature and flip one of the bits, which is definitely not the
same value.

But what if the attacker can exfiltrate that newly signed pointer,
and escape the function without actually using it?  Then they can flip
that bit back and now they know the correct signature for that pointer.

### A pointer-signing gadget

In all what they might do is make several passes through a tail-call
pair where they can read and write the return address from the first
function.  In the first pass read out the normal return address with its
proper signature.  In the second pass inject the pointer to be signed in
the return address of the first function but set things up so it won't
return via that pointer -- perhaps by forcing a `longjmp()` return, or
by injecting the normal return address back in there somewhere.  Then
read out the mis-signed return address, either later in the second
function, or in a third pass if it's been left lying around on the stack
from the previous return.

With the mis-signed attacker-controlled pointer obtained, without
crashing the program, that pointer can then be corrected to the proper
signature and re-injected.

### Leaking less

What perhaps could have happened was that the incorrect signature be
chosen from one of only two predefined patterns, choosing one or other
with a 50:50 chance but with a 100% chance of being wrong -- eg., choose
a repeating pattern except where one bit is definitely set to the
opposite value of the corresponding bit in the correct signature.  This
leaks one bit of the correct signature, which is at least better than
the previous solution.

Alternatively, leak nothing by returning a constant pattern but risk
producing the correct signature when that signature happens to collide
with the fixed fill pattern.  This sounds statistically reasonable but
may have unintended consequences.

### Oops, no, wait...

As was pointed out to me by the authour of the [Project Zero blog
post][] I'll come to later, if the attacker is already exfiltrating
re-signed pointers without crashing, they can just keep doing it over
and over with different guesses until they get one back that isn't
changed.  That one must have passed the authentication check.

So the remedy above isn't really hepling anyone at all.

### Hiding bad signatures

Having resolved to write this blog post, I started thinking about other
mitigations.

Suppose the attacker doesn't get to see a copy of the un-signed pointers
because the code always signs pointers before writing them to memory.  I
can't promise it, but that's the design intent and we hope no mistakes
are made.

What we need is for in-register pointers to be marked as bad but without
revealing that they were marked bad when they're converted back to
signed form.  That is, that the original bad signature matches the new
bad signature even after converting to and from an invalid pointer.
Then the attacker gets back unmodified pointers in all cases and they
don't learn which one was temporarily a valid pointer.

That would require a bijective transform where good signatures map to
good pointers and bad signatures map to bad pointers.  And back again.

That's unlikely to work out; but the coding space for signed pointers
and the coding space for invalid pointers should at least be comparable
in size, so an approximation where some bad signatures are corrupted but
many bad signatures are kept must at least be feasible.  Even if 3/4 of
bad signatures are eliminated from the search by being corrupted in the
transform that still hides the correct signature among many fakes.

### Minimising the changes

A naive approach would be for the signing and testing operations to
modify the pointer only if it has the correct input form, and otherwise
leave it at its original value.  This won't quite work because one can
inject a valid pointer where a signed pointer is expected and the result
of testing it will be its original value because the signature is wrong,
and you end up with a valid pointer and no fault.  So you need
additional rules that for both operations, when given a faulty input,
must alter their output iff the output would otherwise be valid,
otherwise leave it as its original value.  Given a valid input always
modify it to a valid output.

Sounds reasonable, but it needs further thought.  What happens when the
attacker's signed guess is also, coincidentally, a valid pointer, for
example?

Well, in a space where signed pointers and legal pointers overlap,
there will be cases where a valid pointer is, coincidentally, also
correctly signed.  In this instance the pointer will not be modified
when going through both transformations; whereas if the signature had
been wrong then the pointer would need to be made invalid upon checking
the signature, but when converting it back to a signed pointer it
[probably] would not need to be modified again because it's unlikely to
have become a correctly-signed invalid pointer.  So in all likelyhood if
you put a valid pointer in and it comes back unmodified then it was
also correctly signed, rather than any of the cases where it was an
invalid pointer after the check but transformed back to itself after the
new signature.  So the attacker knows they've found a winner.  Probably.

If they have flexibility in the range of malicious pointers they could
inject, then they might simply search for one such case where this
works out, rather than trying to guess signatures involving invalid
pointers which are much more likely to yield false positives.

Isn't this fun?

So to try to signal that the pointer should be modified _back_ again,
after being rendered an invalid pointer, under the existing policy you
would have to make it something which is an invalid pointer but with a
correct signature, so the re-signing process remembers to change it.

But that's a bad idea.  What if it leaks?  We _assumed_ it wouldn't at
the start of this exercise, but that's not a guarantee.

What probably works better is if you encode things that signed pointers
are not valid pointers, and valid pointers are not signed pointers.
Then the policy might work better.  Then if you put a valid pointer in
as a signed pointer, it's _expected_ that it will be corrupt.  Revealing
no information.  If you put a correct signature in, then it becomes a
valid pointer temporarily.  And if you put an incorrect signature in,
then it remains unchanged in both directions, because a signed pointer
isn't a valid pointer so that doesn't need to change, and an incorrectly
signed invalid pointer is already incorrectly signed so that doesn't
need to change either.

Will it work?  I'm not sure...

### Thinking harder

To reason on this further I propose a 27-state system.  All combinations
of { signed (intentional), signed (coincidental), unsigned }, { valid
(intentional), valid (coincidental), invalid }, and { modified
(intentional), modified (evasive), unmodified } (maybe there are more
modified states, but the point is we want to maximise the case where
modifications cancel).  Formalising the transitions through each pointer
operation and walking them all through normal and subversive paths.

The original weakness is a thing I found years ago (and duly reported)
and has also been documented in a [Project Zero blog post][].  In that
write-up you'll find active-in-the-wild gadgets, whereas I just
handwaved mine into hypothetical existence.

If you read the pointer authentication spec there are other troublesome
cases described which might be used in combination to interesting
effect.  There's a mitigation I proposed involving tracking call paths
to make replay harder, but which wouldn't mitigate what I describe here.
Another approach might be to use a shadow stack (the same one as the CFI
return stack, I guess) of random values to be used as tweaks on the
signing function, which could be unique on every entry into a function
and saved for the duration of the function but not saved on the stack
which is vulnerable to exfiltration (this is important because the
random values might be predictable once you capture some).

## And another thing!

Trying to recall some details, what I remember is that there are a
couple of perturbations to the signature to reduce reuse attacks.  One
is a handful of different instructions referencing different keys for
different use cases, and the other is I _think_ an arbitrary register
but nominally the stack pointer, is used as an extra paramater to mix
things up, and prevent re-use at different stack depths.

It might have been better to use instructions in the coding space
offering address generation operands (ie., load/store-style instruction
encodings).  So the swizzle register has an offset consistent with the
base register and offset of a load or store instruction.  Then every
entry in a vtable can use its own address for a swizzle, and you can't
substitute one vtable entry into another (I think you can't just use the
vtable base address, because it's not consistent between classes with
multiple inheritance?).

## And anotherer thing?

While searching for references I noticed [PACMAN][] exists, but I don't
have time to read it right now.  It looks like what I'm talking about
here is not any kind of mitigation; because it relies on speculation
taking the fault path and changing cache timing because of it.

I'm a little surprised at that being a possibility.  My expectation is
that branch prediction would _assume_ that the branch destination was
a prior, unmodified value, and that it would have to cancel all that in
order to get back on the corrupt track in order to speculatively raise a
fault, and by then it's probably not doing anything speculatively
anymore.

I guess I'll have to read it.


[Project Zero blog post]: <https://googleprojectzero.blogspot.com/2019/02/examining-pointer-authentication-on.html>
[Pointer authentication]: <https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/pointer-auth-v7.pdf>
[PACMAN]: <https://par.nsf.gov/servlets/purl/10472523>
