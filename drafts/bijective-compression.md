---
layout: post
title: On bijective compression
---
Most compression schemes are not bijective.  That is to say, there is
not a one-to-one mapping between input and output bit patterns.  While
it's freuqently[^1] true that a given compressed stream has only one
correct decompressed stream that it can be converted to, it's rarely the
case that a decompresed stream has only one expression as a compressed
stream.

This is true at the level of raw compressed bitstreams.  On top of that
there's packetisation and configuration headers which allow compression
to run in many different configurations to produce differently
compressed outputs which will map back to the same input.  These
wrappers _also_ undermine the possibility of a bijective mapping.

And that's just fine.  Bijectivity rarely matters.  It reflects a tiny
bit of redundancy that you can say the same thing two different ways,
it's rarely worth suffering the extra complexity in order to salvage
that redundancy.

But sometimes...

If you do have a bijective compressor then you can, in theory, compress,
encrypt, and decompress a message, and then the decompressed message
would be able to be re-compressed, decrypted, and decompressed back to
the original message.

Bijectivity is essential, here, because if there's more than one way to
compress a message, or more than one compressed bit string which could
be decompressed to the same output, then there's no way to guarantee
that the re-compression step will choose the right compressed bit
string, and the decryption step will not work as intended.

Unfortunately decompressing encrypted data would typically yield
nonsense.

But it is possible to design a compression scheme which is highly
application-specific, and allocates the bulk of its coding space to
highly plausible messages, and requires very long, specific (and
consequently improbable) bit strings to produce nonsense output.

Essentially you have to carefully model the language you want to
compress so that it's very efficient at coding plausible text and very
inefficient at coding nonsense.  Then most random bitstrings will fall
close to the plausible end of the spectrum.

This is how entropy coding works.  It gives short codes to things that
are likely and very long codes (or no codes at all) to things that
aren't at all likely.  Here we use likelihood as a surrogate for "making
sense", because we assume it's most likely that a message will contain
familiar words in familiar grammatical structure, rather than a random
jumble of letters and punctuation.

And then you have to make that encoding strictly bijective.

To relax constraints a bit you might say that it's bijective only after
applying a filter which removes things which cannot be encoded reliably,
but which shouldn't meaningfully damage the message.  Things like
illegal UTF-8 sequences, control characters, maybe even spelling
mistakes, and stuff like that.

There's a fair amount of material out there about using RNNs as
predictive models for text compression, but I'm not aware of anybody
focusing on bijective encodings.

[...]

[^1]: A counterexample is where audio codecs are defined in terms that
    allow them to have variations in their output values but which must
    stay within some thresholds.  Video codecs are less forgiving
    because they rely on back-references where small errors could
    persist or be amplified over time.
