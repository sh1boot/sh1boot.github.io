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

```conf
set-window-option -g window-status-style bg=green,fg=#000000,fill=#336600
set-window-option -g window-status-current-style bg=cyan,fg=#000000
set-window-option -g window-status-format '#{?#{==:#{pane_current_command},zsh},,#[bg=blue]}#[fg=#336600,reverse]🭮#[noreverse,fg=#000000]#{p1:window_flags}#I┊#{=/#{?#{==:#{pane_current_command},zsh},-,}18/… :pane_title}#[fg=#336600,reverse]🭬'
set-window-option -g window-status-current-format '#[fg=#336600,reverse]🭮#[default]#{p1:window_flags}#I┊#{=/#{?#{==:#{pane_current_command},zsh},-,}18/… :pane_title}#[fg=#336600,reverse]🭬'
set-window-option -g window-status-separator ""
```

```conf
set-option -g set-titles on
set-option -g status-left " #S#[fg=#336600,reverse]🭐 "
bind-key -n MouseDown1StatusLeft choose-tree -s
set-option -g status-right-length 50
set-option -g status-right "#[fg=#336600,bg=blue]🭡#[default,bg=blue]#{=/-38/… :#(~/.config/scripts/gitsummary.sh #{pane_current_path})}#[bg=red,fg=white]#(~/.config/scripts/gitstate.sh)#[default]🮚#{pane_tty}"
set-option -g status-justify left
```


Breaking down `window-status-format` into pieces:
* `#{?#{==:#{pane_current_command},zsh},,#[bg=blue]}`

This part looks at the value of `pane_current_command`, if it is equal to `zsh`
then it does nothing, otherwise it changes the background colour to blue.  This
gives a colour indicator of which windows are currently waiting at the prompt,
and which are running commands.

* `#[fg=#336600,reverse]🭮#[noreverse,fg=#000000]`

First it sets the text colour to be the current background colour, and sets the
background to be the same as the window status fill colour.  Then it draws a
box-drawing character using the background colour as the foreground colour so
that it will bend with the background of the rest of the box.  Then it puts the
colours back.  Normally one would use `#[default]` here, but in this instance
we need to preserve the background colour set at the beginning, so we just undo
the `reverse` and force the foreground colour to its expected value.

There's a different box drawing character which would avoid this colour
switching, but this way around seems to render better.


* `#{p1:window_flags}#I┊`

Print the window flags (eg., `*` for current, `-` for previous, `!` for
alarm...), padded to be at least one character so that we get a space if there
is no flags to print.  Then the index, then a box-drawing character as a
separator (something tall and thin).

* `#{=/#{?#{==:#{pane_current_command},zsh},-,}18/… :pane_title}`

Starting at `#{?` e look at the value of `pane_current_command` to see if it's
equal to `zsh`.  If it is then we insert a `-` just before that `18` there.  So
the result is either `18` or `-18`, depending on whether or not we're running a
command.  That is the `n` argument in `#{=/n/...:pane_title}`.  What that does
is take the title of the window, which I keep up to date using `zsh` itself,
and truncates it either from the left or from the right depending on the sign
of `n`.

When zsh is waiting for more input it sets the title to the current working
directory.  I don't want that to be `/home/...` for every window, so it's
better to truncate from the left.

Right before zsh launches a command it changes the window title to the command
line that is running.  Maybe `vim some_file.txt` or `wget latest_warez.zip` or
whatever.  I prefer to keep the left part of that, so I trim from the right.


* `#[fg=#336600,reverse]🭬`

Another box-drawing character, drawn with the background colour used as
foreground, and the status fill colour as background.


The `window-status-current-format` is basically the same but simpler, because I
haven't bothered to faff about with different backgrounds depending on the
command execution state:

* `#[fg=#336600,reverse]🭮#[default]`

Box drawing character.

* `#{p1:window_flags}#I┊`

Window flags, index, separator.

* `#{=/#{?#{==:#{pane_current_command},zsh},-,}18/… :pane_title}`

Command or path.

* `#[fg=#336600,reverse]🭬'

Box drawing character.

These two make the name of the session appear on the left of the status
bar, and if you click on it with the mouse it opens up the session
chooser thingumy:
```conf
set-option -g status-left " #S#[fg=#336600,reverse]🭐 "
bind-key -n MouseDown1StatusLeft choose-tree -s
```


And then there's `status-right`....
* `#[fg=#336600,bg=blue]🭡#[default,bg=blue]`

