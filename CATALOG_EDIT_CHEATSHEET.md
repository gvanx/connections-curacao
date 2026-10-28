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
- `spec`: Short specification summary shown on the product card
- `specifications`: Object of label/value pairs shown under **Full specifications**
- `model` / `sku`: Exact manufacturer identifiers; also included in catalog search
- `image`: Filename from `img/products/`, or a root-relative path such as `/scooters/trophy-actual.jpeg`
- `imageUnavailable`: `true` displays the model name as artwork instead of an unrelated photo
- `inquiryOnly`: `true` keeps the price visible but replaces checkout with an availability inquiry
- `contactNumber`: WhatsApp destination for inquiries, digits only; defaults to Connections if omitted
- `giftCardName`: Exact Apple gift-card name in the digital store. Use category `giftcards`, `price: null`, `inquiryOnly: true` and `pricePending: true`; the storefront loads its current XCG price and availability from the gift-card store.

For Premier Automotive scooters, use `"inquiryOnly": true` and
`"contactNumber": "59996905151"`. An optional `availability` field does not
control the checkout button; `inquiryOnly` does. Do not infer stock from a flyer.
If `landingPage` is present, the inquiry button opens that page instead.

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

