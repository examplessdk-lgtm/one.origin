"""Verify real HTTP responses, including raw HTML; no JavaScript execution required."""
import concurrent.futures
import json
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

origin = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'https://os.1origin.dev'

class Document(HTMLParser):
    def __init__(self):
        super().__init__(); self.hidden = 0; self.text = []; self.headings = []; self.schemas = []; self.schema = None; self.canonical = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('script', 'style'): self.hidden += 1
        if re.fullmatch(r'h[1-6]', tag): self.headings.append(int(tag[1]))
        if tag == 'script' and a.get('type') == 'application/ld+json': self.schema = ''
        if tag == 'link' and a.get('rel') == 'canonical': self.canonical = a.get('href')
    def handle_endtag(self, tag):
        if tag == 'script' and self.schema is not None: self.schemas.append(json.loads(self.schema)); self.schema = None
        if tag in ('script', 'style'): self.hidden -= 1
    def handle_data(self, data):
        if self.schema is not None: self.schema += data
        if not self.hidden: self.text.append(data)

def fetch(path, accept='text/html', method='GET'):
    req = urllib.request.Request(origin + path, headers={'Accept': accept}, method=method)
    try: response = urllib.request.urlopen(req, timeout=30)
    except urllib.error.HTTPError as error: response = error
    with response: return response.status, response.headers, response.read().decode('utf-8')

def check(case):
    path, accept, method, expected, mime = case
    status, headers, body = fetch(path, accept, method)
    assert status == expected, (path, accept, status, expected)
    assert headers.get_content_type() == mime, (path, accept, headers.get_content_type(), mime)
    if path == '/' or expected == 404:
        assert 'accept' in [v.strip().lower() for v in headers.get('Vary', '').split(',')], (path, 'missing Vary: Accept')
    if method == 'HEAD': assert body == ''
    elif path == '/' and mime == 'text/html':
        doc = Document(); doc.feed(body)
        text = ' '.join(' '.join(doc.text).split())
        assert len(text) >= 500, ('HTML text length', len(text))
        assert '<noscript>' in body and '[data-home-reveal]' in body
        assert doc.headings.count(1) == 1, doc.headings
        assert doc.headings[0] == 1
        assert all(b <= a + 1 for a, b in zip(doc.headings, doc.headings[1:])), doc.headings
        assert doc.canonical == 'https://os.1origin.dev/'
        app = next(s for s in doc.schemas if s.get('@type') == 'SoftwareApplication')
        assert app['name'] == 'ONEORIGIN' and app['url'] == 'https://os.1origin.dev/'
        assert app['description'] and app['applicationCategory'] == 'DeveloperApplication'
        assert 'ONEORIGIN — Developer workspace' in body
        print(f'Raw HTML: {len(text)} text characters; sequential headings; valid JSON-LD and canonical')
    elif mime == 'text/markdown':
        assert len(body) >= (500 if path in ('/', '/index.md') else 20)
        assert body.startswith('# ')
        if expected == 404: assert '/llms.txt' in body and 'not found' in body
    elif path == '/sitemap.xml':
        root = ET.fromstring(body); ns = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
        urls = [e.text for e in root.findall(f'{ns}url/{ns}loc')]
        assert urls == ['https://os.1origin.dev' + p for p in ['/', '/Agent', '/about', '/hosting']], urls
    elif path == '/llms.txt': assert body.startswith('# ONEORIGIN\n\n> ') and '/index.md' in body
    elif path == '/robots.txt': assert 'Sitemap: https://os.1origin.dev/sitemap.xml' in body
    elif path == '/api/time': assert 'now' in json.loads(body)
    return f'{method} {path} [{accept}] → {status} {mime}'

cases = [
    ('/', 'text/html', 'GET', 200, 'text/html'),
    ('/', 'text/markdown', 'GET', 200, 'text/markdown'),
    ('/', 'text/html;q=0.2, text/markdown;q=0.9', 'GET', 200, 'text/markdown'),
    ('/', 'text/markdown;q=0, text/html', 'GET', 200, 'text/html'),
    ('/', '*/*', 'GET', 200, 'text/html'),
    ('/__ora-404-probe-k6poyu7n', 'text/markdown', 'GET', 404, 'text/markdown'),
    ('/__ora-404-probe-k6poyu7n', 'text/html', 'GET', 404, 'text/html'),
    ('/', 'text/markdown', 'HEAD', 200, 'text/markdown'),
    ('/__ora-404-probe-k6poyu7n', 'text/markdown', 'HEAD', 404, 'text/markdown'),
    ('/index.md', 'text/html', 'GET', 200, 'text/markdown'),
    ('/llms.txt', 'text/html', 'GET', 200, 'text/plain'),
    ('/robots.txt', 'text/html', 'GET', 200, 'text/plain'),
    ('/sitemap.xml', 'text/html', 'GET', 200, 'application/xml'),
    ('/Agent', 'text/html', 'GET', 200, 'text/html'),
    ('/about', 'text/html', 'GET', 200, 'text/html'),
    ('/hosting', 'text/html', 'GET', 200, 'text/html'),
    ('/api/time', 'text/markdown', 'GET', 200, 'application/json'),
]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for result in pool.map(check, cases): print(result)
print(f'PASS: {len(cases)} HTTP checks against {origin}')
