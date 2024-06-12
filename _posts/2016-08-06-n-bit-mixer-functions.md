---
layout: post
title: N-bit Mixer Functions
description: A collection of mixer functions in the style of Murmur hash's finalisation mixer, for 8 to 128 bits.
categories: random, hashing
---
For reasons I intend (hah!) to go into in a longer post I was looking for
operations with which to construct and whiten (or "finalise" or "mix" or
"avalanche" or whatever) RNGs with 2<sup>n</sup> periods.  I was looking at
[splitmix64][] which led me to
[Fast splittable pseudorandom number generators][] which cited
[Improving on MurmurHash3's 64-bit Finalizer][] (although I found that page by
other means) and finally [MurmurHash3][] which tells me where those constants
and that construction both come from.

The results seemed good, so I put together something (more GA than SA) to get
me some coefficients for other bit widths.

Here's some provisional data... the peak error is over 100 million random
values (from /dev/urandom), mostly, except where the period doesn't allow that
many values (everything before 27 bits) in which case I just tested every legal
value exactly once.  This makes the error explode because there's not much
opportunity to average anything out.

| Bit width | `>>` | `*`       | `>>` | `*`               | `>>` | Maximum error  |
|-----|----|--------------------|-----|--------------------|-----|:---------------|
|   8 |  4 |               0x2b |   5 |               0x55 |   4 | 0.093750000000 |
|   9 |  7 |               0x2b |   5 |               0x93 |   5 | 0.070312500000 |
|  10 |  4 |                0x7 |   4 |              0x2b5 |   5 | 0.058593750000 |
|  11 |  5 |              0x42b |   6 |              0x253 |   6 | 0.046875000000 |
|  12 |  7 |              0x347 |   5 |              0x52d |   7 | 0.033203125000 |
|  13 |  8 |              0x3ab |   7 |             0x194b |   8 | 0.026367187500 |
|  14 |  8 |             0x68ab |   8 |             0x594b |   8 | 0.020996093750 |
|  15 |  7 |             0x1bab |   7 |             0x4b53 |   8 | 0.014404296875 |
|  16 |  7 |             0x4bab |   7 |              0xb53 |   8 | 0.013183593750 |
|  17 |  9 |             0xb75b |   8 |             0x2653 |  10 | 0.012512207031 |
|  18 |  9 |            0x2b755 |   8 |            0x12653 |  10 | 0.009887695312 |
|  19 |  9 |            0x48933 |   9 |            0x5b2d3 |  11 | 0.006332397461 |
|  20 | 10 |            0x3974d |   8 |            0x4f259 |  10 | 0.006683349609 |
|  21 | 11 |            0x7896b |  10 |           0x13a653 |  12 | 0.004926681519 |
|  22 | 11 |            0x7894b |  10 |            0x3a653 |  12 | 0.003376960754 |
|  23 | 12 |           0x73896b |  10 |           0x23265b |  12 | 0.002951145172 |
|  24 | 12 |           0x818d6b |  10 |            0xfa653 |  12 | 0.002624034882 |
|  25 | 13 |          0x140696b |  12 |          0x149a653 |  12 | 0.002562629428 |
|  26 | 13 |          0x1c0c963 |  12 |          0x54da6d3 |  14 | 0.001363515854 |
|  27 | 14 |          0x340e94b |  12 |          0x349a653 |  14 | 0.001115018187 |
|  28 | 14 |          0xb406967 |  12 |          0x109a653 |  14 | 0.001035343635 |
|  29 | 15 |          0x35069ab |  14 |         0x18cad969 |  17 | 0.000909651612 |
|  30 | 15 |          0x1492cd3 |  16 |         0x138acdad |  15 | 0.000818715149 |
|  31 | 15 |         0x137029ab |  14 |         0x18cad969 |  18 | 0.000714577116 |
|  32 | 18 |         0x3a46a58d |  15 |         0xb1ae6b47 |  16 | 0.000677440000 |
| murmur3 mix32 | 16 | 0x85ebca6b | 13 |        0xc2b2ae35 |  16 | 0.001050510000 |
|  33 | 17 |         0x3e10a9ad |  15 |        0x19b3cb5b3 |  17 | 0.000618514406 |
|  34 | 18 |         0x340dacb5 |  16 |        0x1158ead1d |  16 | 0.000393850182 |
|  35 | 19 |        0x60f7ab4ad |  15 |        0x187ad664f |  19 | 0.000419817890 |
|  36 | 18 |        0xf4e6aa5ad |  16 |        0x5cf296547 |  17 | 0.000350178116 |
|  37 | 18 |       0x380502b58d |  18 |       0x218b3e4a67 |  20 | 0.000405982960 |
|  38 | 19 |       0x2d2044a58d |  17 |       0x2573a9cb67 |  21 | 0.000301914200 |
|  39 | 20 |       0x646ef6a5a5 |  18 |       0x2993b94e67 |  20 | 0.000236915758 |
|  40 | 20 |       0x8c1dc6b4a5 |  16 |       0x29532d4b2f |  20 | 0.000246693234 |
|  41 | 21 |      0x1e900dab6b5 |  19 |      0x1233ea5a165 |  24 | 0.000230126944 |
|  42 | 21 |      0x3ed62c2a5b5 |  20 |       0x23b6bcaa45 |  23 | 0.000235005786 |
|  43 | 22 |      0x52c6b4aa985 |  19 |      0x9aa1b9b4a29 |  21 | 0.000206069208 |
|  44 | 23 |      0x3fdc1c6b585 |  18 |      0xda99ba94a4d |  23 | 0.000257905663 |
|  45 | 24 |      0x211306aa5a5 |  21 |     0x1be912bbaf59 |  24 | 0.000180141084 |
|  46 | 24 |     0x2ff96552b433 |  19 |      0x2a9cbab6887 |  24 | 0.000204931141 |
|  47 | 24 |     0x4a3c4549b663 |  22 |      0x646a7ba2693 |  24 | 0.000273096377 |
|  48 | 23 |     0x4ef84c4a2775 |  21 |     0x2397950b26f1 |  25 | 0.000176776365 |
|  49 | 26 |    0x1320d4942a5a9 |  19 |    0x1c0ea84997ae9 |  25 | 0.000178656649 |
|  50 | 26 |    0x2f6ec6b66ada3 |  19 |     0x918385dba255 |  24 | 0.000184822001 |
|  51 | 27 |    0x1364b0b92ac8b |  20 |    0x4545996b9c4d3 |  26 | 0.000166751484 |
|  52 | 29 |    0x2546831351d5b |  22 |    0x406a5723b5a23 |  27 | 0.000194747920 |
|  53 | 29 |   0x32248b2c14acab |  23 |   0x304c390d6352d1 |  26 | 0.000187919521 |
|  54 | 28 |    0x234501c6e2ce7 |  21 |   0x14e9ba0d5b1b9d |  27 | 0.000166296257 |
|  55 | 28 |   0x6a41d00456b463 |  21 |   0x822d512a89622d |  27 | 0.000188889352 |
|  56 | 30 |   0x76c05318a1a5a7 |  26 |   0x7b0b429929e1ed |  30 | 0.000178735819 |
|  57 | 29 |   0x644469284761af |  19 |  0x3eff48c537459ad |  29 | 0.000158329792 |
|  58 | 29 |  0x314b5493cece1b5 |  22 |  0x2d84f187354cbed |  30 | 0.000179339489 |
|  59 | 29 |  0x70d574164a2b529 |  29 |  0x556e8bb632ad2bb |  31 | 0.000160398104 |
|  60 | 30 |  0x69be7a1f9ce54d1 |  25 |  0x2c8c0981b395af9 |  31 | 0.000164712860 |
|  61 | 30 |  0x7432c5dc5bc8aa3 |  24 | 0x24f249b1436558cb |  32 | 0.000178399347 |
|  62 | 30 |  0x6e273039b5cf68d |  29 | 0x15ee11aa7b14d9f1 |  30 | 0.000169383881 |
|  63 | 31 | 0x465657af6d5667ad |  27 | 0x5dc7433ce2b2ba4d |  34 | 0.000170940000 |
|  64 | 30 | 0xbf58476d1ce4e5b9 |  27 | 0x94d049bb133111eb |  31 | 0.000177390000 |
| murmur3 mix64 | 33 | 0xff51afd7ed558ccd | 33 | 0xc4ceb9fe1a85ec53 | 33 | 0.000209670000 |
{: style="text-align: right;" }

