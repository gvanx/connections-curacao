# Catalog Edit Cheat Sheet

Use this guide to update products, prices, and images quickly.

## 1) Main File To Edit

- `data/products.json`

For most catalog updates, this is the only file you need.

## 2) Product Object Template

```json
{
  "name": "Galaxy A36",
  "suffix": "",
  "price": 575,
  "category": "samsung",
  "featured": false,
  "image": "galaxy-a36-model.png"
}
```

## 3) Allowed Categories

- `apple`
- `samsung`
- `phones` — Other Phones (brands outside the Apple and Samsung categories)
- `tvs`
- `laptops`
- `acs`
- `motor`
- `appliances`
- `other`
- `giftcards`

## 4) Field Meanings

- `name`: Product title shown on site
- `suffix`: Usually `""` or `"HSO"`
- `price`: Retail price as a number (no currency symbol), or `null` when not yet set
- `category`: Controls which section it appears in
- `featured`: `true` shows in Featured Deals
- `addedAt`: UTC timestamp assigned automatically when a new listing is first seen. It drives the **New Arrival** badge and tab for exactly 14 days.
- `newArrival`: compatibility flag maintained by the automation; do not set it manually or use it to extend the 14-day window.
- `restockedAt`: Timestamp with an explicit timezone for a confirmed restock. Shows **Back in Stock** for exactly 14 days, without resetting the original arrival date.
- `backInStock`: compatibility flag maintained from `restockedAt`; setting this flag alone does not display a badge.
- `pricePending`: When `true` and no positive numeric retail price is set, shows **Price coming soon**, uses a WhatsApp details inquiry, and disables checkout
- `inStoreSpecial`: With `price: null`, shows **In-store special** in the main catalog and Black Friday collection. Use `inquiryOnly: true` and an appropriate `inquiryLabel`; do not invent a numeric price. A later confirmed numeric price takes precedence over this label.
- `spec`: Short specification summary shown on the product card
- `specifications`: Object of label/value pairs shown under **Full specifications**
- `model` / `sku`: Exact manufacturer identifiers; also included in catalog search
- `image`: Filename from `img/products/`, or a root-relative path such as `/scooters/trophy-actual.jpeg`
- `type`: Optional product type label for model-name artwork, such as `Camera`; otherwise follows the category
- `imageUnavailable`: `true` displays the model name as artwork instead of an unrelated photo
- `inquiryOnly`: `true` keeps the price visible but replaces checkout with an availability inquiry
- `contactNumber`: WhatsApp destination for inquiries, digits only; defaults to Connections if omitted
- `giftCardName`: Exact Apple gift-card name in the digital store. Use category `giftcards`, `price: null`, `inquiryOnly: true` and `pricePending: true`; the storefront loads its current XCG price and availability from the gift-card store.

All six Premier Automotive scooter models are available to purchase, as confirmed
by the owner on 2026-11-13. Use `"inquiryOnly": false` to enable the standard
Checkout & Pay flow. Keep `"contactNumber": "59996905151"` for inquiries.
An optional `availability` field does not control checkout; `inquiryOnly` does.
For a model that becomes inquiry-only, set `inquiryOnly` to `true`; if
`landingPage` is present, its inquiry button opens that page instead.
Do not infer future stock changes from a flyer.

On 2026-11-19, the owner authorized an **XCG 300 Black Friday discount** on
all six scooters. Keep `price` at the offer price below, `oldPrice` at the
regular price, and `blackFriday: true`. Checkout, availability, contact numbers,
and images remain unchanged.

| Scooter | Regular price (XCG) | Black Friday price (XCG) |
| --- | ---: | ---: |
| Falcon 8 150cc | 3,590 | 3,290 |
| Trophy 150cc | 3,300 | 3,000 |
| Fantasy 150cc | 3,590 | 3,290 |
| Monkey IV 150cc | 3,590 | 3,290 |
| NVH 150cc | 4,099 | 3,799 |
| R8 150cc | 3,490 | 3,190 |

The owner also removed these three listings: `150cc Motorcycle (Blue)`
(`MOT9184G`), `150cc Motorcycle (Black)` (`MOT9185G`), and
`Gasoline Motorcycle 150CC` (`MOT-9184G`). Preserve their existing catalog
history entries so a future reintroduction does not restart arrival badges.

