---
layout: post
title: Prefixing zip with other blobs
---
An interesting feature of zip files (and consequentlymany formats which are just zip files renamed) is that all the identifying data appears at the end of the file with links back to data earlier in the file.  This makes it possible to leave gaps in the middle or even at the beginning, which if why a self-extracting zip file can be decompressed on any architecture by using a native zip extractor. 

What I didn't know until recently is that the links back to the main data chunks are relative, so your can just concatenate a zip onto another file without needing to update the zip directory for the new file offsets.

So there are some things you can do with that...