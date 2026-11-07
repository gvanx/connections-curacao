# Nigeria storefront

The dedicated storefront is `/nigeria/` on the existing Netlify deployment.
It offers only Apple gift cards and USDT, with quote requests sent to
Connections on WhatsApp at `59996782619`. It does not reuse Curaçao prices,
checkout, delivery charges or financing. Amounts entered in the forms are
requested product quantities, not selling prices. The user sends the WhatsApp
message; opening the link does not automatically send anything.

## Country routing

`netlify/edge-functions/nigeria.js` runs before the CDN cache. Only Netlify's
`context.geo.country.code === 'NG'` grants public access to `/nigeria` and everything
under it. Other or unknown countries receive a temporary redirect to
`https://connectionscuracao.net/`. The same guard runs on native Netlify and
deploy-preview URLs. Encoded path aliases are checked too.

Nigerian GET/HEAD visits to `/` and `/index.html` redirect to `/nigeria/`, keeping
campaign query parameters. Existing Curaçao product pages and services retain
their routes. Responses from protected paths and country redirects use
`no-store` headers; do not opt the edge function into manual caching or set
`onError: 'bypass'`. Country cookies, query strings and headers cannot override
the gate. The owner-requested private preview exception is described below.

Location is inferred from the public IP, not GPS or identity. A VPN changes
the apparent country. This is regional site routing, not protection for secret
material (the repository and its sources are public).

## Private preview

The owner can open a private invitation at `/nigeria/preview/#<invitation>` from
outside Nigeria. Only the SHA-256 digest of a random 256-bit invitation is stored
in the edge function. Never commit the invitation, full link or session cookie,
or include them in PR descriptions, screenshots, analytics or external probes.

The fragment is removed immediately by the preview page, then sent in a same-origin
POST body. The server verifies its digest and expiry before setting a Secure,
HttpOnly, host-only cookie scoped to `/nigeria`. The cookie allows the page and its
assets to load without changing public country routing. Every use is verified
server-side and stops working at the invitation's expiry (14 November 2026,
21:06 UTC). Responses remain uncacheable. The invitation page has a restrictive
CSP, no external scripts and a no-referrer policy.

Anyone holding the invitation can open this preview until it expires. Revoke or
replace it by changing `PREVIEW_TOKEN_SHA256` and deploying; set a new expiry when
issuing a replacement. Do not place the real invitation in tests. Tests substitute
a disposable fixture digest and expiry. The private entry page itself contains
only an opening/error message and never reveals storefront content without access.

## Deploy and verify

Netlify discovers JavaScript edge functions in `netlify/edge-functions` with
inline `config` exports. Deploy this directory together with the new storefront;
publishing only static files would omit the country gate. Keep existing build
and publish settings; no framework or dependency change is required.

Before production, check the deploy's function list includes `nigeria`, then
verify the deployed page with genuine Nigeria and non-Nigeria egress locations.
Tests with mocked country context validate application logic, not Netlify's live
geolocation. A public cookie such as `nf_country=NG` must not grant access.
Verify both `/nigeria/` and `/nigeria/index.html`, native Netlify URLs, CSS and
JavaScript paths. A missing country must redirect. Confirm the existing Curaçao
homepage and checkout still work.

`node --test tests/*.test.cjs` runs routing, inquiry and existing regression tests.
For local Netlify integration checks, use `netlify dev --geo=mock --country=NG`,
then repeat with `--country=CW`. Keep mock country overrides in local tooling
only. The private invitation flow is the only owner-authorized exception to public
country routing; arbitrary preview query parameters must still fail.

`ng.connectionscuracao.net` can be connected separately once Netlify domain and
DNS configuration are available. It is not provisioned by these source changes;
the working storefront URL remains `https://connectionscuracao.net/nigeria/`.

## References

- [Netlify Edge Functions API](https://docs.netlify.com/build/edge-functions/api/)
- [Edge function declarations](https://docs.netlify.com/build/edge-functions/declarations/)
- [Caching and error handling](https://docs.netlify.com/build/edge-functions/optional-configuration/)
- [Apple gift-card region guidance](https://support.apple.com/en-us/108285)
