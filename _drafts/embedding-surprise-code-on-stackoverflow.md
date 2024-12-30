---
layout: post
title: Embedding surprise copy-paste content on StackOverflow
---
Because Markdown is a mixture of markdown syntax and HTML where
Markdown can't do the job, you end up being able to do things like
switch to `<code>` formatting without escaping all of the contained text
as raw content.

Consequently you can embed images, and you can provide alt text for
images, and you can make those images practically invisible, so that
when people copy the text in the code block you provide, you can give
them a little extra surprise.

Imagine the possibilities!

Well, it turns out that one such possibility is to embed escape seuences
in the hidden text, and if you're pasting this text into a terminal then
those escape sequences can be interpreted by the application as
keystrokes, rather than being pasted into your source code or whatever.

But of course any modern terminal and application supports bracketed
paste; which ensures that pasted text is surrounded by delimiters which
indicate that it shouldn't be interpreted as escape sequences but raw
text to be inserted into the file or whatever.

But those delimiters are what?  They're escape sequences.  So you can
put the end delimiter into your text in order to make everything after
that be interpreted by the application as keyboard input again.

Thankfully, after a few months of poking and prodding at various
developers, most terminals I'm aware of no longer allow the bracketed
paste terminator to be sent within the pasted text.

OSX's Terminal.app brings up a message box explicitly telling you you're
under attack if you try.  I think that's great.  Most other terminals
just strip out control codes so the content is too mangled to break out
of its brackets.

I do not promise that all terminals are safe, though.

There's also another potential weakness.  If you can get a half-finished
escape sequence started at the terminal, then the application can be
tricked into _missing_ the begin-bracketed-paste escape sequence.  To
illustrate this, simply hit Escape, and then paste something into the
terminal when it should be using bracketed paste.  The double-escape can
cause the bracketed paste opening to be missed, so everything that
follows is still seen as keystrokes.

It'd probably take a bit of social engineering, or remarkable knowledge
of unfixed bugs in termcap entries to exploit this, so maybe we're all
safe.

I don't promise that, though.


So you might ask "where's your responsible disclosure?".  Well, I went
through it all years ago.  I tried to cut this off at StackOverflow
first (don't let people embed surprise text), and then in the browser
(don't let HTML embed escape codes in text), and then in some terminals.
The only people to take me seriously were Apple, and I got an SVE out of
it for my efforts.  Yay!

There are gaps that I see, still, but I've long since given up trying.