These aren't the best coefficients, just the most thoroughly tested.  I'm in
the middle of refining the training and will likely replace these with much
better data (unless I don't get around to it, which is why I'm posting this
now).

It's pretty clear that suitably structured test patterns give better results
than random data.  The training works well enough to specialise to the specific
random values given very quickly -- the increase in error from changing to a
new random test pattern is much larger than the refinements made during most of
the tuning on the initial set.  This effect is much smaller when coming from
structured test patterns.

So what does one do with those results?  Well, if you want to enumerate all of
the elements in some list and you don't want to do it in a predictable order
(ie., you want to shuffle but you don't want to produce an array of shuffled
indices), then you could do something like pick a Weyl sequence and visit
elements in that order.  But that's not very "random" at all, so you can mash
it up with (picking from the last row of the table):
```c++
uint64_t mix(uint64_t x) {
    x ^= x >> 30;
    x *= 0xbf58476d1ce4e5b9;
    x ^= x >> 27;
    x *= 0x94d049bb133111eb;
    x ^= x >> 31;
    return x;
}
```

Now if you're working with a range less than 2<sup>64</sup> then this could
give a lot of values well outside of the useful range when applied to values
within that range; so this table gives you the choice of coefficients that
operate in fewer bits (though you need to add bit masks to the code).  If
your range is not a power of two, then pick the next power of two and for
anything that still falls down the gaps repeat the mix() until it gets back in
range.

