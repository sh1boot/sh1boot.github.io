---
layout: post
title: My tmux and zsh configuration
---
Thought I should probaby describe some techniques I used.

I prefer to put my git details in the tmux status bar rather than the
zsh prompt.

I also had some joy using [box-drawing characters][].  There's a bit of
trickery to swapping foreground and background colours to get rid of
edge artefacts.

For zsh I learned how to erase the interactive, line-editing prompt and
to reprint it as something canonical, with a coloured background, when I
hit enter.  This allows me to distinguish the start and end of command
output easily in scrollback.

Also in zsh I set the window title to either the current working
directory, or the currently-running prompt, and I pick this up in tmux
for the tab title; using different colours for tabs running commands
versus those just waiting at the prompt.

I also print the pts on the status bar for historical reasons.  Mostly
in case something gets hung up in an awkward way and I need to know
which commands were running in there.

zsh issues `stty sane` and disables mouse reporting, in case a program
crashed in an ugly state.

TODO: lots of details

[box-drawing characters]: <https://en.wikipedia.org/wiki/Box-drawing_characters>
