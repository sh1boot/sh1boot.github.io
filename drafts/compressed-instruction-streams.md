---
layout: post
title: Compressed instruction streams as the native encoding
---
Spend any amount of time trying to optimise the storage efficiency of CPU instructions and ideas like Huffman coding will eventually come up. 

One objection is that instruction streams are random-access.

But that's a _bad thing_.  Now we need landing pads for control-flow integrity.  Meanwhile compilers and binary translation work in chunks broken mostly at bench boundaries. 

So maybe the time has come to revisit this.  opening up questions about OOE implementations which would surely have to cache decompressed streams; possibly suggesting low-level DBT like Transmeta or Project Denver.