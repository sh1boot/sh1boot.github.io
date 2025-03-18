---
layout: post
title: My tmux and zsh configuration
redirect_from:
    - /drafts/zsh-and-tmux-config/
---
Here's a list of things I have in my [tmux][] and [zsh][]
configurations, which might offer some inspiration to others.

* TOC
{:toc}

## zsh configuration

Here's some of my `~/.zshrc`:

```zsh
local _ESC=$'\E'
local _BEL=$'\a'

function win_title() {
  local title="$(tr -d '[:cntrl:]' <<< "$1")"
  print -nr "${_ESC}]0;${title}${_BEL}"
}

function precmd() {
  win_title "$(print -P '%~')"
  stty sane ; print -nr "${_ESC}[?1000l${_ESC}[?9l${_ESC}[0m${_ESC}[2K"
}

function preexec() {
  local cmdline="$2"
  [[ "$cmdline" == "fg" ]] && cmdline="${jobtexts[%+]}"
  win_title "$cmdline"
  print -nr "${_ESC}[0m${_ESC}[2K"
}

function githead() {
  local gitdir="${1:a}"
  until [[ -e "$gitdir/.git" ]]; do
    local updir="${gitdir%/*}"
    [[ "$updir" == "$gitdir" ]] && return 1
    gitdir="$updir"
  done
  gitdir="$gitdir/.git"
  {
    local gitdir_link
    gitdir_link="$(<"$gitdir")" && gitdir="${gitdir_link#gitdir: }"
    local hash="$(<"$gitdir/HEAD")"
    if [[ "$hash" == ref:* ]]; then
      local ref="${hash#* }"
      local gitdir_relative=$(<"$gitdir/commondir") && gitdir="$gitdir/$gitdir_relative"
      hash="$(<"$gitdir/$ref")" || hash="$(git rev-parse --short HEAD)"
    fi
  } 2> /dev/null
  print -r "${hash:+ ${hash::12}}"
  return 0
}

SCROLLBACK_PROMPT="%K{20}%*%v %2~$ %B%F{white}"
SCROLLBACK_PS2="%K{20}${PS2} %BF{white}"
SCROLLBACK_PS3="%K{20}${PS3} %BF{white}"
SCROLLBACK_PS4="%K{20}${PS4} %BF{white}"
function set-scrollback-prompt() {
    psvar[1]="$(githead .)"
    PROMPT="$SCROLLBACK_PROMPT" \
            PS2="$SCROLLBACK_PS2" \
            PS3="$SCROLLBACK_PS3" \
            PS4="$SCROLLBACK_PS4" \
            zle reset-prompt
    zle .accept-line
}
zle -N accept-line set-scrollback-prompt
```

### Setting window title from path or command

I set the window title from zsh to reflect either the current working
directory or the currently-running command.  So the tabs in the status
bar can be rendered accordingly.

```zsh
local _ESC=$'\E'
local _BEL=$'\a'

function win_title() {
  local title="$(tr -d '[:cntrl:]' <<< "$1")"
  print -nr "${_ESC}]0;${title}${_BEL}"
}
```

