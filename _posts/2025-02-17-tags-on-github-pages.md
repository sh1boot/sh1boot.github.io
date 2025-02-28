---
last_modified_at: Fri, 28 Feb 2025 10:15:55 -0800  # a589ac9 clarity-on-github-pages-tags
layout: post
title: Using tags on Github Pages
tags: github-pages tags jekyll
---
Suppose you want to include a list of tags to the top of each post, and
you want those tags to link to a page which lists all posts which
include that tag.  There are plugins but none available on [GitHub
Pages][][^1], so here's my workaround.

First of all, I do not have any solution for automatically creating tag
pages as they're referenced.  I'm not sure that's possible at all, but a
shell script can trivially fill that gap.  Once you accept that
limitation the rest is fairly easy.

In my searches I found a handful of different blog posts documenting the
same thing, and I think they all track back to [this solution][a
solution], which was posted on [StackOverflow][a so solution].  I do
things a little differently.

You'll need a `/_layouts/tagpage.html` file with something like this in
it:

{% raw %}
```liquid
---
layout: default
---
{%- assign page_slug = page.name | remove: '.md' -%}
<h1>Posts tagged "{{page_slug}}"</h1>

{{ content }}

{%- assign tagged = site.posts | where_exp: "item", "item.tags contains page_slug" -%}
<ul>
  {%- for post in tagged -%}
  <li><h3><a href="{{ post.url | relative_url }}">
      {{- post.title | escape -}}
  </a></h3></li>
  {%- endfor -%}
</ul>
```
{% endraw %}

You'll probably want to take most of the content from another layouts
file in order to get all the proper CSS markup and formatting.

Ideally we would use `page.slug` directly, but it doesn't seem to be
available in the Github's [version][Pages dependencies] of Jekyll, so we
make our own.

With that layouts page in place, you can have that layout applied
automatically to files in `/tags/` by adding the following to
`/_config.yml`:

```yaml
defaults:
  -
    scope:
      path: "tags"
    values:
      layout: tagpage
```

At this point all you need is an empty file in `/tags/` and the list of
posts with a tag matching its filename will be created automatically.

I'll leave it up to your imagination how you script a solution to create
empty files for newly-referenced tags.

It doesn't have to be an empty file, though.  You can add front matter
and additional content for the tag page as well.  The body of this file
gets inserted where `{%raw%}{{ content }}{%endraw%}` appears in the
`_layout` file.

For example, in my generation loop for tags pages I [recurse one
layer](#recursive-tag-lists) into the other tags pages and check to see
if they're tagged with the tag I'm rendering.  I can tag `number-theory`
with `mathematics`, so that tagging something `number-theory` causes it
to also appear under `mathematics`.  I also allow some tags to be marked
`hidden` so that they're not listed on the pages which use them.

Which brings us to the other thing promised.  A header on each post
saying which tags it includes.

Somewhere in `/_layouts/post.html`, where you want the list of tags to
appear, insert:

{% raw %}
```liquid
{%- if page.tags.size > 0 -%}
  Page tags: {% include tag_list.html %}
{%- endif -%}
```
{% endraw %}

I made this calls out to another file because I use the same loop in a
couple of places.  Now, in `/_includes/tag_list.html`:

{% raw %}
```liquid
{%- assign tag_pages = site.pages | where: "layout", "tagpage" -%}
{%- assign separator = '' -%}
{%- for tag in page.tags -%}
  {%- assign tag_page_name = tag | append ".md" -%}
  {%- assign tag_page = tag_pages | where_exp: "item", "item.name == tag_page_name" | first -%}
  {%- unless tag_page.hidden -%}
    {{- separator -}}
    {%- if tag_page.url -%}
      <a href="{{tag_page.url | relative_url}}">{{tag_page.display_name | default: tag}}</a>
    {%- else -%}
      {{tag}}
    {%- endif -%}
    {%- assign separator = ', ' -%}
  {%- endunless -%}
{%- endfor -%}
```
{% endraw %}

Again, we would prefer a test for `item.slug == tag` but that's not
necessarily available.

Note that I'm inserting `separator` and then changing it to a non-empty
value only after emitting something because other logic may mean that
the last tag in the for loop is not the last tag to be visible.  Small
wart, here: it's possible that this causes the whole list to be empty,
so the logic in the `_layouts` file may misfire.  I'm too lazy to fix
this.

Here I make reference to front-matter variables called `hidden` and
`display_name`.  The former skips over generating output if the tag is
marked hidden (if front matter includes `hidden: true`), and the latter
replaces the tag name with a potentially more presentable display name;
for example if it needs a space in it, or other problematic characters.

I also check `tag_page.url` to make sure it has one.  If it doesn't then
the tag page probably hasn't been created.  This could just hide the
tag until you create the tag page manually, but I just showed the tag
with no link.

The other thing you might want is a master index of tags.  I haven't
bothered, myself, but there's one in that StackOverflow link, above.

## Recursive tag lists

To include other tag pages on a tag page, one can add `tags: foo bar` to
a tag page itself, and in the `_layouts/tagpage.html` extend the search
list from `site.posts` to `site.pages` concatenated with
`site.pages | where: "layout", "tagpage"`.  This will create an entry
for those tag pages alongside the posts.

The next step is (if you want to) to recurse into those sub-tags and
list the additional posts which match.  Remembering to avoid duplicate
listings.  My approach to this was to make a dedicated
`_include/tagpage_excerpt.html` file, which behaved similarly to
`_layouts/tagpage.html` but using a more terse layout.

TODO: more code


[^1]: Maybe you can set up your own automation with more plugins available?
[GitHub Pages]: <https://pages.github.com/>
[Pages dependencies]: <https://pages.github.com/versions/>
[a solution]: <https://christianspecht.de/2014/10/25/separate-pages-per-tag-category-with-jekyll-without-plugins/>
[a so solution]: <https://stackoverflow.com/a/21002505/2417578>
