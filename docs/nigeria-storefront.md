# Nigeria storefront

The dedicated storefront is `/nigeria/` on the existing Netlify deployment.
It offers Apple gift cards, USDT and USDC, with quote requests sent to
Connections on WhatsApp at `59996782619`. It does not reuse Curaçao prices,
checkout, delivery charges or financing. Amounts entered in the forms are
requested product quantities, not selling prices. The user sends the WhatsApp
message; opening the link does not automatically send anything.

## Country routing

`netlify/edge-functions/nigeria.js` runs before the CDN cache. Only Netlify's
`context.geo.country.code === 'NG'` grants access to `/nigeria` and everything
under it. Other or unknown countries receive a temporary redirect to
`https://connectionscuracao.net/`. The same guard runs on native Netlify and
deploy-preview URLs. Encoded path aliases are checked too.

Nigerian GET/HEAD page visits redirect to `/nigeria/`, keeping campaign query
parameters. This includes the homepage, extensionless routes, directory routes
and HTML pages, so direct product, service, blog and campaign links also respect
the Nigeria storefront. Static assets, data files and non-GET/HEAD requests pass
through. Other countries retain the existing Curaçao routes. Routing is host
independent: the apex domain, www, domain aliases, native Netlify and deploy
preview hosts all use the same rule when served by this deployment. Domains
served by a different repository or hosting provider need their own deployment
configuration; this function cannot control those sites. Responses from protected paths and country redirects use
`no-store` headers; do not opt the edge function into manual caching or set
`onError: 'bypass'`. There is no cookie, query-string or header override.

The temporary private preview was removed at the owner's request. Its invitation
exchange and credential validation no longer exist. Old preview cookies are ignored
and expired by the server; possession of the former invitation cannot bypass GeoIP.

Location is inferred from the public IP, not GPS or identity. A VPN changes
the apparent country. This is regional site routing, not protection for secret
material (the repository and its sources are public).

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
only. There is no production preview bypass; review screenshots or local previews
from outside Nigeria.

`ng.connectionscuracao.net` can be connected separately once Netlify domain and
DNS configuration are available. It is not provisioned by these source changes;
the working storefront URL remains `https://connectionscuracao.net/nigeria/`.

## References

- [Netlify Edge Functions API](https://docs.netlify.com/build/edge-functions/api/)
- [Edge function declarations](https://docs.netlify.com/build/edge-functions/declarations/)
- [Caching and error handling](https://docs.netlify.com/build/edge-functions/optional-configuration/)
- [Apple gift-card region guidance](https://support.apple.com/en-us/108285)
