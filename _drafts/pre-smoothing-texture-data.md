---
layout: post
title: Smoothing textures to avoid aliasing
---
Sometimes you need to sample a texture at below its native resolution, which exposed you to aliasing problems.  One solution is to suppression the unit texture and apply smoothing to filter or the aliasing; but in some cases pre-smoothing the source texture can be more efficient.  Especially if you're willing to invest custom hardware in the pipeline...