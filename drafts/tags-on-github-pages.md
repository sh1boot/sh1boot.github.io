---
layout: post
title: Using tags on Github Pages
tags: needs-examples
---
First of all, I do not have any solution for automatically creating tag
pages automatically when they're referenced.  I'm not sure there's any
solution to that, but it's a trivial shell script to scan the sources
and do that periodically.

After abandoning that problem, the rest is fairly straightforward.

I went a step further and allowed tag pages themselves to use other
tags, so that I could recurse one layer; so that `number-theory` is
listed under `mathematics`, so if I was overly specific in tagging then
I still get some hint by looking under the broader label.

Etc...
