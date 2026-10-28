# Agent readiness

The public homepage is rendered by the existing TanStack/Cloudflare Worker. Its root layout and homepage no longer opt out of SSR. Existing styles, components, routes, account boundaries, and managed Base44 server files remain in place. The logo is an accessible H1; a no-JavaScript style reveals content that normally animates into view.

## Representations

- `GET /` with `Accept: text/html` (also wildcard/default requests): HTML, canonical URL, sequential headings and SoftwareApplication JSON-LD. Title identifies ONEORIGIN and the developer workspace.
- `GET /` with a preferred explicit `Accept: text/markdown`: CommonMark-compatible Markdown, `Content-Type: text/markdown; charset=utf-8`, `Vary: Accept`.
- Both homepage representations use `Cache-Control: no-store` to avoid mixing representations in caches.
- Unknown page paths requested as Markdown: HTTP 404, explanatory Markdown and links to the information index and sitemap. The middleware uses TanStack's generated route matcher before its HTML-only rendering terminal, rather than guessing that a 406 is a 404. HTML 404 status and existing UI stay intact.
- APIs, server functions, non-GET/HEAD requests, authorization failures and redirects are not replaced. This does not add public access to protected operations.
- `HEAD` for Markdown resources returns headers without a body.

## Machine-readable discovery

- `/index.md`: public product overview, including current demo/hosting limitations; same body as negotiated homepage Markdown.
- `/llms.txt`: the llmstxt.org proposal's H1, summary blockquote, contextual paragraph, and H2 link lists.
- `/sitemap.xml`: Sitemap protocol namespace and absolute canonical URLs for the four public product pages. No invented modification dates, private account routes or callbacks.
- `/robots.txt`: allows crawling public content and advertises the sitemap. Robots rules are not access controls.
- JSON-LD uses Schema.org SoftwareApplication fields: name, url, description, applicationCategory, operatingSystem. No fabricated offers, reviews, affiliations or social links.

## Verification

```sh
npm run lint
npm test
npm run build
python scripts/verify-agent-readiness.py https://os.1origin.dev
curl -sS -L -i -H 'Accept: text/markdown' https://os.1origin.dev/
curl -sS -L -i -H 'Accept: text/html' https://os.1origin.dev/
curl -sS -L -i -H 'Accept: text/markdown' https://os.1origin.dev/__ora-404-probe-k6poyu7n
```

CI launches the built Worker and runs the same HTTP checks locally, covering raw HTML text length, heading order, JSON-LD, canonical URL, negotiation priorities and exclusions, 404 status/body/type, HEAD, discovery files, product pages, and an unchanged JSON API.

## Follow-up requiring product decisions or account access

Search rank cannot be guaranteed by a code change. Submit the sitemap and request indexing in the domain's verified Google Search Console account; verify Bing Webmaster Tools if desired. Establish consistent public ONEORIGIN branding and earn relevant editorial links. Do not add fabricated press mentions or `sameAs` identities. Decide public pricing before publishing offers. Re-run the Ora/Is Agentic audit after the deployment is live; no new readiness score is claimed here.

## Release verification (2026-10-28)

- Application commit: `5919b1040f3ae5c2d64889bda80ddcc8c565a47e`.
- 34 Node tests, lint, and production build passed locally. GitHub Actions run `40696187897` succeeded, including the built Worker HTTP checks.
- Cloudflare build `1768a4ad-d81e-4566-82af-37eb3dbd1fc7` completed successfully for that commit.
- All 17 public HTTP checks passed on `https://os.1origin.dev` using curl transport: `python scripts/verify-agent-readiness.py https://os.1origin.dev --curl`.
- Public raw HTML contained 2,839 text characters after scripts/styles were excluded; one H1 and sequential H2/H3 headings; canonical URL and parsable SoftwareApplication JSON-LD verified.
- Both negotiated representations and Markdown/HTML 404s were checked for status, MIME type, Vary header, and body. All four discovery files and the linked public product pages returned expected content types and statuses. The JSON time API remained JSON even with a Markdown Accept header.
- Browser rendering was checked after deployment; no application hydration errors appeared. The existing product design remained in place. No new Ora readiness score or search ranking has been measured.
- This execution environment's urllib egress received HTTP 403; curl successfully verified the public responses. The verification script supports `--curl` as an optional transport; CI uses the built Worker locally.