Control code handling is a bit messy.  I put them in variables to stop
them from being interpreted at the wrong time: either being expanded
after `${title}` is expanded, so that any escapes inside of `${title}`
are also expanded, or when the function is defined, so that when I list
function definitions they send stray escape sequences to the terminal
(which I don't appreciate).

There might (must!) be a better way, but what I have seems stable so
far, and only slightly unprintable.

So this call goes in `precmd()`:

```zsh
  win_title "$(print -P '%~')"
```

And this call goes in `prexec()`:

```zsh
  local cmdline="$2"
  [[ "$cmdline" == "fg" ]] && cmdline="${jobtexts[%+]}"
  win_title "$cmdline"
```

I got tired of all my windows ending up being titled `fg`, so I included
a fixup for that.

### Resetting terminal state after commands

This in `precmd()`:

```zsh
  stty sane ; print -nr "${_ESC}[?1000l${_ESC}[?9l${_ESC}[0m${_ESC}[2K"
```

It restores the terminal to a comparatively usable state after each
command, in case something crashes in an ugly state.

### get current git hash faster

Putting the output of another command in a shell prompt can be a bit
laggy on slow machines, and git is no exception.  Performance can be
improved by implementing the same functionality inside zsh itself,
despite that implementation being interpreted code:

```zsh
function githead() {
  local gitdir="${1:a}"
  until [[ -e "$gitdir/.git" ]]; do
    local updir="${gitdir%/*}"
    [[ "$updir" == "$gitdir" ]] && return 1
    gitdir="$updir"
  done
  gitdir="$gitdir/.git"
  {
    local gitdir_link
    gitdir_link="$(<"$gitdir")" && gitdir="${gitdir_link#gitdir: }"
    local hash="$(<"$gitdir/HEAD")"
    if [[ "$hash" == ref:* ]]; then
      local ref="${hash#* }"
      local gitdir_relative=$(<"$gitdir/commondir") && gitdir="$gitdir/$gitdir_relative"
      hash="$(<"$gitdir/$ref")" || hash="$(git rev-parse --short HEAD)"
    fi
  } 2> /dev/null
  print -r "${hash:+ ${hash::12}}"
  return 0
}
```

Here, we iterate up the tree by cutting off directory names until we
find a `.git` directory (or file).  If it's a file, then the content of
that file should point inside the actual git directory (these files are
created by `git worktree`).  Get the content of the file `HEAD`, and if
that contains `ref:` then go look up the actual hash in the refs folder
(which is actually in the root of the git directory, not the worktree
subdirectory).

If the ref is not there then it's probably a packed ref, so just give up
and hand off to the external command line tool instead, because it's
probably not going to be efficient parsing packed refs in this function.

### Changing the appearance of prompts in scrollback

The prompt that makes sense for interactive line editing and current
status, or whatever, isn't always the best context thing to have filling
up your scrollback.

So you can ask zsh, just before executing a command, to change the
prompt settings and have zsh redraw the prompt, and then go ahead and
execute the command.

I take the opportunity to set a non-default background colour so that
when I'm perusing scrollback I get a clear boundary between output from
different commands.

```zsh
SCROLLBACK_PROMPT="%K{17}%*%v %B%2~$ %b"
SCROLLBACK_PS2="%K{17}%B${PS2} %b"
SCROLLBACK_PS3="%K{17}%B${PS3} %b"
SCROLLBACK_PS4="%K{17}%B${PS4} %b"
function set-scrollback-prompt() {
    psvar[1]="$(githead .)"
    PROMPT="$SCROLLBACK_PROMPT" \
            PS2="$SCROLLBACK_PS2" \
            PS3="$SCROLLBACK_PS3" \
            PS4="$SCROLLBACK_PS4" \
            zle reset-prompt
    zle .accept-line
}
zle -N accept-line set-scrollback-prompt
```

What this does is temporarily set up a bunch of alternate prompts while
calling `zle reset-prompt`, which will cause the prompt and text input
to be redrawn in the styles given by `SCROLLBACK_\*`.  Then it goes on
to call the standard accept-line function.

This can cause the output colour to end up as something other than the
default, which can be fixed up in `preexec()`:

```zsh
  print -nr "${_ESC}[0m${_ESC}[2K"
```

The `%v` part of the prompt prints what is saved with `psvar[1]="..."`,
which in this case is the current git commit hash (as collected in the
previous section).  This is helpful so that you have a record of what
commit the tree was at when a test was run, so that you can find it
again if you want to reproduce that result.  Provided you don't have
local edits.  The information is collected in `preexec()` to be up to
date, even if the state was changed in another window while this one
idled.

## tmux configuration

Here's some of my `~/.config/tmux/tmux.conf`:

```conf
set -g @status_bg "#330066"
set -g @status_fg "#000000"
set -g @shell_idle "#{==:#{pane_current_command},zsh}"
set -g @tab_width "18"
set -g @tab_bg "#{?#{==:#{window_flags},*},cyan,#{?#{E:@shell_idle},blue,green}}"
set -g @tab_left "#[fg=#{E:@tab_bg},bg=#{@status_bg}]🭮#[fg=#{@status_fg},bg=#{E:@tab_bg}]"
set -g @tab_prefix "#{p1:window_flags}#I┊"
set -g @tab_title "#{=/#{?#{E:@shell_idle},-,}#{@tab_width}/… :pane_title}"
set -g @tab_right "#[fg=#{@status_bg},reverse]🭬"
set -g @git_summary "#(~/.config/scripts/gitsummary.sh #{pane_current_path})"
set -g @git_state "#[bg=red,fg=white]#(~/.config/scripts/gitstate.sh #{pane_current_path})#[default]"
set -g @pts "#[fg=blue,reverse]🭡#[default,bg=blue]#{s|/dev/| |:pane_tty} "

set -g status-left " #S#[fg=#{@status_bg},reverse]🭐 "
set -g status-right "#[fg=#{@status_bg},reverse]🭅#[default]#{E:@git_summary}#{E:@git_state}#{E:@pts}"
set -g status-right-length 50
set -g window-status-style "bg=green,fg=#{@status_fg},fill=#{@status_bg}"
set -g window-status-current-style "bg=cyan,fg=#{@status_fg},fill=#{@status_bg}"
set -g window-status-format "#{E:@tab_left}#{E:@tab_prefix}#{E:@tab_title}#{E:@tab_right}"
set -g window-status-current-format "#{E:window-status-format}"
set -g window-status-separator ""

bind -n MouseDown1StatusLeft choose-tree -s

set-hook -g session-created 'run-shell "tmux set -t #D @status_bg \"##$(echo "#h#S" | sha1sum | cut -c-6)\""'

bind '"' split-window -c "#{pane_current_path}"
bind % split-window -h -c "#{pane_current_path}"
bind c new-window -c "#{pane_current_path}"
```

Refer to the [tmux format strings][] documentation for details, but what
follows is a brief description of each part.

### User options in tmux

First, 'user options' are a thing, where any option name beginning with
`@` is available for personal use:

```conf
set -g @status_bg "#330066"
set -g @status_fg "#000000"
set -g @tab_width "18"
```

These are expanded in other places using `#{@tab_width}`.  If the
option contains more to expand, it can be referenced with, eg.,
`#{E:@shell_idle}`.

### Detecting an idle shell

If a pane has gone back to the shell, that's occasionally worth knowing:

```conf
set -g @shell_idle "#{==:#{pane_current_command},zsh}"
```

This checks to see if tmux sees the current task as `zsh`.  If it is
then that means it's [probably] just waiting for command input.
Otherwise something is [probably] running.

This will expand to 0 or 1, to be used in other conditionals.

### Recolouring idle tabs

```conf
set -g @tab_bg "#{?#{==:#{window_flags},*},cyan,#{?#{E:@shell_idle},blue,green}}"
```

This returns a colour to use as the background for each tab in the status bar.
Cyan for the tab you're looking at, green for a busy tab, and blue for an idle
tab.

### box-drawing characters for visual separation

I'm not generally into console bling, but I found that having all the
separators be rectangular character cell edges made things harder to
read than if I used [different shapes][box-drawing characters].  Even if
the results aren't all that pretty I still find it easier to read.

What I've done here is put some triangles on the edges of the tabs
matching the background colour of the tab, to turn them from rectangles
into hexagons:

```conf
set -g @tab_left "#[fg=#{E:@tab_bg},bg=#{@status_bg}]🭮#[fg=#{@status_fg},bg=#{E:@tab_bg}]"
set -g @tab_right "#[fg=#{@status_bg},reverse]🭬"
```

The left part also establishes the background colour for the main body
of the tab.

### Window status and index

There's a window-flags string showing a few things, like `!` for an
alarm state.  Apparently I saw need to pad this to one character to
stabilise the tab size, suggesting that at some point it was dynamic in
length.  This doesn't seem to be necessary anymore, but there it is.
Is it ever longer?  I've never noticed that.

Then the window index #I, then a separator character.  I went with the
lightest [box-drawing character][] I could find which reaches the full
height of the space.

```conf
set -g @tab_prefix "#{p1:window_flags}#I┊"
```

### Cropping tab title to a maximum length on the proper side

I don't want long window titles to produce oversized tabs, so I truncate
them:

```conf
set -g @tab_title "#{=/#{?#{E:@shell_idle},-,}#{@tab_width}/… :pane_title}"
```

When zsh is waiting for more input it sets the window title to the
current working directory.  I don't want that to be `/home/...` for
every window, so it's better to truncate from the left.

When a command is running, that becomes the window title, and the
essential information there is probably the first word, so I want to
truncate from the right.

The difference in tmux format specifiers is expressed as whether or not
the crop length has a negative prefix on it, as shown above.

### Git information in tmux status bar

I prefer my git status in my tmux status bar.  Mostly because the
handling of slow commands is better, but also because it's still
relevant not just at the prompt but also while I'm editing files or
whatever.

```conf
set -g @git_summary "#(~/.config/scripts/gitsummary.sh #{pane_current_path})"
```

And that script looks like:

```sh
#!/bin/sh
set -e
cd "$1"
if git rev-parse 2> /dev/null ; then
    echo -n "$(git rev-parse --abbrev-ref HEAD)"
    git log --format=%cr -n2 --reverse . | head -n1 | sed -ne 's/ \(.*\) \(w\|m\|y\)\(eeks\|onths\|ears\) ago/ 👻\1\2👻/p'
fi
```

This normally just prints the current branch, but if the current
directory hasn't been updated recently it'll also give the date of the
second-newest commit.  If that the code hasn't been touched in a long
time that could mean it Just Works&trade; but often it means it's been
abandoned and I'm looking in the wrong place.

Then there's the state that git is in:

```conf
set -g @git_state "#[bg=red,fg=white]#(~/.config/scripts/gitstate.sh #{pane_current_path})#[default]"
```

This is normally zero-width, so we don't have to deal with a bright red
patch on the display.  If I see red here then I have to wake up.

I use this to print a string representing what state git is currently
in, if it's in the middle of a merge or rebase or whatever.  If it's not
an empty string I should probably not try to do anything else.

The script is:

```sh
#!/bin/sh
set -e
gitdir=$(git -C "$1" rev-parse --git-dir)
[ -z "$gitdir" ] && exit
r=""
if [ -f "$gitdir/rebase-merge/interactive" ]; then
    r="REBASE-i"
elif [ -d "$gitdir/rebase-merge" ]; then
    r="REBASE-m $(cat $gitdir/rebase-merge/head-name)"
elif [ -d "$gitdir/rebase-apply" ]; then
    if [ -f "$gitdir/rebase-apply/rebasing" ]; then
        r="|REBASE"
    elif [ -f "$gitdir/rebase-apply/applying" ]; then
        r="|AM"
    else
        r="|AM/REBASE"
    fi
fi
echo "$r"
```

### Pseudo-terminal in the status bar

I also print the pts on the status bar for historical reasons.  Mostly
in case something gets hung up in an awkward way and I need to know
which commands were running in that pane.

```conf
set -g @pts "#[fg=blue,reverse]🭡#[default,bg=blue]#{s|/dev/| |:pane_tty} "
```

### Stitching it all together

Those user settings are then stitched together into the actual
configuration settings:
```conf
set -g status-left " #S#[fg=#{@status_bg},reverse]🭐 "
set -g status-right "#[fg=#{@status_bg},reverse]🭅#[default]#{E:@git_summary}#{E:@git_state}#{E:@pts}"
set -g status-right-length 50
set -g window-status-style "bg=green,fg=#{@status_fg},fill=#{@status_bg}"
set -g window-status-current-style "bg=cyan,fg=#{@status_fg},fill=#{@status_bg}"
set -g window-status-format "#{E:@tab_left}#{E:@tab_prefix}#{E:@tab_title}#{E:@tab_right}"
set -g window-status-current-format "#{E:window-status-format}"
set -g window-status-separator ""
```

I think in previous versions of tmux I needed to pass `-F` to set those style options, but by not doing that you can update the values dynamically, which is fun.

### A mouse-clickable session selector

```conf
bind -n MouseDown1StatusLeft choose-tree -s
```

This makes it so that I can click that session name in status-left,
and get a list of sessions to choose from:

### Unique, per-session status bar colours

To take the hash of the host and session names, and cut that down to six
hex digits to make a random colour on a per-session basis:

```conf
set-hook -g session-created 'run-shell "tmux set -t #D @status_bg \"##$(echo "#h#S" | sha1sum | cut -c-6)\""'
```

### Create new windows in current working directory

It generally works better for me to have new shells start out in the
working directory of the shell I'm looking at:
```conf
bind '"' split-window -c "#{pane_current_path}"
bind % split-window -h -c "#{pane_current_path}"
bind c new-window -c "#{pane_current_path}"
```

## A couple of other notes

While messing about with the configuration file, you can reload it with:

```sh
tmux source-file ~/.config/tmux/tmux.conf
```

In place of tools like `xsel` or `pbcopy`/`pbpaste`, the tmux-equivalent tools
for piping into and out of the clipboard are:

```sh
... | tmux loadb -
tmux saveb - | ...
```

Other references:
* [tmux format strings][]
* [box-drawing characters][]

[tmux]: <https://github.com/tmux/tmux/wiki>
[zsh]: <https://www.zsh.org/>
[tmux format strings]: <https://github.com/tmux/tmux/wiki/Formats>
[box-drawing characters]: <https://en.wikipedia.org/wiki/Box-drawing_characters>
