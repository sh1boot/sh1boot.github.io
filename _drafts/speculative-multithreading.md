---
layout: post
title: Speculative multithreading
---
If you can speculatively execute instructions and then cancel them when
something interferes, could you also speculatively launch threads and
cancel those, using the MMU, too?

I've been wondering about a pipeline process where, notionally, some
work unit is ingested, and something happen to it, and then it's passed
to different logic, and something different happens, etc., until it's
written out.  A trivial pipeline.

So I'm thinking what if the single read and write calls acted like fork
and join, where the read returns as many times as there are work units,
and the write terminates each of those threads and returns only once,
but each thread exists in its own private copy-on-write world but with
additional traps where if an earlier thread writes anything which a
later thread has already read, then the later thread gets rewound to
right before the read, so it can retry with the new value, _as if_ the
first thread had already run to completion before the second thread
launched.

Then instead of writing threaded code, you just bash out single-threaded
code and hope the OS can sort it out for you eventually.  Then circle
back if you have time to mitigate some of the unnecessary restarts.

You'd need to have the compiler insert instrumentation for any object
that gets written so that the appropriate traps can be set around the
reads.  I'm not sure it'd be healthy to try to use the MMU for that,
given its 4kB granularity, but maybe with careful compiler support to
tease apart the objects into orderly boundaries that could work.
