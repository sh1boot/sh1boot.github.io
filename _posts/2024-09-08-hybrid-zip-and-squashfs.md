---
last_modified_at: Tue, 10 Sep 2024 12:01:53 -0700  # f78e9ef publish-a-few-old-things
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

What I didn't realise until recently is that the links back to
the compressed data chunks are relative, so you can just
concatenate a zip onto another file without needing to update the
zip directory for the new file offsets, and the result is still a
legal zip file.

That is to say, a couple of simple commands like this produce a
dual-use binary:
```sh
mksquashfs squashfiles squashfs.img
zip zipfiles zipfile.zip
cat squashfs.img zipfile.zip > hybrid.zip
```

There are some things you can do with that.  One of those things
is to replace zip with something more powerful but retain a
backwards-compatibility zip segment with the essential metadata
to keep support with the relevant tools.

I'm currently wondering if [squashfs][] (or maybe [EROFS][]) is a
suitable replacement for zip.  Squashfs provides on-disk
compression in a random-access way by breaking every file up into
blocks, where each block is compressed independently of the
others, so that you can seek without decoding the entire file.
The benefit is that you can mount it and keep the internal files
compressed on disk but at the same time you can mmap those files
and use them in a demand-paged setting without the need to
create decompressed temporary files.

For example, shared libraries are loaded by mapping them; and in historical
Android they had to be decompressed to temporary files on disk to support
this.  More recently it's become possible to store them within the zip file if
they were aligned and kept uncompressed.

I'm not sure about the quality of Linux's handling of this
arrangement, though.  squashfs can be configured with large block
sizes to improve compression, but a page is typically only 4kB.
Does Linux just round the mapping out to the squashfs block size
and hope that the extra data before it after will also get used
imminently, or what?

If I were going to design my own filesystem for this I would probably try to
keep the block size small and mitigate the loss of compression by giving every
disk block its choice of compression window to start with (store those
dictionaries uncompressed at 4kB alignment within the filesystem for easy and
efficient paging).  And, I guess, index all the inodes by hash of the full
path within the system, because when you do it offline you can permute the
hash parameters until you minimise the collision rate for better packing.  And
merge tails of files of similar types, which, I guess, is the one use case for
EROFS's fitblk storage method where I actually understand the benefit (squeeze
together as many file tails as you can get within a 4kB compressed-but-aligned
filesystem block so you don't read more than one disk block and that whole
block is more likely to be re-used to finish other files later on).  And store
my superblock at the top of the first 4kB of the image with the front left
free for bootstrap code of various sorts.  And probably not bother with
esoterica like file permissions and just hard-code them all as root:root
755/644.  And no device nodes or any of that silliness!  &lt;/rant&gt;

I wish I had time to dig into these things, but I really don't.
I have a day job, now, and I need to get on with those things.

[squashfs]: <https://docs.kernel.org/filesystems/squashfs.html>
[EROFS]: <https://docs.kernel.org/filesystems/erofs.html>
