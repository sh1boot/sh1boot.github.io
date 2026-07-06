header="last_modified_at:"
for file in "$@"; do
	value="$(TZ=UTC git log --grep 'lastmod' --invert-grep -1 --date=iso-local --format="%cd # %h %f" "$file")"
	sed -i -e "/---/,/---/{/^$header/d}" -e "1a $header $value" "$file"
	git diff --exit-code "$file" && echo "No change to $file"
done