Box drawing...

* `#{=/-38/… :#(~/.config/scripts/gitsummary.sh #{pane_current_path})}`

A summary of git info for the current working directory.  Usually just the
branch name.  Maybe some observations in the form of emoji, noting things like
that the code hasn't been touched in a long time (that could mean it Just
Works&trade; but more likely it means it's been abandoned).

* `#[bg=red,fg=white]#(~/.config/scripts/gitstate.sh)#[default]`

This is generally zero-width, so we don't have to deal with a bright red patch
on the display.  If you see red here then wake up.

I use this to print a string representing what state git is currently in, if
it's in the middle of a merge or rebase or whatever.  I have to close that
state off and make the red go away before trying to do anything else.

* `🮚#{pane_tty}"

I like to have the pseudoterminal in view in case something happens
where I need to be able to find tasks running in the current window
while the current window is unusable.

These pipes are just worth knowing.  I seem to have made a note of them in my tmux.conf:
```sh
... | tmux loadb -
tmux saveb - | ...
```

Also:
```sh
tmux source-file ~/.config/tmux/tmux.conf
```

On the zsh side:
```zsh
function preexec() {
    local esc=$'\E'
    local bel=$'\a'
    local cmdline="$2"
    [[ "$cmdline" == "fg" ]] && cmdline="${jobtexts[%+]}"
    cmdline="$(tr -d '[:cntrl:]' <<< "$cmdline")"
    # Window title and reset cursor colour.
    print -rn "${esc}[0m${esc}[2K${esc}]0;$cmdline$bel"
    # Record command and its start time.
    start_time=$(date +%s)
    start_what="${2/ */}"
}

function precmd() {
    local esc=$'\E'
    local bel=$'\a'
    # Window title and reset cursor colour.
    print -Pnr "${esc}[0m${esc}[2K${esc}]0;%~$bel"
    stty sane ; print -nr "${esc}[?1000l${esc}[?9l"
    elapsed="$(($(date +%s)-start_time))"
    [ -n "${start_time}" ] && [ "${elapsed}" -gt 4 ] && \
        print -Pnr "%K{17}%B%E ${start_what} finished after ${elapsed} seconds. "
    unset start_time
    unset start_what
}
```

The command line needs quite a bit of careful handling before it can be
inserted into the escape sequence for the window title.  It has to be used in a
way that doesn't cause expansion of any escape sequences it might contain, and
it has to be stripped of control codes, or anything that might devolve into a
control code.

The path is a bit easier.  Or at least it's a lot less likely to contain
control codes and escape characters which can cause trouble.

The following erases and redraws the prompt after you hit enter.  This is
because what's best to appear in scrollback is not necessarily the same thing
as what's best for editing the command.  Command editing wants room to move.
Scrollback wants complete information.

Also I find it very helpful to have a prominent boundary between different
command outputs when perusing scrollback.  I have tried setting a different
background colour while editing the next command but it comes up against all
sorts of technical issues in terminal compatibility.  It's much simpler to just
over-draw it with a prominent background once you're done editing.

```zsh
PROMPT=$'%K{18}%B%{\E[3m%}%~%{\E[23m%}%E\n%b%k%n@%F{cyan}%m%f%B%#%b%E '

SCROLLBACK_PROMPT="%K{17}%B%2~$ %b"
SCROLLBACK_PS2="%K{17}%B${PS2} %b"
SCROLLBACK_PS3="%K{17}%B${PS3} %b"
SCROLLBACK_PS4="%K{17}%B${PS4} %b"
function set-scrollback-prompt() {
    PROMPT="$SCROLLBACK_PROMPT" \
            PS2="$SCROLLBACK_PS2" \
            PS3="$SCROLLBACK_PS3" \
            PS4="$SCROLLBACK_PS4" \
            zle reset-prompt
    zle .accept-line
}
zle -N accept-line set-scrollback-prompt
```

We have two parts, here.  `SCROLLBACK_\*` describe the way each prompt should
be drawn when the line is accepted.  Notable here for use of `%K{17}` to set
the background colour.  And the function `set-scrollback-prompt()`, which hooks
the accept-line function, and calls `zle reset-prompt` with the prompt
variables all replaced with the scrollback versions.  Then it continues on to
the original accept-line function.

Actually I thought I made the path italic, not just bold.  An exercise for the
reader, I guess.

[box-drawing characters]: <https://en.wikipedia.org/wiki/Box-drawing_characters>
