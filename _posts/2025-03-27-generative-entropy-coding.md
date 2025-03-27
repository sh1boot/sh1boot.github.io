---
layout: post
title: Entropy coding as a text generator
---
The compression gains of entropy coding revolves around making likely symbols short and unlikely symbols long.
In principle you have some pre-arranged model of the string you want to compress and decompress,
and you use that model to tell you the likelihoods that different symbols will turn up next and then you distribute the coding space accordingly,
so it takes very few bits to land in the likeliest buckets and many more bits to force the outcome to land in an improbable bucket.

What this means, in the long run, is that if your model is exceedingly good then you can decompress random bit strings and that bit string will only
rarely venture into the low-probability corners of the model, and for the most part it will generate "plausible" output.

Normally sensibly-sized models with perfectly acceptable compression do not yield such results.  They yield nonsense, instead.
LLMs are, in this sense, not-at-all-sensibly-sized models which in fact _do_ yield such results.
And they can be used for compression, and some people have looked at that, but running those as a compression scheme is too costly for my purposes.

What I've looked for in the past is something in between.  A model of English language which is large enough to generate plausible text, but not so large as to upset my own sensibilities about efficiency.

I have been able to get what I rate as "highly inebriated human writing with the guidance of autocorrect",
and with a bit of tinkering I've been able to get it to follow different styles of writing by training it on different corpii.
But it was not efficient.  That's fine because it was just a prototye, and I had plans for how to compact it down to something reasonable.

Then LLMs came along and blew everything I'd done out of the water, and I was struggling with the problems of bijective tokenisation, so the project stopped being fun.

And that's all I really needed to write, because this is just another quick note which doesn't fit inside of something else I'm writing.  The key point is that the methods do exist, and the above is the _coarse_ outline of how and why they work.

But I'll try to elaborate briefly before I fall asleep...

### What I did

What I was doing was using a string of tokens; most of which was a
dictionary of maybe 10k words, and then the rest of the alphabet and
punctuation and stuff to spell out anything that wasn't in the
dictionary.  The basic idea being that I was never going to build tables
large enough to spell whole words reliably, but I could ensure whole
words frequently came out by starting with a dictionary.

Then I'd collect histograms for Markov chains of varying lengths.
Again, some chains would never be populous enough to provide meaningful
statistics, so I would have to revert to shorter chains to fill the
voids, or try to fuse tables from several lengths.

And then after tokenisation (which was supposed to be bijective, but
that's a complication for another time) I would use a fusion of the
statistics of whatever markov chain histograms were applicable to
measure out the probabilities for the next symbol.  Then use a range
coder based on that.

### What I decided I should have done

OK, even halfway in it seemed like I should probably have gone away and
learned more about recursive neural networks because they were
performing much better than my system.  But I still had stuff in this
approach that I wanted to try and my system looked really cheap (in a
good way?).

I realised I was probably better off making assumptions about the
_shape_ of the distribution of tokens after sorting by frequency, and
then for each table trying to sort the tokens into the order which fit
that shape.

There are [stochastic methods](/stochastic-sorting/) for doing this.
Maybe if I thought harder I might come up with a method which
stochastically sorts _and_ shapes the curve at the same time.

Intuitively you might expect nouns to collect at the front of one table,
and verbs to collect at the front of another table, etc., and for the
frequency to roll off according to how many nouns or how many verbs or
how many boths are in the dictionary.  But that was something for the
algorithm to sort out for itself.

Afterwards I would look for where I could quantise all this, and fold
together tables which were close enough to treat as identical, and
places where things were flat enough to just throw away.

A lot of this can probably be modelled by the way LLMs are constructed,
but without all the hard-wired assumptions.  What I was looking for was
the hard-wiring which would bring the cost (mostly memory) of
implementation right down, even if it cost me a lot of flexibility and
quality.
