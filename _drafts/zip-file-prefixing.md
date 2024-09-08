---
layout: post
title: Prefixing zip with other blobs
---
An interesting feature of zip files (and consequently many formats which are just zip files renamed) is that all the identifying data appears at the end of the file with links back to data earlier in the file.  This makes it possible to leave gaps in the middle or even at the beginning, which if why a self-extracting zip file can be decompressed on any architecture by using a native zip extractor. 

What I didn't know until recently is that the links back to the main data chunks are relative, so your can just concatenate a zip onto another file without needing to update the zip directory for the new file offsets.

So there are some things you can do with that.  One of those things is to replace zip with something more powerful but retain a backwards-compatibility zip tail with some of the basic metadata.

I'm currently wondering if [squashfs][] is a suitable replacement for zip.  The benefit of squashfs is that you can mount it and keep your data compressed on disk but still mmap it and use it in a demand-paged setting without having to cache a decompressed copy anywhere (except for the one in memory when it's demanded, but that is the same copy as you would have even with an uncompressed file mapping).

I'm not sure about the quality of Linux's handling of this arrangement, though.  squashfs can be configured with large block sizes to improve compression, but a page is typically only 4kB. Does Linux just round the mapping out to the squashfs block size and hope that the extra data before it after will also get used imminently, or what?

I wish I had time to dig into these things, but I really don't.  I have a day job, now, and I need to get on with those things.