## 5) Common Tasks

### Change Price

Edit:

```json
"price": 575
```

### Mark a Product Back in Stock

After stock is confirmed, set `restockedAt` to the restock time, for example
`"restockedAt": "2026-10-28T19:30:00-04:00"`, then run
`node scripts/sync-new-arrivals.cjs`. Use the actual date and time, not the example.
The green **Back in Stock** badge appears on product cards and featured deals
for 14 days. It takes visual priority if the product is also a New Arrival;
the New Arrivals filter still follows the original listing date.

Keep `restockedAt` unchanged for price, photo and specification edits. Update
it only for another confirmed restock. Remove it to clear the badge early.
The daily workflow removes expired `backInStock` flags, while the storefront
uses the date to hide the badge at the exact expiry, even in an open tab.
This badge does not change checkout or the availability inquiry setting.

### Publish a New Arrival Before Pricing

Set `"price": null` and `"pricePending": true`, then run `node scripts/sync-new-arrivals.cjs`. New listings receive their arrival timestamp and badge automatically.
Use the public link `https://connectionscuracao.net/#new-arrivals` to open the
New Arrivals tab. Never use an invoice purchase cost as the selling price.

Once the retail price is supplied, set `price` to that positive number.
Pricing and checkout activate automatically, even if `pricePending` remains
`true`. Remove `inquiryOnly` too if it was separately set and checkout should
be available. The New Arrival badge expires 14 days after the listing was first added. Setting a price does not restart that clock.

For fuller specifications, add an object such as:

```json
"specifications": {
  "Processor": "Intel Processor N150",
  "Memory": "4GB RAM",
  "Storage": "128GB UFS"
}
```

### Put a Product on Sale (discount ribbon)

Add an `oldPrice` field with the original (higher) price. Keep `price`
as the new/current price:

```json
"price": 1499,
"oldPrice": 1699
```

This automatically shows a red **-12%** ribbon on the card and the old
price struck through next to the new one. The percentage is calculated
for you. To end the sale, just delete the `oldPrice` line.

### Include a Product in Black Friday

Set `"blackFriday": true` to include the product on `/blackfriday` and show
its Black Friday badge in the main catalog. The campaign page reads the same
`data/products.json` file, so prices and specifications stay together.
Keep `price` as the current offer price; add `oldPrice` only when the original
price is confirmed. Remove the `blackFriday` field to remove the product from
the campaign. This tag does not change availability or enable checkout.

The homepage **Black Friday** tab remains the complete campaign collection.
**Black Friday Electronics** opens at `/#blackfriday-electronics` and includes
tagged phones, tablets, laptops, watches, earbuds and other electronic accessories
from `apple`, `samsung`, `phones`, `laptops`, and `other`. It excludes items with
`blackFridayAppliance: true`, plus TVs, appliances, aircos, scooters and gift cards.
Keep its count tied to the live available catalog. Managed HSO listings use their
Black Friday prices before search, price filtering and sorting, and retain their
existing exact-device checkout flow.

The four Premier inverter AC offers added on 2026-11-19 use the supplied
campaign prices. The owner authorized **Checkout & Pay** for all four offers;
keep `inquiryOnly: false`. They are separate from the older generic AC listings.

The 16 appliance offers added on 2026-11-25 have `blackFridayAppliance: true`
as well as `blackFriday: true`. The homepage **Black Friday Appliances** tab
opens at `/#blackfriday-appliances`; the campaign page opens at
`/blackfriday#appliances`. Both include the Blaupunkt AC without changing its
`acs` catalog category. `applianceGroup` groups the featured view into
`personal-care`, `kitchen`, `cooling`, and `televisions`; price sorting produces a single list.
Keep the exact SKU in the name, `model`, and `sku`. On 2026-11-25, the owner
authorized selling all 16 appliance offers with **Checkout & Pay**. Keep
`inquiryOnly: false`; do not reinstate availability-inquiry buttons.
Verified product photographs are stored in `img/products/blackfriday-appliances/`,
with exact-model source evidence in `docs/blackfriday-appliance-photo-sources.json`.
SN 026, SN 138, BKSM 9817, and BKAC 12 K 9652 use generic SVG placeholders
with `imagePlaceholder: true`, labeled as illustrations. Replace these when an
exact product photo is available and remove the placeholder flag. A photo's color
does not guarantee color availability. No regular prices were
supplied, so do not add a comparison price or savings claim.

