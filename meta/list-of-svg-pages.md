---
layout: page
title: Pages using the SVG header
tags: hidden-tags, svg
categories: index
sitemap: false
---
{%- assign posts = site.posts | concat: site.pages | where_exp: "item", "item.svg" -%}
{%- for post in posts -%}
  {%- capture post_title -%}
      {%- if post.title -%}
      {{ post.title }}
      {%- else -%}
      {{ post.name | remove: ".md" -}}
      {%- endif -%}
  {%- endcapture -%}
* [{{post_title | escape}}]({{post.url | relative_url}})
{{''}}
{%- endfor -%}
