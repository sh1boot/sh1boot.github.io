---
layout: post
title: Surprise functionality in StackOverflow copy-pasted code
---
Because Markdown is really a mixture of Markdown syntax and raw HTML to
fill in gaps where Markdown can't do the job, having user-generated
content in Markdown format doesn't help to curb malicious content.
Users are still publishing HTML and have opportunities to embed
something malicious or sneaky.

In the case of StackOverflow, you end up being able to do things like
switch to `<pre>` formatting without escaping all of the contained text
as raw code; so you can embed HTML in the blocks which look like the
code you would want to copy-paste, but with surprise semantics.

You can embed images, for example, and provide alt text for those
images, and you can make those images practically invisible, so that
when people copy the text in the code block you provide they'll also
pick up the alt text which they couldn't see on the web page.

Like so:
```markdown
Here is my solution:

<pre>my<img src="https://example.com/invisible_image.gif" alt=" malicious"/> code</pre>

It's really good!
```

There's a [sandbox][] to test stuff in.

Imagine the possibilities!

It turns out that one such possibility is to embed escape seuences in
the hidden text, and if you're pasting this text into a terminal then
those escape sequences can be interpreted by the application as
keystrokes rather than being pasted into your source code or whatever.

To mitigate this the terminal and application should be using bracketed
paste, which ensures that pasted text is surrounded by delimiters which
indicate that it shouldn't be interpreted as escape sequences but raw
text to be inserted into the file or whatever.

But those delimiters are what?  They're escape sequences.  So you can
put the end marker into your text in order to make everything after that
be interpreted by the application as keyboard input again just like
before bracketed paste was a thing.

Like so:
```html
<img alt="&#27;[201~ keyboard input here" ...>
```

Thankfully it only took a few months of poking and prodding at the
various vulnerable terminals to get most (not all) of them fixed in such
a way that they block the embedding of the end sequence for bracketed
paste within the pasted text.

OSX's Terminal.app even brings up a message box explicitly telling you
you're under attack if you try.  I think that's great.  Most other
terminals just strip out control codes so the content is too mangled to
break out of its brackets.

I do not promise that all terminals are safe, though.

There's also another potential weakness.  If you can get a half-finished
escape sequence started at the terminal, then the application can be
tricked into _missing_ the begin-bracketed-paste escape sequence.  To
illustrate this, simply hit Escape right before pasting something into
the terminal when it should be using bracketed paste.  The double-escape
can cause the bracketed paste opening to be mis-parsed, so everything
that follows is still seen as keystrokes.

It'd probably take a bit of social engineering, or maybe network timing
manipulation, or remarkable knowledge of unfixed bugs in termcap entries
to exploit this, so maybe we're all safe.

I don't promise that, though.

So you might be asking "where's the responsible disclosure?".  Well, I
went through it all years ago.  I tried to cut this off at StackOverflow
first (don't let people embed surprise text, don't let people embed
control codes in text), and then in the browser (don't copy control
codes embedded in HTML text), and then in some terminals (don't let
escape sequences escape the esape-sequence that says to ignore escape
sequences).  For the most part the issue was dismissed as somebody
else's problem, and everybody preferred to keep things as they are
rather than risk breaking some unspecified case which somebody might be
using legitimately.

The only people to take me seriously were Apple, and I got an SVE out of
it for my efforts.  That's probably because I gave them a whole proof of
concept which ran arbitrary code and made it invisible to the user that
arbitrary code had been run (except that I waved a flag to say it had
happened to prove it).

There are gaps that I see, still, but I've long since given up trying.

There is a _lot_ I do not agree with in the way things were designed,
here.  The intrinsic weakness of layers upon layers of escape sequences
is absurd to me, but it's also industry standard and an evergrowing
problem as people design more systems which function this way.  It's
become normalised and there's no stopping it anymore.


[My PoC]: <https://security.stackexchange.com/a/183377>
[sandbox]: <https://meta.stackexchange.com/q/3122/227423>