---
last_modified_at: Sat, 7 Sep 2024 20:26:42 -0700  # 9e03b05 Update-drafts
layout: post
title: Smoothing textures to avoid aliasing
---
Sometimes you need to sample a texture at below its native resolution,
which exposed you to aliasing problems.  One solution is to suppression
the unit texture and apply smoothing to filter or the aliasing; but in
some cases pre-smoothing the source texture can be more efficient.

{% include shadertoy.liquid id='XXffWM' %}