The Black Friday Appliances collection has 26 offers: the original 16 appliances,
six Premier TVs, and the four existing Premier inverter AC deals.
On 2026-11-25 the owner supplied these prices: 32-inch XCG 199, 40-inch XCG 349,
50-inch XCG 599, 55-inch XCG 649, 60-inch XCG 875, and 65-inch XCG 925.
Keep them in category `tvs`, with `blackFriday: true`, `blackFridayAppliance: true`,
`applianceGroup: "televisions"`, and `inquiryOnly: false`. All six use
`/img/products/tv-catalog.webp` with `imagePlaceholder: true`, as requested.
The 50-inch listing is TV-9308SF50WKL; the existing 65-inch Whale OS listing
is TV-9304SF65WKL. The 55-inch Whale OS and 60-inch UHD listings do not have
confirmed model numbers; do not invent them or substitute the 55-inch QLED/Tizen model.
Preserve existing catalog names and arrival history when updating these offers.

The four Premier inverter AC offers also appear in **Black Friday Appliances**
with `blackFridayAppliance: true` and `applianceGroup: "cooling"`, as requested
on 2026-11-25. Keep their existing prices (9,000 BTU XCG 444; 18,000 BTU
XCG 875; 24,000 BTU XCG 1,099; 36,000 BTU XCG 1,799), comparison prices,
checkout, specifications, and arrival history. Cooling offers are ordered by
price in the grouped view, alongside the stand fan and Blaupunkt AC.

The four Premier offers use `ac-catalog.webp`, the existing main-site airco illustration
requested by the owner for these offers. Both the main catalog and Black Friday
page use this shared image. The original campaign posters remain in the
Black Friday poster gallery.

The homepage Black Friday theme uses the same tagged products for its deals
rail and features the lowest-priced purchasable tagged airco (or another tagged
physical product when no airco is available). Sold-out and inquiry-only items
cannot become the checkout hero. The theme is scoped to `black-friday-theme`
on the homepage body and styled in `css/blackfriday-theme.css`.

Black Friday Week starts **23 November 2026 at midnight, Curaçao time**.
The countdown reads `data-starts-at="2026-11-23T00:00:00-04:00"` in `index.html`
and changes to a live-week message at that instant. It does not reset or imply
a sale end date. Update the visible date and announcement together if the
campaign schedule changes.

### Mark a Product as Limited Supply

Add `"limited": true`:

```json
"price": 899,
"limited": true
```

This shows a **⚡ Limited supply** ribbon on the card. Tapping/clicking
it reveals a note: "Limited stock. Price rises once this batch sells out."
Remove the `limited` line when stock is back to normal.

### Add Product

1. Copy an existing object in `data/products.json`
2. Paste it where you want in the array
3. Update fields (`name`, `price`, `category`, `image`, etc.)
4. Ensure commas are valid
5. Run `node scripts/sync-new-arrivals.cjs` and commit both `data/products.json` and `data/catalog-history.json`. The GitHub workflow also does this automatically after catalogue changes.

### Remove Product

1. Delete that product's full `{ ... }` block
2. Fix commas so JSON stays valid

### Mark/Unmark Featured

```json
"featured": true
```

or

```json
"featured": false
```

## 6) Images

1. Place image file in `img/products/`
2. Set matching filename in product:

```json
"image": "your-file-name.png"
```

If image is missing, check:

- exact filename and extension
- uppercase/lowercase match

Filename-only `.jpg` and `.jpeg` values are resolved to `.png` by the storefront
(with a few existing exceptions). Prefer the actual `.png` filename. A path
starting with `/` is used unchanged, including its extension.

When no exact product photo is available, omit `image` and set
`"imageUnavailable": true`. Do not substitute a different model's photo.

## 7) Site Files

