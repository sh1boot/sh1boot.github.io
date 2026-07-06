for file in "$@"; do
	header="$(TZ=UTC git log --grep 'lastmod' --invert-grep -1 --date=iso-local --format="last_modified_at: %cd # %h %f" "$file")"
	sed -i -e '/---/,/---/{/^last_modified_at:/d}' -e "1a $header" "$file"
	git diff --exit-code "$file" && echo "No change to $file"
done
