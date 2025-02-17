---
layout: post
title: Using tags on Github Pages
tags: jekyll tags github-pages needs-examples
---
First of all, I do not have any solution for automatically creating tag
pages automatically when they're referenced.  I'm not sure there's any
solution to that at all, but a shell script can trivially fill that gap.
Once you accept that limitation the rest is fairly easy.

Suppose you want to include a list of tags to the top of each post, and
you want those tags to link to a page which lists all posts which
include that tag.

In my searches I found a handful of different blog posts documenting the
same thing, and I think they all track back to [this solution][a
solution], which was posted on [StackOverflow][a so solution].

You'll need a `/_layouts/tagpage.html` file with something like this in
it:

{% raw %}
```liquid
---
layout: default
---
<h1>Posts tagged "{{page.tag}}"</h1>

{{ content }}

{%- assign tagged = site.posts | where_exp: "item", "item.tags contains page.tag" -%}
<ul>
  {%- for post in tagged -%}
  <li><h3><a href="{{ post.url | relative_url }}">
      {{- post.title | escape -}}
  </a></h3></li>
  {%- endfor -%}
</ul>
```
{% endraw %}

Except probably more sophisticated.  I lifted most of the content of
mine from the layout for minima's home page.

Then for each tag which you might use, you need a file in `/tags/`:

```yaml
---
layout: tagpage
tag: example-tag
---
```

(the `tag: ` line should match the filename, but without the `.md`
extension)

After the front matter one could include additional information relating to
that tag.  Or whatever.  Or nothing at all.  That's what gets inserted
where `{%raw%}{{ content }}{%endraw%}` appears in the `_layout` file.

If you're motivated you could simplify that stub slightly by moving the
`layout: tagpage` line into `/_config.yml`:

```yaml
defaults:
  -
    scope:
      path: "tags"
    values:
      layout: tagpage
```

With the stub in place the layout file will take care of the
auto-generation of the list of matching posts.  I'm sure you can imagine
how you would script the automatic generation of the stub files.

You can also put more information in the front matter for the tags,
which can then be reflected back into the pages which use those tags.

For example, in my generation loop for tags pages I [recurse one
layer](#recursive-tag-lists) into the other tags pages and check to see
if they're tagged with the tag I'm rendering.  I can tag `number-theory`
with `mathematics`, so that tagging something `number-theory` causes it
to appear under `mathematics` tag as well.  I also allow some tags to be
marked `hidden` so that they're not listed on the page that uses them.

Which brings us to the other thing promised.  A header on each
post saying which tags it includes.  Somewhere in `/_layouts/post.html`,
where it's a good place to inject the list of tags, insert:

{% raw %}
```liquid
{%- if page.tags.size > 0 -%}
  [ {% include tag_list.html %} ]
{%- endif -%}
```
{% endraw %}

I call out to another file because I use the same loop in a couple of
places, so in `/_includes/tag_list.html`:

{% raw %}
```liquid
{%- assign tag_pages = site.pages | where: "layout", "tagpage" -%}
{%- assign separator = '' -%}
{%- for tagname in page.tags -%}
  {%- assign tag_page = tag_pages | where_exp: "item", "item.tag == tagname" | first -%}
  {%- unless tag_page.hidden -%}
    {{- separator -}}
    {%- if tag_page.url -%}
      <a href="{{tag_page.url | relative_url}}">{{tag_page.display_name | default: tagname}}</a>
    {%- else -%}
      {{tagname}}
    {%- endif -%}
    {%- assign separator = ' | ' -%}
  {%- endunless -%}
{%- endfor -%}
```
{% endraw %}

Here I make reference to front-matter variables called `hidden` and
`display_name`.  The former skips over generating output if the tag is
marked hidden (if front matter includes `hidden: true`), and the latter
replaces the tag name with a potentially more presentable display name;
for example if it needs a space in it, or other problematic characters.

I also check `tag_page.url` to make sure it has one.  If it doesn't then
the tag page probably hasn't been created.  This could be treated the
same way as hidden, but I just render the text with no link.

The other thing you might want is a master index of tags.  I haven't
bothered, myself, but there's one in that StackOverflow link, above.

## Recursive tag lists

TODO: elaborate


[a solution]: <https://christianspecht.de/2014/10/25/separate-pages-per-tag-category-with-jekyll-without-plugins/>
[a so solution]: <https://stackoverflow.com/a/21002505/2417578>
