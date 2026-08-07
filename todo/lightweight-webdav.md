---
layout: post
title: lightweight WebDAV server
---
I want a trivial, read-only WebDAV server to host files for [Music
Player Daemon][].  That should be really simple to write, but I haven't
got around to it.

Maybe there's an off-the-shelf one, but in my casual searching I've been
anxious that they support read/write and authentication and complexity
which just makes it all that much harder to trust.

And AIUI there are established tools to wrap such a server in SSL with
key-based authentication; so I don't have to write that.

Update: successfully vibe-coded: [Tiny WebDAV][]

[Music Player Daemon]: <https://www.musicpd.org/>
[Tiny WebDAV]: <https://github.com/sh1bot/webdav>