I intend to define something more comprehensive, and more parameterisable than
a Weyl sequence... but I have to think harder about that.

If for any reason you need to go back the other way:
```c++
static inline uint64_t inv(uint64_t x) {
    uint64_t ix = x;
    while (ix * x != 1) {
        ix *= 2 - ix * x;
    }
    return ix;
}

uint64_t unmix(uint64_t x) {
    x ^= x >> 30 ^ x >> 60;
    x *= inv(0xbf58476d1ce4e5b9);
    x ^= x >> 27 ^ x >> 54;
    x *= inv(0x94d049bb133111eb);
    x ^= x >> 31 ^ x >> 62;
    return x;
}
```

And I did a quick scan up to 128-bits to find something [probably] adequate in
that range too..

| Bit width | `>>` | `*`                     | `>>` | `*`                               | `>>` | Maximum error |
|-----|----|----------------------------------|-----|--------------------------------------|-----|:------------|
|  65 | 37 |        0xc1ae<wbr />e1a724694555 |  33 |             0x7ab<wbr />fb7c6bf23d27 |  34 | 0.000175090 |
|  66 | 39 |        0xfc63<wbr />bae7675b3455 |  32 |            0xd86e<wbr />d3dcbd2f3e5d |  34 | 0.000172410 |
|  67 | 39 |       0x6c24c<wbr />6bc44278b29b |  33 |           0x6e9fe<wbr />d344898e0c87 |  36 | 0.000163490 |
|  68 | 34 |       0xdf391<wbr />87ac92331377 |  36 |           0xc91e9<wbr />5946c1a3675d |  35 | 0.000178370 |
|  69 | 39 |       0xd4281<wbr />b76e33c2bab3 |  38 |           0x47583<wbr />c3c6a2d36ff9 |  37 | 0.000173690 |
|  70 | 40 |      0x3c3c52<wbr />022eb5438e9d |  36 |           0x2f34f<wbr />e60b75b31645 |  38 | 0.000173970 |
|  71 | 40 |      0x7c3c52<wbr />022eb5438e9d |  36 |           0x2f34f<wbr />e60b75b31645 |  38 | 0.000181870 |
|  72 | 35 |      0xaef9c1<wbr />f7e6b5d25591 |  41 |          0x84104c<wbr />8dc5da669f45 |  36 | 0.000172330 |
|  73 | 35 |     0x1aef9c1<wbr />f7e6b5d25591 |  41 |          0x84104c<wbr />8dc5da669f45 |  36 | 0.000178640 |
|  74 | 39 |     0x1d83e40<wbr />7ab6899d7bb9 |  36 |          0xb01545<wbr />a8f5e8593e65 |  32 | 0.000180580 |
|  75 | 42 |     0x538a38f<wbr />3ee4d9accebb |  41 |         0x536318c<wbr />e6a46cfab793 |  41 | 0.000166840 |
|  76 | 40 |     0xf182a7f<wbr />0ee8e296e49b |  33 |         0x68052ff<wbr />f8fce35a54b5 |  39 | 0.000174210 |
|  77 | 41 |     0x32c08af<wbr />1628a7f1f691 |  38 |        0x10b193ca<wbr />9d37f4582da5 |  36 | 0.000182390 |
|  78 | 34 |    0x253490bf<wbr />a022798552bb |  34 |        0x3720deee<wbr />842dff19b9e9 |  39 | 0.000182510 |
|  79 | 35 |    0x50210b85<wbr />2f76ab286715 |  36 |        0x49c3f319<wbr />29ab460f12c5 |  41 | 0.000182770 |
|  80 | 53 |    0x66929b82<wbr />016ef349661b |  43 |        0xbc460978<wbr />539a0680f6d3 |  45 | 0.000179740 |
|  81 | 40 |    0x25634f00<wbr />a9b36c61267f |  42 |        0x9ee3c49b<wbr />f65322a759a9 |  31 | 0.000178600 |
|  82 | 41 |   0x13d3f9926<wbr />b52b492364bb |  35 |       0x24847a8b2<wbr />0406152986c3 |  46 | 0.000171770 |
|  83 | 48 |   0x13eb61874<wbr />c94507116419 |  42 |       0x6d6ab1b5b<wbr />bad693f976e5 |  36 | 0.000193240 |
|  84 | 42 |   0x91592247e<wbr />c8d51011697b |  42 |       0x3e9b9675a<wbr />c85290355681 |  37 | 0.000178630 |
|  85 | 45 |   0xf0e79c3fa<wbr />954adbaef427 |  48 |       0xd1af528e8<wbr />e5cb3fe1e6a5 |  41 | 0.000180690 |
|  86 | 42 |   0xcbd821d6d<wbr />1c9f5daa8ba9 |  49 |      0x217a4544a2<wbr />ea5974e934f7 |  35 | 0.000178750 |
|  87 | 44 |   0x7964b9a9c<wbr />1ac665f4cb6b |  42 |      0x3b20fbe810<wbr />a8cc0866dbab |  40 | 0.000186350 |
|  88 | 51 |  0xcbaf12db5a<wbr />4aeda8c25cbf |  44 |      0x237272f038<wbr />8c2c45e9eaf7 |  44 | 0.000179630 |
|  89 | 50 | 0x1a9874c6948<wbr />1ced67649e29 |  43 |      0x6fa7103538<wbr />f9c5850be999 |  46 | 0.000180860 |
|  90 | 51 | 0x270b71aeafa<wbr />42e62264aafb |  44 |      0x698694b972<wbr />cc4887abe3e9 |  44 | 0.000184290 |
|  91 | 43 | 0x3c0a231da7f<wbr />b9b366a7cb8f |  46 |     0x359aafd28c5<wbr />6cc02126a563 |  61 | 0.000177960 |
|  92 | 53 | 0x9fd8c0e1c0c<wbr />1a4d65546c25 |  44 |     0x60a237594f2<wbr />302c81315a85 |  43 | 0.000194610 |
|  93 | 43 | 0x<wbr />13c1b404886f<wbr />397b22538f4f |  46 | 0x<wbr />154ba99e215b<wbr />8868a328d443 |  62 | 0.000181450 |
|  94 | 49 | 0x<wbr />3d8b8cedfcb3<wbr />76f515c8d5d7 |  54 | 0x<wbr />1e96b89aa3ab<wbr />6a690419d1d5 |  46 | 0.000176110 |
|  95 | 45 | 0x<wbr />5fc70c5c34f4<wbr />cceac26efc6f |  51 | 0x<wbr />2d9711fcc67b<wbr />e973eaedfa85 |  42 | 0.000183390 |
|  96 | 41 | 0x<wbr />5f9a077b0e30<wbr />784b6f5585a9 |  50 | 0x70a841004bb<wbr />30fc18d90dcd |  56 | 0.000185290 |
|  97 | 51 | 0x<wbr />b3ab046ea036<wbr />2e6647e16e57 |  52 | 0x1<wbr />5eb44a5fcaa0<wbr />58fee709c657 |  46 | 0.000189470 |
|  98 | 58 | 0x3<wbr />ebab06243ba8<wbr />397f9ded8cc3 |  55 | 0x2<wbr />1b85517f0d27<wbr />7fcf595e4b25 |  36 | 0.000187520 |
|  99 | 52 | 0x1<wbr />ece3976ae933<wbr />3e3dcba1094f |  59 | 0x2<wbr />75ad977787a5<wbr />76fc4d7b688b |  54 | 0.000177850 |
| 100 | 64 | 0x5<wbr />0b482142aa60<wbr />920ed1729371 |  59 | 0x2<wbr />a3d491e0a48e<wbr />e1f46bfcd12f |  45 | 0.000181520 |
| 101 | 41 | 0xa<wbr />a9ee406c4c80<wbr />736dd6917c91 |  59 | 0xd<wbr />10ae3c90dea6<wbr />4633b73aa52f |  34 | 0.000176200 |
| 102 | 55 | 0x3<wbr />b94fa386fc14<wbr />cb2bcea9d111 |  60 | 0x7<wbr />03c5fc63f96d<wbr />ca3ed629360d |  63 | 0.000184460 |
| 103 | 57 | 0x26<wbr />5de894e5396f<wbr />75eec35597b9 |  61 | 0x5e<wbr />efc16a24b91e<wbr />1a5fdfa64dad |  33 | 0.000183870 |
| 104 | 48 | 0x9e<wbr />22783b078518<wbr />78fac33dd281 |  62 | 0x4e<wbr />92a86b98b352<wbr />de06a6594099 |  51 | 0.000182960 |
| 105 | 56 | 0x190<wbr />73e5fc45bf5e<wbr />e53ae5cf9217 |  45 | 0x2d<wbr />77d0ba7cfb2b<wbr />994b8675252f |  64 | 0.000180000 |
| 106 | 57 | 0x29e<wbr />318585576aac<wbr />4eaa3ab63911 |  70 | 0x37<wbr />7bac3250144c<wbr />2b72d2ef3b9b |  29 | 0.000180830 |
| 107 | 58 | 0x90<wbr />dc65314a8f10<wbr />7d584cfbb0d1 |  63 | 0x5e2<wbr />d47a86a57132<wbr />d2b0a5a0fdf3 |  47 | 0.000183000 |
| 108 | 46 | 0x992<wbr />96e66b9c45e0<wbr />a05b6d16b18f |  68 | 0x9f0<wbr />d9d0e11e0d48<wbr />708d5f58f28f |  45 | 0.000177790 |
| 109 | 47 | 0x1992<wbr />d4e66f8c4de0<wbr />8a5b7d33b18f |  68 | 0x19f0<wbr />d9d0e15c0d69<wbr />78985d58f28f |  46 | 0.000192400 |
| 110 | 41 | 0x8c7<wbr />3e6449674e58<wbr />9d9045c96d15 |  69 | 0x191c<wbr />d47486b4e9d7<wbr />7d33ec50dfe7 |  46 | 0.000186550 |
| 111 | 58 | 0x2102<wbr />d49d19626d04<wbr />4d5c1d9ae103 |  71 | 0x2938<wbr />f920e6944efa<wbr />5caef7878e63 |  44 | 0.000182770 |
| 112 | 69 | 0xd071<wbr />ea7d70b92265<wbr />2c9f4efda8cb |  69 | 0xe525<wbr />04c30c4096fe<wbr />91d069e46121 |  66 | 0.000185590 |
| 113 | 51 | 0x19399<wbr />0ced7b35ba73<wbr />3f67199e35bd |  72 | 0xb5d1<wbr />9749518fb15c<wbr />bdafd9a7d465 |  54 | 0.000195470 |
| 114 | 41 | 0x1dfa9<wbr />5a9c990692a3<wbr />92fe97a4f315 |  64 | 0x1d560<wbr />652911c55858<wbr />6eed3231d675 |  56 | 0.000186320 |
| 115 | 59 | 0x5daeb<wbr />94781e99eaea<wbr />d2570c08bd71 |  61 | 0x76530<wbr />7428ff9d1328<wbr />5a852adad497 |  51 | 0.000181680 |
| 116 | 67 | 0x81e9e<wbr />8474ae769818<wbr />815f2bcd98c7 |  63 | 0xb0166<wbr />1ba448ef05e6<wbr />6cbbc9207431 |  52 | 0.000185950 |
| 117 | 53 | 0x1389e3<wbr />0cd07e0cd3c9<wbr />9dec23f7b341 |  61 | 0x1518d7<wbr />998220366764<wbr />94a13b405a63 |  59 | 0.000194620 |
| 118 | 63 | 0x138e78<wbr />1c31e618cf8d<wbr />5a8689e93e3d |  46 | 0x3da8a1<wbr />0e2da973b6de<wbr />54b9e569f85b |  55 | 0.000188140 |
| 119 | 55 | 0x5060d6<wbr />3017eff64942<wbr />abeecad0faef |  58 | 0x59de71<wbr />10354cb25de9<wbr />e440aae1b7bd |  46 | 0.000181700 |
| 120 | 45 | 0xd18e88<wbr />d849b5d62bc5<wbr />7a82c0c5ad37 |  44 | 0xadb098<wbr />9a25e823b306<wbr />d0eb61661977 |  55 | 0.000174770 |
| 121 | 64 | 0xc5c346<wbr />2bdc06418fc6<wbr />61c45b6abe1b |  70 | 0x2878d6<wbr />a58fa193fa98<wbr />242623f1537d |  85 | 0.000186410 |
| 122 | 55 | 0x3f58fd2<wbr />254a5c438ba0<wbr />324e7372ba31 |  70 | 0xf315e<wbr />e584e91379fa<wbr />e40e2938472d |  85 | 0.000185920 |
| 123 | 54 | 0x43054cb<wbr />bcf482ffc6a2<wbr />0ccf3a430715 |  56 | 0xdcacdf<wbr />a4fd86e90bde<wbr />f329c674a3d5 |  85 | 0.000181430 |
| 124 | 61 | 0xd0139ac<wbr />ecf086eaa234<wbr />5a21d0d20b87 |  67 | 0xd698c38<wbr />02ed56e01774<wbr />322836b610b5 |  82 | 0.000174460 |
| 125 | 63 | 0xe20947e<wbr />484fe27ec73b<wbr />bfb2ff2229d1 |  68 | 0x104e5b22<wbr />226f7df8250d<wbr />e82e703004dd |  52 | 0.000180850 |
| 126 | 62 | 0x2402f676<wbr />b82cd3d745a3<wbr />6180dac22a5b |  67 | 0x1f7d6648<wbr />0e35477c37e8<wbr />a5c215e073ef |  54 | 0.000186570 |
| 127 | 62 | 0x6909aa5a<wbr />669e5ab52528<wbr />9c15a2942f97 |  68 | 0x6e40aacb<wbr />80adb3c037e0<wbr />a73531f2d0c3 |  55 | 0.000183550 |
| 128 | 59 | 0xecfb1b9b<wbr />c1f0564fc68d<wbr />d22b9302d18d |  60 | 0x4a4cf034<wbr />8b717188e2ae<wbr />ad7d60f8a0df |  84 | 0.000187520 |
{: style="text-align: right;" }


[splitmix64]: https://xorshift.di.unimi.it/splitmix64.c
[Fast splittable pseudorandom number generators]: https://dx.doi.org/10.1145/2714064.2660195
[Improving on MurmurHash3's 64-bit Finalizer]: https://zimbry.blogspot.com/2011/09/better-bit-mixing-improving-on.html
[MurmurHash3]: https://github.com/aappleby/smhasher/wiki/MurmurHash3
