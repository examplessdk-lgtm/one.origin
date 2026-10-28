import test from 'node:test';
import assert from 'node:assert/strict';
import { agentResponse, prefersMarkdown, varyAccept } from '../src/lib/agent-http.js';
import { applicationSchema, site } from '../src/lib/site-content.js';

const request = (path = '/', accept = 'text/html', method = 'GET') => new Request(`https://os.1origin.dev${path}`, { method, headers: { accept } });
const html = () => new Response('<html><body>Existing HTML</body></html>', { headers: { 'content-type': 'text/html', vary: 'Origin' } });

test('negotiation respects quality, specificity, case, exclusions, and wildcard defaults', () => {
  for (const a of ['text/markdown', 'text/markdown; charset=utf-8', 'TEXT/MARKDOWN', 'text/html;q=0.2, text/markdown;q=0.9', 'text/*;q=0.5, text/markdown;q=1']) assert.equal(prefersMarkdown(a), true, a);
  for (const a of [null, '', '*/*', 'text/plain', 'text/html', 'text/markdown;q=0', 'text/markdown;q=0, */*;q=1', 'text/html, text/markdown;q=0.5', 'text/markdown-invalid']) assert.equal(prefersMarkdown(a), false, a);
});

test('homepage Markdown is served on canonical URL with correct type, body, status, Vary and no side effects', async () => {
  const r = await agentResponse(request('/', 'text/markdown'), () => assert.fail('must not invoke app or auth'));
  assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /^text\/markdown;/);
  assert.equal(r.headers.get('vary'), 'Accept'); assert.equal(r.headers.get('cache-control'), 'no-store');
  const body = await r.text(); assert.ok(body.length > 500); assert.match(body, /^# ONEORIGIN/); assert.match(body, /scripted demonstration/);
});

test('HTML remains HTML and existing Vary and status are preserved', async () => {
  const r = await agentResponse(request(), html);
  assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /text\/html/);
  assert.equal(r.headers.get('vary'), 'Origin, Accept'); assert.match(await r.text(), /Existing HTML/);
});

test('Markdown 404 keeps 404, adds explanatory Markdown and recovery links, and does not reflect input', async () => {
  const r = await agentResponse(request('/missing?secret=do-not-reflect', 'text/markdown'), () => new Response('missing', { status: 404 }));
  assert.equal(r.status, 404); assert.match(r.headers.get('content-type'), /text\/markdown/); assert.equal(r.headers.get('vary'), 'Accept');
  const body = await r.text(); assert.ok(body.length > 20); assert.match(body, /Page not found/); assert.match(body, /https:\/\/os.1origin.dev\/llms.txt/); assert.doesNotMatch(body, /do-not-reflect/);
});

test('HTML 404 stays HTML; TanStack middleware result context survives', async () => {
  const r = await agentResponse(request('/missing'), () => ({ response: new Response('<h1>404</h1>', { status: 404, headers: { 'content-type': 'text/html' } }), context: { preserved: true } }));
  assert.equal(r.context.preserved, true); assert.equal(r.response.status, 404); assert.match(await r.response.text(), /404/);
});

test('APIs, server functions, POSTs, redirects, auth failures, and ordinary routes remain unchanged', async () => {
  const response = new Response('unchanged', { status: 401 });
  for (const [path, method, kind] of [['/api/time','GET','router'], ['/','POST','router'], ['/','GET','serverFn'], ['/hosting','GET','router'], ['/_server/test','GET','router']]) {
    assert.equal(await agentResponse(request(path, 'text/markdown', method), () => response, kind), response);
  }
  const redirect = new Response(null, { status: 302, headers: { location: '/login' } });
  assert.equal(await agentResponse(request('/workspace', 'text/markdown'), () => redirect), redirect);
});

test('HEAD returns headers without body for negotiated and machine resources', async () => {
  for (const path of ['/', '/missing', '/index.md', '/llms.txt', '/sitemap.xml', '/robots.txt']) {
    const r = await agentResponse(request(path, 'text/markdown', 'HEAD'), () => new Response('missing', { status: 404 }));
    assert.equal(await r.text(), ''); assert.equal(r.status, path === '/missing' ? 404 : 200);
  }
});

test('machine-readable resources have correct MIME types, links, and syntax', async () => {
  const expected = { '/index.md': 'text/markdown', '/llms.txt': 'text/plain', '/robots.txt': 'text/plain', '/sitemap.xml': 'application/xml' };
  for (const [path, type] of Object.entries(expected)) {
    const r = await agentResponse(request(path), () => assert.fail('must serve resource'));
    assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), new RegExp('^' + type));
    const body = await r.text(); assert.ok(body.length > 20);
    if (path === '/llms.txt') { assert.match(body, /^# ONEORIGIN\n\n> /); assert.match(body, /\[Product overview\]\(https:\/\/os.1origin.dev\/index.md\)/); }
    if (path === '/sitemap.xml') { assert.match(body, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/); assert.equal((body.match(/<loc>/g) || []).length, 4); assert.doesNotMatch(body, /workspace|callback|login/); }
    if (path === '/robots.txt') assert.match(body, /Sitemap: https:\/\/os.1origin.dev\/sitemap.xml/);
  }
});

test('Vary merging is case insensitive and preserves wildcard', () => {
  for (const v of ['accept, Origin', '*']) { const h = new Headers({ vary: v }); varyAccept(h); assert.equal(h.get('vary'), v); }
});

test('SoftwareApplication identity is accurate and has no invented offers or reviews', () => {
  assert.equal(applicationSchema['@context'], 'https://schema.org'); assert.equal(applicationSchema['@type'], 'SoftwareApplication');
  assert.equal(applicationSchema.name, 'ONEORIGIN'); assert.equal(applicationSchema.url, 'https://os.1origin.dev/');
  assert.equal(applicationSchema.applicationCategory, 'DeveloperApplication'); assert.ok(applicationSchema.description.length > 100);
  assert.match(site.title, /^ONEORIGIN.*Developer workspace/); assert.equal(applicationSchema.offers, undefined); assert.equal(applicationSchema.aggregateRating, undefined);
});


test('unmatched routes return Markdown 404 before the HTML-only renderer; matched routes are not invented as 404', async () => {
  const r = await agentResponse(request('/missing', 'text/markdown'), () => assert.fail('HTML renderer rejects Markdown'), 'router', () => true);
  assert.equal(r.status, 404); assert.match(r.headers.get('content-type'), /text\/markdown/);
  const original = new Response('HTML-only route', { status: 406 });
  assert.equal(await agentResponse(request('/Agent', 'text/markdown'), () => original, 'router', () => false), original);
});
