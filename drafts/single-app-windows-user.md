---
title: Setting up a single-app user in Windows
layout: post
tags: windows, parenting
---
Restricting a Windows user to a single application can be helpful to remove
distractions.  Ideally this would be achieved with Kiosk mode, but this is
often not practical and it requires specific versions of Windows.  As an
alternative you can use AppLocker plus a couple of registry hacks to keep one
account on the straight and narrow, while still being able to use the computer
as other users for everyday stuff.

There are administrative tools to do these things, but I don't know how they
work or where to get them.  That's what put me off for so long because I do not
want to learn to be a Windows admin.  So here's what I did instead:

First, create a dedicated user for the application. That's in **Settings**
(`Win+I`), **Accounts** > **Other users**.  You want to add just a local user,
which requires you to choose **I don't have this person's sign-in information**
so you get the option **Add a user without a Microsoft account**.

Next, sign in as that user and set a user picture in **Settings** under
**Accounts** > **Your Info**. Also go to **Accounts** > **Sign-in options** and
disable **Use my sign-in info to automatically finish setting up after an
update**.

Now for the registry tweaks.

Hit `Win+R` for the run box, enter `regedit` as the command, but use
**Ctrl-Shift-Enter** rather than just **Enter**, to run it as admistrator. Some
changes you can't make without admin privileges.

The first thing is to change the login shell to the application you want to run:
```
[HKEY_CURRENT_USER\Test\Software\Microsoft\Windows NT\CurrentVersion\Winlogon]
"Shell"="C:\Program Files\HomeworkApp\homeworkApp.exe"
```
`Shell` probably won't be there by default and you'll have to add it (as a
string type).

You can get the path of the executable from its shortcut on the desktop, or
start menu, where right-click **Properties** should have a box you can
copy-paste.

This means that when the user logs in they won't get taskbark, desktop, or
start menu.  They'll just get that application.  It's a good start, but hitting
**Ctrl-Alt-Delete** still lets the user start other applications via Task
Manager.

To disable Task Manager:
(note that unlike the path above, this one is just `Windows`, not `Windows NT`)
```
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Policies\System]
"DisableTaskMgr"=DWORD:00000001
```
You might need to create the `System` key to put values in it.

And, if you want, disable password changes:
```
[HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Policies\System]
"DisablePasswordChange"=DWORD:00000001
```

Now you can log out and log back in again as the same user, and rather than
getting the taskbar and start menu and a desktop full of icons, the only thing
you should see is the application you specified above.

This is a good opportunity to go through any new-user set-up that it needs
before locking things down futher, in case it needs to do something like launch
a web browser to sign in, as we'll remove that possibility later on.

You can hit **Ctrl-Alt-Delete** to log out if closing the app doesn't work.

## Enforcing the lock-down via AppLocker policy

So far we've just removed a lot of ways of launching an unwanted application
but that doesn't mean an errant user can't find a way.  For example, the
application might launch a web browser to authenticate, and that can be
redirected to other web pages or even `file:///` links.

This is the hairy part where you can break your computer.

You're adding policies to your computer which restrict what applications users
can run.  The rules will apply to everyone, and you have to make sure you allow
yourself to keep running things or you won't be able to run the things needed
to correct any mistakes; so make sure you have a recovery plan in place or
whatever.

Log in as an admin user and hit `Win+R` to launch `secpol.msc`.

If that doesn't work you can look on the internet for how to install
`secpol.msc` and `gpedit.msc`.  They'll already be shipped with your computer
but they need to be unpacked, and the instructions are weirdly esoteric for
such a simple thing.

Once you have that running you'll have a window, and in the left sidebar look
for **Application Control Policies**, which you unfold to reveal **AppLocker**.
Select that.

Careful now...

In the left sidebark you have **Executable Rules**, **Windows installer
Rules**, **Script Rules**, and **Packaged app Rules**.  If you click on each of
these they should all show empty lists.  If they are not empty then stop
following these instructions and go talk to your system administrator.

Again; if these rules are alredy configured then don't mess with them.  Turn
back now.

In the _empty_ list of each of these, right-click and select **Craete Default
Rules**.  This is the thing you must do so you don't break your computer.

Next, in **Executable rules**, right-click and choose **Create New Rule**.
When you get to **Action** choose **Deny**, and under **User or group** click
**Select...**, type in the name of your local user and click **Check Names**.
If that works then click **OK**, and then **Next**.

For **Condition** choose **Path**, and choose simply `*` (block everything by
default).  Then **Next** on to **Exceptions** and here you can specify **Path**
to add the same executable as was specified in the registry setting earlier.
Or its path, or its publisher, or whatever.  Then proceed with other details
and hit **Create**.

Now in the **Executable Rules** list double-check that your new **Deny** rule
is restricted to just the user you want to constrain.  Don't mess that up.  It
should be the only **Deny** rule in the list.

Once that's set up, you can click **AppLocker** on the left and **Configure
Rule Enforcement** in the main pane. Then under **Executable rules** check the
**Configured** box and set the dropdown to **Enforce rules**.
Now **Apply** and **OK**.

All done.  If you're not confident following these instructions the internet
has many more, but there should be enough search ters to
