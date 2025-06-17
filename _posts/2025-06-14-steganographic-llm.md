---
layout: post
title: Hiding messages in machine-generated text
tags: steganography, ai
---
On a whim I thought I'd try getting [ChatGPT][] to do a bit of
[steganography][] for me.  There are a bazillion ways (give or take) for
hiding a secret message in unrelated cleartext, where there's a
trade-off of secret bandwidth against cleartext flexibility.  I chose
[Morse code][] encoded in the last letter of each word, because it's
obvious and easy to express as rules that anybody can follow.

Anybody except for ChatGPT, it turns out.

The rules I gave were simple enough:
* A word ending with a vowel represents a dot.
* A word ending with a consonant represents a dash.
* A word ending with a y represents the gap between letters.
* Express a message in morse code, using the above substitutions of
  words for symbols.
* The words should be chosen to form coherent sentences.

That seemed to leave plenty of freedom for choosing words.

It turns out schemes like these are called [acrostics][] or telestichs
(the latter in my case).  The extra layer of using morse code and groups
of letters helps to make it less obvious than traditional acrostics, but
it takes several words to make a letter of the hidden message.

I thought an LLM should be able to churn out a coherent paragraph under
those constraints, and I'm sure that it could if it could remember what
it was supposed to do, but I had some difficulties.

For the secret message `example`, ChatGPT gave me:
> Alone Henry left a trail then slept quietly, and followed slowly too.

I don't know what that means or why it wrote it, but it decodes as:
```
. -.--- -- .
```
Which comes back out as `E�ME`.  That's not quite right.

Let's try fixing it by hand:
> Alone, Henry left the tree. Then sleepily he sat. Slowly following on
> my horse. What could he say? The adverbs are too many to try.

```
. -..- .- -- .--. .-.. . 
```

There.  Fixed.  But that wasn't as much fun as I thought it would be.
The adverbs are indeed too many.  While there are plenty of words ending
in y to choose from, it gets hard to think of things that aren't adverbs
or adjectives.  And that need comes up too frequently.

Obviously having only words ending in one letter to choose from for that
marker is too restrictive, and y is an especially distracting choice.
Some markers could simply be dropped because there are a lot of cases
where it's not ambiguous, but unambiguous cases are at the end of
infrequent letters, where it's frustrating already.

I won't try to fix this because it's not my priority.  All I wanted was
something with the simplicity of a children's game.  Unfortunately I
feel like it's a bit too tedious for many kids to encode their own
messages.  At least without the support of an editor or thesaurus to
offer up practical synonyms.

Or, of course, one could just make an LLM do it, as was the original
plan.  I'm sure it _should_ have no trouble if it can be put in a
suitable wrapper to keep it on track.  But I'm too lazy, which is why I
went to ChatGPT in the first place.

But there are many related schemes would could be devised, and I think
technology is in a place, right now, where it should be trivial to
automate.  I just can't be bothered doing that.


[ChatGPT]: <https://chatgpt.com/>
[steganography]: <https://en.wikipedia.org/wiki/steganography>
[Morse code]: <https://en.wikipedia.org/wiki/Morse_code>
[acrostics]: <https://en.wikipedia.org/wiki/Acrostic>
