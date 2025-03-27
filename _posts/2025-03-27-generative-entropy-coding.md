---
layout: post
title: Entropy coding as a text generator
---
Entropy coding revolves around making likely symbols short and unlikely symbols long.
In principle you have some pre-arranged model of the thing you want to compress and decompress,
and you use that model to tell you the likelihoods that different symbols will turn up next and then you distribute the coding space accordingly,
so it takes very few bits to land in the likeliest buckets and many more bits to force the outcome to land in an improbable bucket.

What this means, in the long run, is that if your model is exceedingly good then you can decompress random bit strings and that bit string will only
rarely venture into the low-probability corners of the model, and for the most part it will generate "plausible" output.

Normally sensibly-sized models with perfectly acceptable compression do not yield such results.  They yield nonsense, instead.
LLMs are, in this sense, not-at-all-sensibly-sized models which in fact _do_ yield such results.
And they can be used for compression, and some people have looked at that, but running those as a compression scheme is too costly for my purposes.

What I've looked for in the past is something in between.  A model of English language which is large enough to generate plausible text, but not so large as to upset my own sensibilities about efficiency.

I have been able to get what I would classify as "highly inebriated human writing with the guidance of autocorrect",
and with a bit of tinkering I've been able to get it to follow themes by training it on different inputs.
But it was not efficient.  Which is fine, because it was just a prototye, and I had plans for how to compact it down to something reasonable.

Then LLMs came along and blew everything I'd done out of the water, so the project stopped being fun.

So far this is just another quick note because this doesn't fit inside of something else I'm writing.  The key point is that the methods do exist, and the above is the _basic_ outline of how and why they work.

But let's try to elaborate briefly before I fall asleep...

What I had was something a bit Markov-oriented, with a dictionary of something like 10k words, and some rules about tokenisation.
That and a range coder.
A big challenge that I faced was the need to make the whole system bijective, but that's not important here.

And I would collect statistics for chains of different lengths and use them in a kind of cascade to supplement each other where greater lengths petered out, and all that.

What I realised while I was doing that was that I was probably better off _assuming_ that the probabilities followed a fixed distribution
and focus the effort on deciding the _order_ of the tokens within that distribution.  There are [stochastic methods](/stochastic-sorting/) for this.

The next challenge might be to perform the same distribution fusion when they're expressed as orders under a fixed curve rather than histograms.
But I have a suspicion that actually these graphs will cluster in ways that could, for example, be categorised as nouns and verbs and adjectives, etc., and that there will be a better-informed way to blend them.

I'm sleepy, now, so I'll stop.  Hope this is informative.
