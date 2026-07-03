---
layout: post
title: Why highest-set-bit is better than count-leading-zeroes
---
I do not like count-leading-zeroes (`clz`) as a machine instruction.  I
think it's clumsy and unergonomic and fails to justify itself in any
practical applications that I can think of.

`clz` tells you how many zero bits there are starting at the most
significant bit of a word and counting downwards until it encounters a
bit which is not set to zero.

```
 f e d c b a 9 8 7 6 5 4 3 2 1 0 f e d c b a 9 8 7 6 5 4 3 2 1 0 
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|1|0|1|1|1|0|0|0|0|0|0|
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
CLZ: 21
MSB: 10
```
```

                                 f e d c b a 9 8 7 6 5 4 3 2 1 0 
                                +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
                                |0|0|0|0|0|1|0|1|1|1|0|0|0|0|0|0|
                                +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
CLZ: 5
MSB: 10
```

This tells you how many bits you can shift the value left without
overflow, which sounds good but that's not always as useful as it
sounds.

If you perform that shift then you'll find you're always leaving the
"top" bit set (unless the original input was zero).  Knowing it's always
set means you often don't care to save it, and you're happy to shove it
off the end and forget about it.  In that case `clz(input) + 1` is the
shift amount you really want.  So even for this basic operation you
already need to tweak the result before using it.

If you're doing anything else then that fixup probably folds into
another operation.  Like, maybe you're normalising things to 12-bit, not
to the word size you started with.  Then you really want to shift by
`12 - (WORD_SIZE - clz(input) + 1)`, which simplifies to
`clz(input) - (WORD_SIZE - 13)`.

Around and around we go with numerous hypothetical use cases, but we
almost always end up doing some kind of fix-up which simplifies down to
a single add or subtract of a constant on the result of the `clz`
operation; and nothing seems too terrible about all that.

Except... if we're already on the hook for a fix-up in almost every
situation then why not just say what you mean in the first place?  `msb`
tells us the bit index (weight) of the most significant set bit.  So why
not just shift by `12 - msb(x)` to place the msb in bit 12 of the
result?

It happens to implement `floor(log2(x))` for integers, and doesn't bring
in word-size considerations unnecessarily.  You insert word size
constants yourself when trying to bit-pack according to your intent,
rather than according to an implementation detail.  So the result of the
operation is consistent across data types and platforms.

In my experience it has minimal effect on compiled code size, but it
comes out much more succint in the source, and it's easier to reason
about, and I doubt the hardware cares at all about the difference in
implementation cost.  Architectures can use zero-extension to re-use
the logic on different sizes if need be, and C type promotion can't trip
you up.
