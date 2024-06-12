#!/bin/env python3
import argparse
import json
import os
import re
import sys
from time import time
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlencode
from urllib.request import urlopen, Request

USER_AGENT = 'webmention-notifier.py'

WEBMENTION_HEADER = re.compile(
        r'<([^>]*)>\s*;\s*rel\s*=\s*[\'"]?[wW]eb[mM]ention\b')
WEBMENTION_LINK = re.compile(
        r'<(a|link)\b[^>]*\brel\s*=\s*'
        r'("[\w ]*\b[wW]eb[mM]ention\b[\w ]*"'
        r"|'[\w ]*\b[wW]eb[mM]ention\b[\w ]*')[^>]*>")
PINGBACK_LINK = re.compile(
        r'<(a|link)\b[^>]*\brel\s*=\s*'
        r'("[\w ]*\b[pP]ing[bB]ack\b[\w ]*"'
        r"|'[\w ]*\b[pP]ing[bB]ack\b[\w ]*')[^>]*>")
HTMLHREF = re.compile(
        r'href\s*=\s*.((?<=")[^"]*(?=")|' + r"(?<=')[^']*(?='))")
HTMLCOMMENT = re.compile(r'<!--.*?-->')

DEBUG = False

def eprint(*args, **kwargs):
  print(*args, **kwargs, file=sys.stderr)

def dprint(*args, **kwargs):
  if DEBUG:
    eprint(*args, **kwargs)

def sanity_check(check, ctx='body'):
  max_print = 128
  if DEBUG:
    if 'webmention' in check:
      dprint(f'May have overlooked webmention endpoint in {ctx}: {check[:max_print]}')
    if 'pingback' in check:
      dprint(f'May have overlooked pingback endpoint in {ctx}: {check[:max_print]}')
    if 'xmlns:trackback' in check:
      dprint(f'May have overlooked trackback endpoint in {ctx}: {check[:max_print]}')

def find_endpoints(url, max_read=65536):
  dprint(f'checking {url}')
  req = Request(url, data=None,
      headers={ 'User-Agent': USER_AGENT })
  try:
    f = urlopen(req)
  except HTTPError as error:
    eprint(f'HTTP status {error.status} {error.reason}, while fetching: {url}')
    return (None, None)
  except URLError as error:
    eprint(f'URL error {error.reason}, while fetching: {url}')
    return (None, None)

  webmention = None
  pingback = None
  with f:
    if not webmention:
      for link in f.headers.get_all('link', []):
        if href := WEBMENTION_HEADER.search(link):
          webmention = urljoin(f.url, href.group(1))
          break
    if not pingback:
      for link in f.headers.get_all('x-pingback', []):
        pingback = urljoin(f.url, link)
        break
    if not (webmention or pingback):
      sanity_check(str(f.headers).lower(), 'header')

    body = f.read(max_read).decode(errors='replace')
    body_nc = HTMLCOMMENT.sub('', body)
    if not webmention:
      for link in map(lambda x: x.group(0), WEBMENTION_LINK.finditer(body_nc)):
        if href := HTMLHREF.search(link):
          webmention = urljoin(f.url, href.group(1))
          break
    if not pingback:
      for link in map(lambda x: x.group(0), PINGBACK_LINK.finditer(body_nc)):
        if href := HTMLHREF.search(link):
          pingback = urljoin(f.url, href.group(1))
          break

    if not (webmention or pingback):
      sanity_check(body.lower())
  return (webmention, pingback)

MDLINK = re.compile(r'(?<=[<(])https://[^<>()]*(?=[>)])')

