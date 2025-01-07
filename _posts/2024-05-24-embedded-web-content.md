---
last_modified_at: Sat, 3 Aug 2024 12:36:41 -0700  # 043a0b6 Take-a-swipe-at-recent-supply-chain-vulnerabilities
layout: post
title:  Embedded web content without all that JavaScript cruft
description: A bit of Jekyll hacking to stop other sites' JavaScript running rampant on my blog without the user being forewarned.
tags: privacy web liquid jekyll wtf-am-i-doing
---
In an earlier blog post I wanted to embed some diagrams.  Really I wanted SVG
for clean scaling between devices, but I don't have that format as an output
option.

What I did have, it turned out, was an option to embed an interactive 3D model.

Trouble is, I'm not a great fan of JavaScript where it's not essential.  I
would prefer that everything works as well as is feasible with JavaScript
turned off, rather than expecting people to enable it just so a page makes
sense.  And I dislike how JavaScript has the effect of making page load times
longer and more jittery as things change their mind about where on the screen
they want to be.

I also don't think it's good form to invite a bunch of different domains to
come and run code on other people's computers when they're just trying to read
something which is notionally just static text.  That may be how the internet
is, but I still don't like it!

Plus it's another unnecessary entypoint for supply-chain vulnerabilities.

I do use [utteranc.es][] and [MathJax][], but this site should still make sense
to anyone who chooses to block those, or neglects to enable them.  I should try
harder to not enable them by default, I guess, but whatever...  I also use
GitHub and Cloudflare.

So anyway.  Without resorting to JavaScript, what I've done is to create an
iframe and embed a bit of inline HTML in it, and that inline HTML is just an
image and a link dressed up like a button which you can click to activate the
control.  The link loads the actual embed in the iframe, but only when you
click on it.

The user _could_ do these things with their own browser extensions, taking
responsibility for their own privacy, making their own choices, etc., but I
just don't want to be too deeply implicated in the horrors of the modern web in
that way.

Now, I don't presume to have any clue how to do these things correctly.  It's
web stuff.  It's not my space.  But I have, as is the Gold Standard&trade; in
modern software development, cobbled together enough fragments from Stack
Overflow to get something that "seems to work".  At least for me.  Mostly.

{%raw%}
I had trouble with using `{% render %}` where I thought I should have been able
to, so I reverted to `{% include %}` which causes its own problems.  And there
were other problems, too.  So many "why can't I just do this the easy way like
in the documentation?" moments.
{%endraw%}

But anyway, here's the template in all its bumbling glory:

<https://github.com/sh1boot/sh1boot.github.io/blob/master/_includes/clickable-embed.liquid>

There's plenty I haven't bothered to fix.  Like where to get the preview
images.  Mostly I still use the target site to deliver static thumbnails.  That
allows some measure of nefarious activity, I'm sure, but at least it doesn't
slow everything down with more JavaScript and a heap of noisy back-and-forth.

Also, since the user has already clicked the go button in order to load the
embedded content, it's better to use embed links which auto-start that content.
This seems to work for YouTube, but no such luck with [Scratch][] so far.

Here's what's then needed to embed a [Shadertoy][] shader:
{%- raw %}
```liquid
{% include shadertoy.liquid id='clB3RK' %}
```
{% endraw %}
(using: [shadertoy.liquid](https://github.com/sh1boot/sh1boot.github.io/blob/master/_includes/shadertoy.liquid))

And the result looks like this:
{% include shadertoy.liquid id='clB3RK' %}
The default here is to get the preview image from that site.  That's probably fine, right?

An embedded Scratch app:
{% include scratch.liquid id='782596588' %}
This frustrates me a little because the embed doesn't contain a link to the
project, and also because I haven't worked out how to get autoplay working.
I'm also getting the preview from their site.  The platform has its own
internal "native" resolution of 480x360, and that's how it renders the preview,
but it's mostly vector graphics so it scales nicely once it's loaded.

Except for things drawn with the pen extension.  Those stay at 480x360 and get
ugly scaling.

Something from [Tinkercad][]:
{% include tinkercad.liquid id='hHgAIBifrz6' image='/images/pin-tumbler-lock.png' %}
Tinkercad embeds don't provide an easy-to-find preview image, so I've had to
make my own and store them locally.  Which is fine because I should really
store all previews locally anyway.

And, of course, YouTube ([source](https://github.com/sh1boot/sh1boot.github.io/blob/master/_includes/youtube.liquid)):
{% include youtube.liquid id='MTIwzKI44Es' %}
Gets the preview from YouTube by default.  This turns out badly for old videos
or 4:3 videos or something.  Note that the use of the `youtube-nocookie.com`
domain probably stops this video appearing in your view history.  I'll have to
check that some time.

But the greatest frustration of all is that while I do have the option of
putting a misleading preview image in place, I can't embed a rickroll, because
YouTube blocks embedding of every instance of that video that I can find.

### Future work
* do CSS correctly, or whatever
* a stop button
* turn off other frames when you activate a new one (ie., don't play five youtube videos at once)
* automatically populate local preview store while the site is being built? (stealing other sites' assets)
* controls could be nicer, but I resent being forced to make style decisions I would rather be in the hands of the user, and not me

[utteranc.es]: <https://utteranc.es/>
[MathJax]: <https://www.mathjax.org/>
[Shadertoy]: <https://www.shadertoy.com/>
[Tinkercad]: <https://www.tinkercad.com/>
[Scratch]: <https://scratch.mit.edu/>
