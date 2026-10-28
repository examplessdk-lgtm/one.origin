/* eslint-disable @typescript-eslint/no-require-imports -- Tests exercise the CommonJS Lambda entrypoint. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync, verify } = require('node:crypto');
const { createHandler } = require('./github-app.cjs');

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const secret = { appId: '5493532', clientId: 'app-client', installationId: '175778744',
  privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
const commit = 'a'.repeat(40);
const tree = 'b'.repeat(40);
const blob = 'c'.repeat(40);
function event(path = '/github/import', query = { repository: 'examplessdk-lgtm/1origin' }, claims) {
  return { rawPath: path, queryStringParameters: query, requestContext: {
    http: { method: 'GET' }, authorizer: { jwt: { claims: claims ?? {
      sub: 'owner', token_use: 'access', 'cognito:groups': '[origin-operators]',
    } } },
  } };
}
function fixture(overrides = {}) {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    const path = new URL(url).pathname;
    if (path.endsWith('/access_tokens')) {
      const jwt = options.headers.Authorization.slice(7).split('.');
      assert.equal(verify('RSA-SHA256', Buffer.from(jwt.slice(0, 2).join('.')), publicKey, Buffer.from(jwt[2], 'base64url')), true);
      assert.deepEqual(JSON.parse(options.body), { repositories: ['1origin'], permissions: { contents: 'read' } });
      return Response.json({ token: 'installation-token-private', expires_at: '2099-01-01T00:00:00Z' });
    }
    if (path === '/repos/examplessdk-lgtm/1origin') return Response.json({ id: 1430999820,
      full_name: 'examplessdk-lgtm/1origin', default_branch: 'main', private: true });
    if (path.includes('/git/commits/')) return Response.json({ sha: commit, tree: { sha: tree } });
    if (path.includes('/commits/')) return Response.json({ sha: commit, commit: { tree: { sha: tree } } });
    if (path.includes('/git/trees/')) return Response.json({ truncated: false, tree: [
      { path: 'README.md', sha: blob, size: 12, type: 'blob', mode: '100644' },
      { path: '.env', sha: blob, size: 12, type: 'blob', mode: '100644' },
      { path: '.env.production', sha: blob, size: 12, type: 'blob', mode: '100644' },
      { path: '.env.example', sha: blob, size: 12, type: 'blob', mode: '100644' },
      { path: 'link.ts', sha: blob, size: 12, type: 'blob', mode: '120000' },
      { path: 'huge.ts', sha: blob, size: 300000, type: 'blob', mode: '100644' },
    ], ...overrides.tree });
    if (path.includes('/git/blobs/')) return Response.json({ type: 'file', sha: blob,
      size: 12, encoding: 'base64', content: Buffer.from('hello origin').toString('base64'), ...overrides.file });
    throw Error('Unexpected GitHub request');
  };
  const handler = createHandler({ getSecret: async () => secret,
    fetcher: overrides.fetcher ?? fetcher,
    allowedRepositories: overrides.allowedRepositories ?? 'examplessdk-lgtm/1origin' });
  return { handler, calls };
}

test('rejects anonymous, ID tokens and non-operators before fetching credentials', async () => {
  let accessed = false;
  const handler = createHandler({ getSecret: async () => { accessed = true; }, allowedRepositories: 'examplessdk-lgtm/1origin' });
  for (const [claims, code] of [[{}, 401], [{ sub: 'a', token_use: 'id', 'cognito:groups': 'origin-operators' }, 401],
    [{ sub: 'a', token_use: 'access', 'cognito:groups': 'not-origin-operators' }, 403]]) {
    assert.equal((await handler(event('/github/import', {}, claims))).statusCode, code);
  }
  assert.equal(accessed, false);
});
test('pins import to immutable commit and filters unsafe files without leaking credentials', async () => {
  const { handler, calls } = fixture();
  const result = await handler(event());
  assert.equal(result.statusCode, 200);
  const data = JSON.parse(result.body);
  assert.equal(data.repository.commitSha, commit);
  assert.equal(data.repository.connection, 'github-app');
  assert.deepEqual(data.files.map(f => f.path), ['.env.example', 'README.md']);
  assert.ok(calls.some(c => c.url.includes('/git/trees/' + tree)));
  assert.equal(result.body.includes('installation-token-private'), false);
  assert.equal(result.body.includes('PRIVATE KEY'), false);
  assert.equal(result.headers['Cache-Control'], 'no-store');
});
test('rejects arbitrary repositories, invalid refs and missing allowlist without network', async () => {
  for (const query of [{ repository: 'other/repo' }, { repository: 'https://evil.test/x' },
    { repository: 'examplessdk-lgtm/1origin', ref: '../secret' }]) {
    const { handler, calls } = fixture();
    assert.ok([400, 403].includes((await handler(event('/github/import', query))).statusCode));
    assert.equal(calls.length, 0);
  }
  assert.equal((await fixture({ allowedRepositories: '' }).handler(event())).statusCode, 503);
});
test('reads file by repository path at pinned commit rather than accepting arbitrary blob ids', async () => {
  const { handler, calls } = fixture();
  const result = await handler(event('/github/file', { repository: 'examplessdk-lgtm/1origin', commit, path: 'README.md' }));
  assert.equal(result.statusCode, 200);
  assert.equal(JSON.parse(result.body).content, 'hello origin');
  assert.ok(calls.some(c => c.url.endsWith('/git/commits/' + commit)));
  assert.ok(calls.some(c => c.url.endsWith('/git/blobs/' + blob)));
});
test('rejects traversal, secret files, mutable refs and symlink file responses', async () => {
  for (const path of ['../README.md', '/README.md', '.env', 'nested/.env.local', 'key.pem', 'a\\b.ts']) {
    const { handler, calls } = fixture();
    assert.equal((await handler(event('/github/file', { repository: 'examplessdk-lgtm/1origin', commit, path }))).statusCode, 400);
    assert.equal(calls.length, 0);
  }
  assert.equal((await fixture().handler(event('/github/file', { repository: 'examplessdk-lgtm/1origin', commit: 'main', path: 'README.md' }))).statusCode, 400);
  assert.equal((await fixture().handler(event('/github/file', { repository: 'examplessdk-lgtm/1origin', commit, path: 'link.ts' }))).statusCode, 404);
});
test('fails closed on truncated tree instead of claiming a complete import', async () => {
  assert.equal((await fixture({ tree: { truncated: true } }).handler(event())).statusCode, 422);
});
test('redacts upstream errors and never follows GitHub redirects', async () => {
  const { handler } = fixture({ fetcher: async (_, options) => {
    assert.equal(options.redirect, 'error');
    return new Response('sensitive-provider-token', { status: 500 });
  } });
  const result = await handler(event());
  assert.equal(result.statusCode, 502);
  assert.equal(result.body.includes('sensitive-provider-token'), false);
});
test('enforces decoded file size and text-only files', async () => {
  const { handler } = fixture({ file: { content: Buffer.alloc(262145).toString('base64'), size: 1 } });
  assert.equal((await handler(event('/github/file', { repository: 'examplessdk-lgtm/1origin', commit, path: 'README.md' }))).statusCode, 413);
});
