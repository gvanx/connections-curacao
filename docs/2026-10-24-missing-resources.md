# Missing-resource investigation — 24 October 2026

## Changes

- Add `/favicon.ico`, `/favicon.svg`, `/apple-touch-icon.png`, and the legacy `/apple-touch-icon-precomposed.png` URL using the existing navy-and-white lightning icon.
- Link the browser and Apple icons from the homepage. Add 192px and 512px PNG icons to the web app manifest.
- Ignore `.env` and `.env.*` at every directory depth, while allowing `.env.example` and `.env.*.example` templates. No `.env` files were tracked at the inspected main commit.
- Remove an embedded Netlify access token from the old deployment guide. Authenticate through `netlify login` or a shell/CI secret instead. **The account owner must revoke the exposed token in Netlify; this edit does not remove it from Git history or invalidate it.** The token was not used or tested during this investigation.

## Homepage `/`

Live checks at approximately 13:18 UTC-4 returned HTTP 200 for normal GET and HEAD requests to `https://connectionscuracao.net/`. HTTP and `www` visits redirected to the canonical HTTPS homepage and finished with 200. The default `connections-curacao.netlify.app` homepage also returned 200.

Netlify Observability for 17–24 October (approximately 13:20 UTC-4 at each endpoint) showed 115 homepage requests in the Not Found group. Applying the POST method filter retained all 115. A representative request at 07:38:54 UTC-4 on 24 October returned 404 for `POST https://connectionscuracao.net/`. Nearby requests in the same burst targeted `/api/graphql`, `/graphql`, `/_next`, and other nonexistent application endpoints. This pattern is consistent with automated probing; a claimed crawler user agent does not establish the caller's identity.

These recent homepage 404s are failed POST requests, not evidence of failed normal page loads. The site's checkout submit handler prevents native form submission and opens Sentoo/WhatsApp links. No missing homepage file or broken homepage redirect was found, so the homepage routing has not been changed to turn rejected requests into successful responses.

An empty diagnostic POST returned 400; it did not reproduce the historical callers' exact requests. The screenshot covers 24 September–24 October and lists 518 homepage 404s, while this account exposes only seven days of detailed Observability records. The recent findings explain the observed pattern, but do not prove the cause of every older request.

## `/meta.json`

The path currently returns 404, is absent from the repository, and has no references in the repository's source. The application uses `/manifest.json` for its web app manifest and HTML Open Graph tags for sharing metadata.

In the same seven-day window, Netlify showed 379 requests for `/meta.json`. Grouping by user agent showed 376 identifying as `facebookexternalhit/1.1`, one browser-like agent, one `LeadGenCheck/1.0`, and one request from this investigation's diagnostic client. User-agent identification is not cryptographic verification of the caller. These counts include redirects and the diagnostic request; they are not the screenshot's monthly 404 total.

The evidence points to external crawler requests rather than a broken application dependency. Keep the truthful 404 response. No fabricated metadata endpoint, redirect to an unrelated manifest, or blanket homepage rewrite has been added.

## Validation

- Confirmed all three reported icon URLs returned 404 before the change.
- Verified the new ICO contains 16px, 32px, 48px and 64px images; Apple PNGs are opaque 180px images; manifest PNGs match their declared 192px/512px dimensions.
- Parsed SVG, HTML icon links and manifest JSON; checked that every declared icon exists.
- Served the changed files locally and verified the homepage, manifest and all six icon URLs return 200 with appropriate content types.
- Verified root and nested credential filenames are ignored, example templates remain allowed, and no tracked source file contains the exposed Netlify token pattern after removal.

## Evidence

- [Netlify homepage POST/404 records](https://app.netlify.com/projects/connections-curacao/analytics-and-metrics/observability?from_ts=1792257616370&to_ts=1792862416370&status_class=404&methods=POST)
- [Netlify meta.json user-agent breakdown](https://app.netlify.com/projects/connections-curacao/analytics-and-metrics/observability?from_ts=1792257616370&to_ts=1792862416370&url=%2Fmeta.json&group_by=user_agents)
- [How Netlify Web Analytics works](https://docs.netlify.com/manage/monitoring/web-analytics/how-web-analytics-works/)

Dashboard evidence requires access to the Netlify project. Counts describe the inspected window and may be unavailable after its retention period.
