---
layout: post
title: On the overlap between data compression and random numbers
---
There's a lot of overlap between random number generation and data compression.  With random number generation there's a need to produce unpredictable (even if deterministic) values conforming to specific distributions, and in data compression there a need to identify points which are expected to match specific distributions.  All that with dependent variables in n dimensions.

In scientific computing one needs to be particular about statistical correctness for scientifically valid models, and in compression it's needed to get the best compression performance.

TODO: discuss

See also: [generative-entropy-coding](/generative-entropy-coding).

* Marsaglia's work on approximating arbitrary distributions
* how distributions are used for compression
* the relationship between decompression and generative algorithms which for statistical models
