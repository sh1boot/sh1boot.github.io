---
last_modified_at: Wed, 11 Sep 2024 21:48:39 -0700  # 0f8b31a clarity
layout: post
title: Hybridising zip files with an alternate compression scheme
---
An interesting feature of zip files (and consequently many
formats which are just zip files renamed) is that all the
identifying data appears at the end of the file with links back
to content earlier in the file.  This makes it possible to leave
gaps in the middle or even at the beginning of the archive, which
is why a self-extracting zip file can be decompressed on any
architecture by using a native zip extractor.

What I didn't realise until recently is that the links back to the
compressed data chunks are relative, so you can just concatenate an
existing zip file onto another file without needing to update the zip
directory for the new file offsets, and the result is still a legal zip
file with extra hidden data in front.

That is to say, a couple of simple commands like this produce a dual-use
file:
```sh
mksquashfs squashfiles/ squashfs.img
zip zipfiles/ zipfile.zip
cat squashfs.img zipfile.zip > hybrid.zip
```

There are some things you can do with that.  One of those things
is to replace zip with something more powerful but retain a
backwards-compatibility zip segment with the essential metadata
to keep support with the relevant tools.

So I'm currently wondering if [squashfs][] (or maybe [EROFS][]) is a
suitable replacement for zip.  Squashfs provides on-disk compression in
a random-access way by breaking every file up into blocks, where each
block is compressed independently of the others, so that you can seek
without decoding the entire file.  The benefit is that you can mount it
and keep the internal files compressed on disk but at the same time you
can `mmap()` those files and use them in a demand-paged setting without
the need to create decompressed temporary files.

Shared libraries, for example, are loaded by mapping them; and
historically Android had to decompress them to temporary files on disk
to support this, using up more storage.  More recently it's become
possible to store shared libraries within the zip file uncompressed and
aligned, and to map them directly from there.  But then the package is
bigger.

I'm not sure about the quality of Linux's handling of this arrangement,
though.  squashfs normally uses a large block size (128kB) to improve
compression, but a memory page is typically only 4kB.  Does Linux just
round the mapping out to the squashfs block size and hope that the extra
data before it after will also get used imminently, or what?

If I were going to design my own filesystem for this I would probably
try to keep the block size small but mitigate the loss of compression by
giving every disk block its choice of compression window to start with
(and I would store those dictionaries uncompressed at 4kB alignment
within the filesystem for easy and efficient paging).  And, I guess,
index all the inodes by hash of the full path within the system, because
when you do it offline you can permute the hash parameters until you
minimise the collision rate for better packing.  And merge tails of
files of similar types, which, I guess, is the one use case for EROFS's
[fitblk][] storage method where I actually understand the benefit.  And
put my superblock at the top of the first 4kB of the image with the
front left free for bootstrap code of various sorts.  And probably not
bother with esoterica like file permissions or timestamps and just
hard-code them all as root:root 755 or 644.  And no device nodes or any
of that silliness!  &lt;/rant&gt;

I wish I had time to dig into these things, but I really don't.  I have
a day job, now, and I need to get on with that.

[squashfs]: <https://docs.kernel.org/filesystems/squashfs.html>
[EROFS]: <https://docs.kernel.org/filesystems/erofs.html>
[fitblk]: <https://erofs.docs.kernel.org/en/latest/design.html#block-aligned-fitblk-compression>