def post(endpoint, data, content_type='application/x-www-form-urlencoded'):
  max_read = 4096
  def problem(status, reason, obj=None):
    eprint(f'Problem notifying {endpoint}')
    eprint('HTTP error:', status, reason)
    if DEBUG and obj:
      dprint('HTTP headers:', obj.headers, sep='\n')
      dprint('HTTP response:',
          obj.read(max_read).decode(errors='replace').strip())
    return False

  req = Request(endpoint, method='POST', data=data, headers={
      'Content-Type': content_type,
      'User-Agent': USER_AGENT })
  try:
    r = urlopen(req)
  except HTTPError as error:
    return problem(error.status, error.reason, error)
  except URLError as error:
    return problem(-1, error.reason)
  except TimeoutError:
    return problem(-1, 'request timed out')

  with r:
    if 200 <= r.status and r.status < 300:
      return True
  return problem(r.status, r.reason, r)

def send_pingback(src_url, dst_url, endpoint):
  data = f'''<?xml version="1.0" encoding="utf-8"?>
  <methodCall><methodName>pingback.ping</methodName>
  <params>
    <param><value><string>{src_url}</string></value></param>
    <param><value><string>{dst_url}</string></value></param>
  </params>
  </methodCall>'''.encode('utf-8')
  return post(endpoint, data, content_type='text/xml')

def send_webmention(src_url, dst_url, endpoint):
  data = urlencode({'source': src_url, 'target': dst_url}).encode('ascii')
  return post(endpoint, data)

def load_state(filename):
  if filename:
    try:
      with open(filename, 'rt', encoding='utf-8') as f:
        state = json.load(f)
      for k, v in state.items():
        for w in ('webmentioned', 'pingedback'):
          if w in v: v[w] = set(v[w])
        state[k] = v
    except FileNotFoundError:
      state = {}
  else:
    state = {}
  return state

def save_state(filename, state):
  if filename:
    tmp = {}
    for k, v in state.items():
      for w in ('webmentioned', 'pingedback'):
        if w in v: v[w] = list(v[w])
      tmp[k] = v
    tmpname = filename + '.tmp'
    with open(tmpname, 'wt', encoding='utf-8') as f:
      json.dump(tmp, f, sort_keys=True, indent=2)
    os.replace(tmpname, filename)

def read_links(links_file):
  links = json.load(links_file)
  for k, v in links.items():
    assert isinstance(v, list)
    links[k] = set(v)
  return links

def main(links_file, *, state_filename, debug, sleep):
  global DEBUG
  DEBUG = debug

  current_time = time()
  state = load_state(state_filename)

  for dst_url, src_urls in read_links(links_file).items():
    dst_state = state.setdefault(dst_url, {})
    webmentioned = dst_state.setdefault('webmentioned', set())
    pingedback = dst_state.setdefault('pingedback', set())
    src_urls = src_urls - (pingedback & webmentioned)
    if not src_urls:
      dprint(f'no new files refer to {dst_url}')
      continue
    if current_time < dst_state.get('checked', 0) + sleep:
      print(f'too soon to revisit {dst_url}')
      continue
    wm_endpoint, pb_endpoint = find_endpoints(dst_url)
    dst_state['checked'] = current_time
    for src_url in src_urls:
      if wm_endpoint and src_url not in webmentioned:
        if send_webmention(src_url, dst_url, endpoint=wm_endpoint):
          print(f'WebMentioned {src_url} -> {dst_url}')
          webmentioned.add(src_url)
        else:
          eprint(f'WebMention notification failed for {src_url} -> {dst_url}')
      if pb_endpoint and src_url not in pingedback:
        if send_pingback(src_url, dst_url, endpoint=pb_endpoint):
          print(f'PingedBack {src_url} -> {dst_url}')
          pingedback.add(src_url)
        else:
          eprint(f'Pingback notification failed for {src_url} -> {dst_url}')

  if links_file:
    links_file.close()

  save_state(state_filename, state)
  return 0

if __name__ == '__main__':
  parser = argparse.ArgumentParser()
  parser.add_argument('links_file', type=argparse.FileType('rt', encoding='utf-8'))
  parser.add_argument('--debug', action='store_true', default=False)
  parser.add_argument('--sleep', type=int, default=86400)
  parser.add_argument('--state', type=str, dest='state_filename')
  main(**vars(parser.parse_args()))
