---
layout: page
title: Some less-than-half-baked thoughts
sitemap: false
---
{%- assign drafts = site.pages | where_exp: "item", "item.dir contains '/drafts/'" -%}
{%- for item in drafts -%}
  {%- if item.title -%}
    {%- if item.path != page.path -%}
* [{{item.title | escape}}]({{item.url | relative_url}})
{{''}}
    {%- endif -%}
  {%- endif -%}
{%- endfor %}