- `index.html`: Homepage content, navigation, footer, locations, and campaign flyers
- `css/main.css`: Homepage layout, colors, typography, and responsive styles
- `js/storefront.js`: Category definitions, catalog rendering, search, filters, and featured offers
- `js/checkout.js`: Checkout configuration (reserve amount, delivery fee, Sentoo, and EmailJS)

Update `PRODUCTS_DATA_VERSION` in `js/storefront.js` after a catalog release,
and the corresponding `?v=` references in `index.html` after CSS or script changes.

## 8) Deploy Changes

```bash
cd /home/ganesh/connections-curacao
git add data/products.json img/products
git commit -m "update catalog"
git push origin main
```

## 9) Automatic arrival and restock badge expiry

### Apple gift cards

The Apple Gift Cards tab is available at `https://connectionscuracao.net/#gift-cards`.
The main catalogue holds denomination names, artwork and arrival dates only.
Edit gift-card prices and `soldOut` in `gvanx/gift-card-curacao/data/store.json`.
The same-origin `/data/gift-card-store.json` Netlify proxy loads that public store
data without caching. The storefront refreshes it on load, every minute while
visible, and when the tab regains focus or connectivity. Expired sales and each
product's `noSale` setting follow the digital store's pricing rules.

Sold-out cards have no purchase button. If current data cannot load, prices are
hidden and customers can open the gift-card store. The main physical checkout
never handles digital cards. Buy now opens the selected denomination's existing
Sentoo checkout on the gift-card site, where the current price, stock, terms and
WhatsApp delivery workflow remain authoritative. URLs cannot set the price or
submit an order. Card face values are USD; retail prices are XCG; these are for
US Apple accounts.

To add a denomination, add matching metadata with the exact `giftCardName`,
then run `node scripts/sync-new-arrivals.cjs`. Use the source store's own SVG
artwork. Run `node --test tests/*.test.cjs` after changing the integration.

### Badge timing

- Every new listing, in every category, gets a 14-day badge. Storage and condition variants are separate listings.
- `data/catalog-history.json` records the first-seen timestamp by category, name and suffix. A `null` value identifies an older listing whose original date is unknown; these do not become new again.
- Existing recent listings were backfilled from their original GitHub addition commits, not the date this automation was installed.
- Price, specification and image edits do not restart the clock. Removing and reintroducing an existing listing also preserves its date. Preserve its history key if correcting its name.
- The storefront checks the dates on page load and refreshes at expiry or when an open tab resumes. No redeploy is needed for a badge to disappear.
- `.github/workflows/new-arrivals.yml` runs after catalogue changes and daily at 08:17 UTC (04:17 Curaçao). It tags newly seen products, maintains confirmed restock badges, and removes expired compatibility flags, then commits only the catalogue/history files when they changed.
- Run `node --test tests/new-arrivals.test.cjs` after changing these rules.


## Individual HSO phones

The main storefront, homepage offers, and Black Friday cards use `hsoModel`
to open `/hso/?model=...`. Each catalog price remains in `data/products.json`.
Set `hsoStorage` to the exact variant (for example `128GB`); optional
`hsoColor` narrows it further. Avoid overlapping price rows for the same unit.

`data/hso-stock.json` contains models and individual phones. The initial import
is the 22 phones from the owner's November 19 stock file. Each unit has a unique
text `serial`, `modelId`, `storage`, `color`, `batteryHealth`, and `status`.
Battery health is an integer from 0 to 100, or `null` when unknown. The initial
file has no battery values; do not reuse percentages from HSO2 or a different phone.

Set status to `sold` or `reserved` when a phone is no longer available; only
`available` phones appear for selection. Update `updatedAt` (YYYY-MM-DD) when
stock changes. Keep removed/sold serials unique and do not recycle them for another
phone. The page reloads stock and current prices before opening checkout and
includes the selected serial, color, storage and battery health in the order name.
Payments do not automatically reserve stock or mark phones sold: staff must update
the stock file after confirming a sale. The old HSO2 service has not been shut down.

The owner confirmed iPhone 13 Pro 256GB at XCG 1,190 and iPhone 14 Pro Max 128GB
at XCG 1,290 as Black Friday offers, and iPhone 15 Pro 256GB HSO at XCG 1,590.
No former prices were supplied for these three models.
