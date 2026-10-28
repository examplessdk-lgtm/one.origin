import Negotiator from 'negotiator';
import { homepageMarkdown, llmsText, site } from './site-content.js';

export function prefersMarkdown(accept) {
  // Explicit Markdown only: wildcard-only browser/curl requests retain HTML.
  if (!/(?:^|,)\s*text\/markdown\s*(?:;|,|$)/i.test(accept || '')) return false;
  const selected = new Negotiator({ headers: { accept } }).mediaType(['text/html; charset=utf-8', 'text/markdown; charset=utf-8']);
  return selected?.split(';')[0] === 'text/markdown';
}

export function varyAccept(headers) {
  const values = (headers.get('vary') || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!values.includes('*') && !values.some(s => s.toLowerCase() === 'accept')) values.push('Accept');
  headers.set('vary', values.join(', '));
}

function textResponse(request, text, type, status = 200, negotiated = false) {
  const headers = new Headers({ 'content-type': `${type}; charset=utf-8`, 'x-content-type-options': 'nosniff', 'cache-control': 'no-store' });
  if (negotiated) varyAccept(headers);
  return new Response(request.method === 'HEAD' ? null : text, { status, headers });
}

// Pure request/response layer, tested independently of TanStack's middleware adapter.
// Never rewrite APIs, server functions, non-GET methods, or authentication errors.
export async function agentResponse(request, next, handlerType = 'router', isMissingPage = () => false) {
  const url = new URL(request.url);
  if (handlerType !== 'router' || !['GET', 'HEAD'].includes(request.method) || url.pathname.startsWith('/api/') || url.pathname.startsWith('/_server')) return next();
  const markdown = prefersMarkdown(request.headers.get('accept'));
  if (url.pathname === '/' && markdown) return textResponse(request, homepageMarkdown, 'text/markdown', 200, true);
  if (url.pathname === '/index.md') return textResponse(request, homepageMarkdown, 'text/markdown');
  if (url.pathname === '/llms.txt') return textResponse(request, llmsText, 'text/plain');
  if (url.pathname === '/robots.txt') return textResponse(request, `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`, 'text/plain');
  if (url.pathname === '/sitemap.xml') {
    const urls = ['/', '/Agent', '/about', '/hosting'].map(path => `<url><loc>${site.url}${path}</loc></url>`).join('');
    return textResponse(request, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`, 'application/xml');
  }
  // TanStack rejects Markdown-only page requests with 406 before rendering.
  // Check its real route matcher first; never infer a missing page from a 406.
  if (markdown && await isMissingPage(url.pathname)) return markdownNotFound(request);
  const result = await next();
  const response = result instanceof Response ? result : result.response;
  if (response.status === 404 && markdown) {
    return markdownNotFound(request);
  }
  if (url.pathname === '/' || response.status === 404) {
    const headers = new Headers(response.headers);
    varyAccept(headers);
    // Avoid CDN representation confusion; authenticated state is never shared.
    headers.set('cache-control', 'no-store');
    const updated = new Response(request.method === 'HEAD' ? null : response.body, { status: response.status, statusText: response.statusText, headers });
    return result instanceof Response ? updated : { ...result, response: updated };
  }
  return result;
}

function markdownNotFound(request) {
  // Don't reflect attacker-controlled paths/query strings into Markdown.
  return textResponse(request, `# 404 — Page not found\n\nThe requested page does not exist on ONEORIGIN.\n\nSee the [agent information index](${site.url}/llms.txt), [sitemap](${site.url}/sitemap.xml), or [homepage](${site.url}/).\n`, 'text/markdown', 404, true);
}
