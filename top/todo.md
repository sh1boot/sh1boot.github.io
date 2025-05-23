---
layout: page
title: TODO
catogeries: index
sitemap: false
---
Things I think about occasionally but will probably never find time for.

Actually this whole site is dedicated to ideas I'll never find time to
follow up on.  I don't know why I think I need a dedicated page.  But
here it is anyway.

{% assign todo = site.pages | where_exp: "item", "item.dir contains '/todo/'" -%}
{%- for item in todo -%}
  {%- if item.title -%}
    {%- if item.path != page.path -%}
* [{{item.title | escape}}]({{item.url | relative_url}})
{{''}}
    {%- endif -%}
  {%- endif -%}
{%- endfor %}
