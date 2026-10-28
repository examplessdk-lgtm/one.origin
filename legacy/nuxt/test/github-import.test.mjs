import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGitHubImportClient } from '../app/utils/github-import.ts';

test('sends access token only in Authorization and encodes branch/file queries', async () => {
  const seen = [];
  const client = createGitHubImportClient(() => 'cognito-token', async (url, options) => {
    seen.push({ url: String(url), options });
    return Response.json({ content: 'source', repository: { commitSha: 'a'.repeat(40) } });
  });
  await client.importRepository('examplessdk-lgtm/1origin', 'feat/one');
  await client.readFile('examplessdk-lgtm/1origin', 'a'.repeat(40), 'src/a b.ts');
  assert.equal(new URL(seen[0].url).searchParams.get('ref'), 'feat/one');
  assert.equal(new URL(seen[1].url).searchParams.get('path'), 'src/a b.ts');
  assert.equal(seen[0].options.headers.Authorization, 'Bearer cognito-token');
  assert.equal(seen[0].options.cache, 'no-store');
  assert.ok(seen.every(r => !r.url.includes('cognito-token')));
});
test('fails before network when signed out, and exposes safe API errors', async () => {
  let calls = 0;
  const fetcher = async () => { calls++; return Response.json({ error: 'Operator membership required.' }, { status: 403 }); };
  await assert.rejects(createGitHubImportClient(() => '', fetcher).importRepository('a/b'), /Sign in/);
  assert.equal(calls, 0);
  await assert.rejects(createGitHubImportClient(() => 'token', fetcher).importRepository('a/b'), /Operator membership/);
});
