#!/bin/env python3
import argparse
import json
import re
import sys

DEBUG = False

def eprint(*args, **kwargs):
  print(*args, **kwargs, file=sys.stderr)

def dprint(*args, **kwargs):
  if DEBUG:
    eprint(*args, **kwargs)

MDLINK = re.compile(r'[<(](https://[^<>()]*)[>)]')

def ingest(files, pattern, repl, excludes):
  result = {}
  for filename in files:
    with open(filename, 'rt', encoding='utf-8') as f:
      src_url = pattern.sub(repl, filename)
      dprint(f'source: {src_url}')
      for dst_url in map(lambda x: x.group(1), MDLINK.finditer(f.read())):
        if any(excl.search(dst_url) for excl in excludes):
          continue
        dprint(f'  -> {dst_url}')
        result.setdefault(dst_url, set()).add(src_url)
  return result

def write_links(output, links):
  tmp = {}
  for k, v in links.items():
    assert isinstance(v, set)
    tmp[k] = list(v)
  json.dump(tmp, output, indent=2)

def main(files, *, output, pattern, repl, exclude, debug):
  global DEBUG
  DEBUG = debug

  links = ingest(files, pattern, repl, exclude)
  write_links(output if output else sys.stdout, links)
  if output: output.close()
  return 0

if __name__ == '__main__':
  parser = argparse.ArgumentParser()
  parser.add_argument('files', nargs='*')
  parser.add_argument('--debug', action='store_true', default=False)
  parser.add_argument('--exclude', action='append', type=re.compile, default=[])
  parser.add_argument('--pattern', type=re.compile,
      default=re.compile(r'(_posts/\d\d\d\d-\d\d-\d\d-)?(?P<name>.*).md'))
  parser.add_argument('--repl', default=r'https://www.example.com/\g<name>')
  parser.add_argument('--output', type=argparse.FileType('wt', encoding='utf-8'))
  main(**vars(parser.parse_args()))
