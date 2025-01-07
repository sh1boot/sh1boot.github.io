---
last_modified_at: Wed, 12 Jun 2024 16:05:16 -0700  # e8b02b5 pingback-and-webmention
layout: post
title:  Digging in to Pingback and Webmention
tags: blogging social-media wtf-am-i-doing
---
The other day I found out what a "[Pingback][]" was, after I saw a bunch of
them at the bottom of a widely-cited blog post.  So I set about digging in to
all that.

The first thing I learned is that many people who receive Pingbacks are annoyed
by them because it's just another source of spam.  Apparently [Webmention][] is
the new way forward, but I really can't tell what makes it any less vulnerable
to spamming than [any other](https://en.wikipedia.org/wiki/Linkback) system.

Essentially they're a way for a site which has an outgoing link to tell the
target site that that is the case.  In case they wanted to know (maybe they
want to point back to the ensuing discussion on [Hacker News][] for more
information, or whatever).  This has a privacy advantage over the old
[referer][] (sic) system where the web browser would tell the target site that
a specific _user_ had followed a link from the linking site.

It's a voluntary thing, and participating doesn't make you a spammer even
though the system has been overrun by spam.  Those who don't want them can
simply [turn them off](https://wordpress.com/support/comments/pingbacks/).
If there's an endpoint then you may as well inform it and let them do with that
what they may.  And if you're curious then you may as well advertise an
endpoint of your own.

So how do you do that?

If you want to advertise an endpoint for listening for Webmentions (and
theoretically Pingbacks) then you can use [webmention.io][] to handle that for
you.  Just sign in and get some links which you put in your HTML boilerplate.
Like so:
```html
<link rel="webmention" href="https://webmention.io/www.xn--tkuka-m3a3v.dev/webmention" />
<link rel="pingback" href="https://webmention.io/www.xn--tkuka-m3a3v.dev/xmlrpc" />
```
And then go test that with [webmention.rocks][].

But I could not successfully get a Pingback delivered to webmention.io.

The first hurdle turns out to be that [WordPress][] doesn't, as far as I can
tell, respect the endpoint advertisement in the HTML.  It has to be advertised
in the HTTP header instead.

[GitHub Pages][] (which I use here) [doesn't support custom
headers](https://github.com/orgs/community/discussions/54257), but luckily for
me I proxy through [Cloudflare][], [who do][cf-custom-headers].  In actual fact
I didn't proxy through Cloudflare; I just _thought_ I did.  After much
frustration I eventually realised my mistake and switched it back on.  Once I
had that figured out I could add HTTP headers like these:
```
x-pingback: https://webmention.io/www.xn--tkuka-m3a3v.dev/xmlrpc
link: <https://webmention.io/www.xn--tkuka-m3a3v.dev/webmention>; rel="webmention"
```

Unfortunately this _still_ didn't induce webmention.io to register Pingbacks
from WordPress, and I still don't know why.  But I did confirm that WordPress
was _attempting_ to send Pingbacks by setting the header to a place where I
could log the traffic.  I guess the next thing would be to write my own
endpoint, but I'm not sure I'm _that_ interested.  As I keep saying; I'm not a
web guy.

As for sending Webmentions and Pingbacks... well there are a few resources out
there on how to do that.  It's less complicated and you don't have to deal
with spam or denial-of-service attacks; you just have to not be evil.

But nothing that I found really sat well with me.  Mostly because they seemed
to have too many dependencies.  So I just threw together a [Python
script][notify.py] with regular expressions rather than proper HTML parsing.

If I ever get around to it, and if I ever find myself posting a link something
which supports it, then I might look at automating the use of that script.  But
there's really not much point at this stage.

If one does write one's own endpoint for either of these systems then they must
be mindful about the risk of contributing to a [DDoS attack][] while trying to
validate incoming links if not handled carefully.

[Webmention]: <https://en.wikipedia.org/wiki/Webmention>
[Pingback]: <https://en.wikipedia.org/wiki/Pingback>
[referer]: <https://en.wikipedia.org/wiki/HTTP_referer>
[Hacker News]: <https://news.ycombinator.com/>
[webmention.io]: <https://webmention.io>
[webmention.rocks]: <https://webmention.rocks/receive/1>
[WordPress]: <https://wordpress.com/>
[Github Pages]: <https://pages.github.com/>
[Cloudflare]: <https://www.cloudflare.com/>
[cf-custom-headers]: <https://developers.cloudflare.com/pages/how-to/add-custom-http-headers/>
[notify.py]: <https://github.com/sh1boot/sh1boot.github.io/blob/master/_tools/notify.py>
[DDoS attack]: <https://en.wikipedia.org/wiki/Denial-of-service_attack#Distributed_DoS>
