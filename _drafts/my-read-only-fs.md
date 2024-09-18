---
layout: post
title: My half-baked thoughts on a compressed read-only filesystem
---
If I were going to try to replace zip files, I would want to do it with
a read-only filesystem so that it supported random access data and
demand paging of its content.  That way you don't have to decompress
things like shared libraries to temporary space in order to load them
(and unload them again without write-back).

[Squashfs][] is the obvious choice and [EROFS][] is the modern choice,
but I feel like they're both solving a lot of problems I don't care
about.

I would probably try to keep the block size small but mitigate the loss
of compression by giving every disk block its choice of compression
window to start with (and I would store those dictionaries uncompressed
at 4kB alignment within the filesystem for easy and efficient paging).

And merge tails and compress them together until they maximally fill a
4kB block, like [fitblk][] would, I guess.

I think I would probably also hash all the filenames down to 64-bit ints
and totally ignore the risk of collisions.  Except at creation time.
Stick them in a hash table, permute the hash table until it minimises
walk distance for collisions, and then just _never_ do the implied
string comparison to validate that a hash match was actually a correct
string.  Just check all 64 bits of the hash (no, not just the relatively
few bits of the hash table index -- that would be insane!).

The implication there is that collisions could be deliberate, but I
don't care because that's only going to matter if there are permissions
to bypass, and permissions (other than +x) aren't interesting enough to
store.  Also chuck out things like device nodes and all that.

So the implication there is that given the full path to a file you have
one hash table lookup and maybe a brief walk to decide if it's present,
and off you go.  To satisfy directory scanning operations (which seem
comparatively low-priority to me) make each directory a stream beginning
with the hash of the directory's own path, and its parent, followed by
all the filenames in the directory concatenated in DGAF[^1] order.
Might as well compress that, too.  The global hash table index (call
that the inode number) for each file can be reconstructed by appending
the directory hash with the filename hash.  Interleave the names with
_essential_ metadata as needed.

Small caveat that if you want to call the hash table index the inode
(being that it's 32-bits) then after computing the hash you also have to
do the walk to find the right table entry when there's a collision.  So
either ensure that all 32-bit hashes are unique (which is starting to
get a bit birthday-paradoxy by this stage) so that lookup by inode
eventually resolves unambiguously, or encode the number of steps of the
walk in the directory as well (the small delta from truncated hash to
actual table index), or encode the table index directly, I guess.

I honestly thought that this was how directories already worked these
days, given hash tables were a thing talked about so much in the 90s, so
I was a little surprised that EROFS mandates an ordered listing to
enable faster lookups.  But I guess if you don't intend to cowboy your
way through the hash collisions then there's the implementation of that
filename confirmation to worry about.  Maybe.

[^1]: Actually it might be prudent to sort them into the same order as
they appear on disk, so as to promote mostly-sequential directory
traversal, but I can't think of an encoding that makes that inevitable,
and if it's not inevitable then it's not enforceable, so just do
whatever you like because I know that's what's going to happen
eventually anyway.


[squashfs]: <https://docs.kernel.org/filesystems/squashfs.html>
[EROFS]: <https://docs.kernel.org/filesystems/erofs.html>
[fitblk]: <https://erofs.docs.kernel.org/en/latest/design.html#block-aligned-fitblk-compression>
