import argparse
from datetime import datetime
import json
import requests
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser()
parser.add_argument('--key')
parser.add_argument('--host')
parser.add_argument('--sitemap')
parser.add_argument('-n', '--no-op', action='store_true')
parser.add_argument('--since', type=datetime.fromisoformat)
args = parser.parse_args()


req = {
    "host": args.host,
    "key": args.key,
    "keylocation": f"https://{args.host}/{args.key}.txt",
    "urllist": []
}


if args.key:
    resp = requests.get(req['keylocation'])
    assert args.key != resp.content.strip()
    print("key is valid")

if args.sitemap:
    resp = requests.get(args.sitemap)
    root = ET.fromstring(resp.content)
    for e in root.iter():
        if e.tag.startswith('{'):
            _, e.tag = e.tag.split('}', 1)
        for a in list(e.attrib.keys()):
            if a.startswith('{'):
                _, new_attr = a.split('}', 1)
                e.attrib[new_attr] = e.attrib.pop(a)

    for e in root:
        url = e.find('loc').text
        date = e.find('lastmod')
        if date is not None:
            date = datetime.fromisoformat(date.text)
            if args.since is None or date > args.since:
                req['urllist'].append(url)
            else:
                print(f"too old: {date}, {url=}")


if args.no_op:
    print(json.dumps(req, indent=2))
else:
    response = requests.post('https://api.indexnow.org/IndexNow', json=req)
    print(response.status_code)
    print(response.content)
