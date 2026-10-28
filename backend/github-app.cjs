/* eslint-disable @typescript-eslint/no-require-imports -- Lambda inline code uses CommonJS. */
// Read-only, single-workspace GitHub App broker. Never return provider credentials.
const { sign } = require('node:crypto');
const { TextDecoder } = require('node:util');
const MAX_FILE = 262144;
const MAX_RESPONSE = 4 * 1024 * 1024;
const SHA = /^[a-f0-9]{40}$/;
const REPOSITORY = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/;
class Problem extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function reply(statusCode, value) {
  return { statusCode, headers: { 'Content-Type': 'application/json',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }, body: JSON.stringify(value) };
}
function validPath(path) {
  if (typeof path !== 'string' || !path || path.length > 1024 || /[\\\x00-\x1f]/.test(path)) return false;
  const parts = path.split('/');
  if (parts.some(p => !p || p === '.' || p === '..')) return false;
  if (parts.some(p => /^\.env(?:\.|$)/i.test(p) && !/^\.env\.(example|sample)$/i.test(p))) return false;
  if (parts.some(p => /^(\.git|\.ssh|\.aws|\.npmrc|\.netrc|id_rsa|id_ed25519)$/i.test(p))) return false;
  return /\.(vue|tsx?|jsx?|mjs|cjs|json|mdx?|css|scss|html?|txt|ya?ml|toml|xml|svg|py|sh|sql|go|rs|php|rb|graphql|gql)$/i.test(path) ||
    /(^|\/)(Dockerfile|Makefile|LICENSE|README|\.gitignore|\.dockerignore|\.env\.(example|sample))$/i.test(path);
}
function authorize(event) {
  const c = event.requestContext?.authorizer?.jwt?.claims;
  if (!c?.sub || c.token_use !== 'access') throw new Problem(401, 'Sign in with an access token.');
  const groups = Array.isArray(c['cognito:groups']) ? c['cognito:groups'] : String(c['cognito:groups'] || '').match(/[A-Za-z0-9_-]+/g) || [];
  if (!groups.includes('origin-operators')) throw new Problem(403, 'Operator membership required.');
}
async function jsonResponse(response) {
  if (!response.ok) {
    const status = response.status === 404 ? 404 : [403, 429].includes(response.status) ? 429 : 502;
    throw new Problem(status, status === 404 ? 'Repository or file unavailable.' : status === 429 ? 'GitHub access is limited; try again later.' : 'GitHub connection unavailable.');
  }
  if (Number(response.headers.get('content-length')) > MAX_RESPONSE) throw new Problem(413, 'GitHub response is too large.');
  const reader = response.body.getReader();
  const chunks = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE) throw new Problem(413, 'GitHub response is too large.');
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel().catch(() => {}); }
}
function createHandler({ getSecret, fetcher = fetch, allowedRepositories = '' } = {}) {
  const allowed = new Set(allowedRepositories.split(',').map(x => x.trim().toLowerCase()).filter(Boolean));
  return async event => {
    try {
      authorize(event);
      const path = event.rawPath;
      if (event.requestContext?.http?.method !== 'GET' || !['/github/import', '/github/file'].includes(path)) throw new Problem(404, 'Route not found.');
      if (!allowed.size) throw new Problem(503, 'GitHub repository access is not configured.');
      const q = event.queryStringParameters || {};
      const repository = q.repository;
      if (typeof repository !== 'string' || !REPOSITORY.test(repository) || repository.split('/').some(p => p === '.' || p === '..')) throw new Problem(400, 'Use owner/repository.');
      if (!allowed.has(repository.toLowerCase())) throw new Problem(403, 'Repository is not enabled for this workspace.');
      const ref = q.ref;
      if (ref !== undefined && (typeof ref !== 'string' || !/^[A-Za-z0-9_./-]{1,128}$/.test(ref) || ref.includes('..') || ref.startsWith('/'))) throw new Problem(400, 'Invalid branch or commit.');
      if (path === '/github/file' && (!SHA.test(q.commit || '') || !validPath(q.path))) throw new Problem(400, 'A pinned commit and supported relative file path are required.');
      const secret = await getSecret();
      if (!secret?.privateKey || !secret.clientId || !/^\d+$/.test(String(secret.installationId))) throw new Problem(503, 'GitHub credentials are not configured.');
      const now = Math.floor(Date.now() / 1000);
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ iat: now - 60, exp: now + 480, iss: secret.clientId })).toString('base64url');
      const input = `${header}.${payload}`;
      const jwt = `${input}.${sign('RSA-SHA256', Buffer.from(input), secret.privateKey).toString('base64url')}`;
      const request = async (route, token, body) => jsonResponse(await fetcher(`https://api.github.com${route}`, {
        method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(5000),
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'ONEORIGIN-GitHub-Import',
          ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }));
      const access = await request(`/app/installations/${secret.installationId}/access_tokens`, jwt, {
        repositories: [repository.split('/')[1]], permissions: { contents: 'read' },
      });
      if (typeof access.token !== 'string' || !access.token) throw new Problem(502, 'GitHub connection unavailable.');
      const root = '/repos/' + repository.split('/').map(encodeURIComponent).join('/');
      if (path === '/github/file') {
        // Contents API can dereference symlinks. Resolve through the pinned tree instead.
        const resolved = await request(`${root}/git/commits/${q.commit}`, access.token);
        if (!SHA.test(resolved.tree?.sha || '')) throw new Problem(502, 'GitHub commit is unavailable.');
        const tree = await request(`${root}/git/trees/${resolved.tree.sha}?recursive=1`, access.token);
        if (tree.truncated || !Array.isArray(tree.tree)) throw new Problem(422, 'Complete repository tree is required.');
        const entry = tree.tree.find(f => f.path === q.path && f.type === 'blob' && ['100644', '100755'].includes(f.mode));
        if (!entry || !SHA.test(entry.sha || '')) throw new Problem(404, 'Regular file not found at this commit.');
        if (!Number.isSafeInteger(entry.size) || entry.size > MAX_FILE || entry.size < 0) throw new Problem(413, 'File exceeds 256 KiB.');
        const file = await request(`${root}/git/blobs/${entry.sha}`, access.token);
        if (file.encoding !== 'base64') throw new Problem(400, 'Only regular text files are supported.');
        if (file.size > MAX_FILE || typeof file.content !== 'string' || file.content.length > 360000) throw new Problem(413, 'File exceeds 256 KiB.');
        const bytes = Buffer.from(file.content, 'base64');
        if (bytes.length > MAX_FILE) throw new Problem(413, 'File exceeds 256 KiB.');
        let content;
        try { content = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
        catch { throw new Problem(400, 'Only UTF-8 text files are supported.'); }
        if (content.includes('\0')) throw new Problem(400, 'Binary files are not supported.');
        return reply(200, { path: q.path, sha: file.sha, commitSha: q.commit, content });
      }
      const meta = await request(root, access.token);
      if (meta.full_name?.toLowerCase() !== repository.toLowerCase()) throw new Problem(502, 'Repository identity did not match.');
      const branch = ref || meta.default_branch;
      if (!branch) throw new Problem(422, 'Repository has no default branch.');
      const resolved = await request(`${root}/commits/${encodeURIComponent(branch)}`, access.token);
      if (!SHA.test(resolved.sha || '') || !SHA.test(resolved.commit?.tree?.sha || '')) throw new Problem(502, 'GitHub did not resolve an immutable commit.');
      const tree = await request(`${root}/git/trees/${resolved.commit.tree.sha}?recursive=1`, access.token);
      if (tree.truncated) throw new Problem(422, 'Repository tree is too large; partial import was not accepted.');
      if (!Array.isArray(tree.tree)) throw new Problem(502, 'GitHub tree is unavailable.');
      const files = tree.tree.filter(f => f.type === 'blob' && ['100644', '100755'].includes(f.mode) &&
        validPath(f.path) && SHA.test(f.sha) && Number.isSafeInteger(f.size) && f.size >= 0 && f.size <= MAX_FILE)
        .map(({ path, sha, size }) => ({ path, sha, size })).sort((a, b) => a.path.localeCompare(b.path));
      if (files.length > 1200) throw new Problem(422, 'Repository has more than 1200 supported files.');
      if (!files.length) throw new Problem(422, 'No supported text files found.');
      return reply(200, { repository: { owner: meta.full_name.split('/')[0], name: meta.full_name.split('/')[1],
        fullName: meta.full_name, branch, commitSha: resolved.sha, private: Boolean(meta.private),
        connection: 'github-app', url: `https://github.com/${meta.full_name}` }, files });
    } catch (error) {
      if (error instanceof Problem) return reply(error.status, { error: error.message });
      // Never log SDK/provider errors: they can contain credentials or signed requests.
      return reply(503, { error: 'GitHub import temporarily unavailable.' });
    }
  };
}
let runtimeHandler;
exports.handler = async event => {
  if (!runtimeHandler) {
    const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
    const client = new SecretsManagerClient({ maxAttempts: 2 });
    runtimeHandler = createHandler({ allowedRepositories: process.env.ALLOWED_REPOSITORIES,
      getSecret: async () => {
        const value = await client.send(new GetSecretValueCommand({ SecretId: process.env.GITHUB_SECRET_ARN }));
        return JSON.parse(value.SecretString);
      } });
  }
  return runtimeHandler(event);
};
exports.createHandler = createHandler;
