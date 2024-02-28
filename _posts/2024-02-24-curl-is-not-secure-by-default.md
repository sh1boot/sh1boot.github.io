---
layout: post
title:  "Curl is not secure by default"
categories: curl, tls, security
---

I often find that when there's been some debate about a topic, the conclusion
is the thorough debunking of a bad idea but a failure to address a more nuanced
one -- or even a more fundamental one.

In the question of using curl to download a script from a site and piping it
directly to bash, a lot of objections can be dismissed as the user already
having made implicit trust decisions.  Trust both in the source's integrity,
and also in their competence.

And somewhere in that debate man-in-the-middle attacks come up and those are
dismissed on the basis that all modern sites use TLS.

But that's not entirely accurate.

Modern sites _offer_ TLS.  You only get it if you ask for it.  If you don't
then you'll normally receive a redirection from the insecure site to the secure
one, _telling_ you to ask for it.  But by then it's **too late**.  That initial
connection was vulnerable to hijacking, and if a hijack did happen then the
unencrypted reply probably won't contain the proper redirect.  It could contain
anything.

So really, if you start with http:// or no URI scheme then you fail to secure
the set-up of the connection; and if you don't secure the set-up then nothing
beyond that can be trusted either.

[HSTS][] provides a mitigation for this in web browsers, but it only works well
for sites that are [preloaded][HSTS preload site].  For any other site the
browser will first visit the HTTP site, and if that isn't intercepted it'll
follow that to the HTTPS site, which will advertise that the HTTP site is not
to be used any longer.  The browser makes a note and then future connections to
that site are safe for a while because your HTTP connections will be
automatically rewritten before being attempted.

Second, on web browsers, you can use [HTTPS Everywhere][], or follow their
instructions to enable the setting in your browser.

Curl supports settings to pick a default protocol instead of guessing, and
it suports settings to enable HSTS.  But neither of these are on by default.

Further, even after enabling HSTS, you still have to go find a preload file in
a format supported by curl.  I don't know where that is.

So anyway... what I noticed the other day was a site using curl-to-bash with a
domain and a path, but without specifying a scheme for the transfer.  And they
used the `-L` command-line switch, which turns out to be for following
redirections as would be expected according to my description above.

I did a bit more research and eventually found [eleven thousand][oh my] more
occurrences on GitHub (give or take the quality of my filtering of false
positives).  Almost one thousand of those were piped into sudo.

It's not ideal.

Some actions you might consider:
* configuring `~/.curlrc` to enable HTTPS by default (does not override explicit http:// links)
* configuring `~/.curlrc` to choose HSTS by default (might override _some_ explicit http:// links)
* configuring `~/.curlrc` to disable all unencrypted protocols (this might cause problems)
* configuring your browser to use HTTPS by default
* never copy-pasting irresponsible command lines into your terminal
* never posting irresponsible command lines on the internet for others to paste into their terminal

[HSTS]: <https://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security>
[HTTPS Everywhere]: <https://www.eff.org/https-everywhere>
[HSTS preload site]: <https://hstspreload.org/>
[HSTS preload list]: <https://chromium.googlesource.com/chromium/src/+/main/net/http/transport_security_state_static.json>
[oh my]: <https://github.com/search?q=%2F%5Cbcurl+-%5B%5E+%5D*L%5B%5E%3A%24%7B%25%5D*%5C%7C%5B+a-z%5D*sh%5Cb%2F&type=code>
