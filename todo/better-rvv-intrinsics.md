---
last_modified_at: Tue, 10 Sep 2024 23:16:08 -0700  # a38e1fe expand-rvv-intrinsics
layout: post
title: Syntactic sugar for RISC-V Vector extensions
---
While I never did much of consequence with x86 vector intrinsics, I did write
a lot of assembly for Arm Neon, and I found the transition to C intrinsics to
be acutely painful.

The [ACLE][] Neon intrinsics are very explicit about types, and don't
allow the sorts of aliasing that one usually has to do to for tricky
optimisations.

Then came SVE, and then came RISC-V Vector (RVV).  Thankfully these used
a lot more fuction overloading (native to C++, but also enabled as an
extension in C).  But even with that RVV is _still_ very painful.

The most outstanding wart is the decision to adhere strictly to the
assembly mnemonics.  Where assembly (which lacks types) has to
distinguish between a signed and an unsigned operation, the name of the
C++ intrinsic function changes.  And where assembly cannot deduce the
element size from its (typeless) pointer argument, the name of the C++
intrinsic function changes.

LMUL and the bit width of lines are often codified in the function name
unnecessarily, too.  For example, you can't `vreinterpret` between
signed, unsigned, or floating-point types without explicitly calling out
all the other details of the source type at the same time.  Even though
it's right there in the input.

There are, of course, cases where the natural function arguments are not
adequate to deduce the complete type (that is, including LMUL) for the
operation; `vle`, for example.

And probably most surprising of all is that some LMUL/type combinations
are undefined because they _could_ (not necessarily because they do)
produce nonsense cases on some hardware.  These configurations can be
supported in hardware and would only come about as a consequence of
running on hardware which supports them, but you have to do workarounds
to access them, or even to get generic code to compile.

These are all huge obstacles to template metaprogramming and code
generality.

A lot of this can be replaced with functions with simpler names and more
overloading.  But that still leaves a lot of warts.

You can pass template arguments to fill in some gaps, but it struck me
that there's this ever-present vector-length argument.  It's a `size_t`,
but it could be changed to an integer-compatible(ish) family of types
bearing the additional type information needed to deduce the missing
details.

That mostly just relocates the template-argument problem to the
constructor for the length argument, but at a minimum it hoists the
decision to the top of a function and keeps it out of the main loop, so
things are easier to read.  You can use constructors which take separate
element and LMUL size arguments.

From that point on that variable informs whichever operations need to be
informed without interfering with the flow of the logic.  It can also
serve as a weak (or strong?) continuity check by being compatible only
with the appropriate other vector-length types after widening or
narrowing operations.  Give or take signed/unsigned mixing, which is
often deliberate.

More questionably I wondered if that argument should be extended to also
encode the mask register and/or the undisturbed/agnostic modes for tail and
mask modes, rather than having `_tumu`, `_tu`, etc., function name variants.
This would imply packing the two arguments together in a single function
argument which might help mitigate the eye-crossing effects of long parameter
lists, as they would be packed together in a single constructor call (which
also codifies the mask policies).  I'm not sure this is possible,
though, because of constraints on encapsulating a variable-length type
in another structure.

So anyway... I did a bit of an ad-hoc [sketch][] of a few ideas, but I
really need to pick up the intrinsics list generator and use that to
generate the utility functions more comprehensively.

When I find time.

I see there's standard SIMD stuff in C++, now(ish), too:
<https://en.cppreference.com/w/cpp/experimental/simd>

Not sure how to reconcile these.

[sketch]: <https://github.com/sh1boot/rvv_utils/blob/sketch/sketch.cc>
[intrinsics viewer]: <https://dzaima.github.io/intrinsics-viewer/>
[ACLE]: <https://arm-software.github.io/acle/main/acle.html>
