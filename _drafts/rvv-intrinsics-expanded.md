---
layout: post
title: Syntactic sugar for RISC-V Vector extensions
---
While I never did much of consequence with x86 vector intrinsics, I did write
a lot of assembly for Arm NEON, and I found the transition to C intrinsics to
be acutely painful.

Then came SVE, then came RISC-V Vector (RVV).  Thankfully these used a lot
more fuction overloading (native to C++, but also enabled as an extension in
C).  But RVV is _still_ painful.

The most outstanding wart is the decision to adhere strictly to the assembly
mnemonics.  Where assembly (which lacks types) has to distinguish between a
signed and an unsigned operation, the name of the intrinsic function changes.
And where assembly cannot deduce the element size from the (typeless) pointer
argument, the name of the intrinsic function changes.

LMUL and the bit width of lines are often codified in the function name
unnecessarily, too.  Making it challenging to switch between signed, unsigned,
or floating-point types without explicitly calling out all the other details of
the type.

And there are many cases where the natural function arguments are not adequate
to deduce the complete type (including LMUL) of the operation.  `vle`, for
example.

These are a huge obstacle to template metaprogramming and code generality.

But it struck me there's this ever-present vector-length argument.  It's a
`size_t`, but it could be changed to an integer-compatible(ish) family of types
bearing the additional type information needed to deduce the missing details.

You can use constructors which take separate element and LMUL size arguments,
or take a vector type for the same effect.

More questionably I wondered if that argument should be extended to also
encode the mask register and/or the undisturbed/agnostic modes for tail and
mask modes, rather than having `_tumu`, `_tu`, etc., function name variants.
This would imply packing the two arguments together in a single function
argument which might help mitigate the eye-crossing effects of long parameter
lists, as they would be packed together in a single constructor call (which
also codifies the mask policies).

I did a bit of an ad-hoc [sketch][] of a few ideas, but I really need to pick
up the intrinsics list generator and use that to generate the utility functions
more comprehensively.

When I find time.

[sketch]: <https://github.com/sh1boot/rvv_utils/blob/sketch/sketch.cc>
[intrinsics viewer]: <https://dzaima.github.io/intrinsics-viewer/>
