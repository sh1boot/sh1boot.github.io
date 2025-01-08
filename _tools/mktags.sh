#!/bin/sh
for tag in $(sed -ne 's/^tags: \(.*\)/\1/; T; s/ /\n/gp' **/*.md | tr ' ' '\n' | sort | uniq -d); do
  tagfile="tags/$tag.md"
  [ -f "$tagfile" ] || (echo "creating $tagfile"; cat > "$tagfile" << EOF
---
layout: tagpage
tag: $tag
excerpt: All posts tagged "$tag"
---
EOF
)
done
echo -n 'Ignoring single-use tags: '
sed -ne 's/^tags: \(.*\)/\1/; T; s/ /\n/gp' **/*.md | tr ' ' '\n' | sort | uniq -u | tr '\n' ' '
echo
