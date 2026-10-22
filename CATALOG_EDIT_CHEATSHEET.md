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

## 4) Field Meanings

- `name`: Product title shown on site
- `suffix`: Usually `""` or `"HSO"`
- `price`: Retail price as a number (no currency symbol), or `null` when not yet set
- `category`: Controls which section it appears in
- `featured`: `true` shows in Featured Deals
- `newArrival`: `true` shows a **New Arrival** badge and includes the item in the **New Arrivals** tab
- `pricePending`: When `true` and no positive numeric retail price is set, shows **Price coming soon**, uses a WhatsApp details inquiry, and disables checkout
- `spec`: Short specification summary shown on the product card
- `specifications`: Object of label/value pairs shown under **Full specifications**
- `model` / `sku`: Exact manufacturer identifiers; also included in catalog search
- `image`: Filename from `img/products/`, or a root-relative path such as `/scooters/trophy-actual.jpeg`
- `imageUnavailable`: `true` displays the model name as artwork instead of an unrelated photo
- `inquiryOnly`: `true` keeps the price visible but replaces checkout with an availability inquiry
- `contactNumber`: WhatsApp destination for inquiries, digits only; defaults to Connections if omitted

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

### Publish a New Arrival Before Pricing

Set `"newArrival": true`, `"price": null`, and `"pricePending": true`.
Use the public link `https://connectionscuracao.net/#new-arrivals` to open the
New Arrivals tab. Never use an invoice purchase cost as the selling price.

Once the retail price is supplied, set `price` to that positive number.
Pricing and checkout activate automatically, even if `pricePending` remains
`true`. Remove `inquiryOnly` too if it was separately set and checkout should
be available. The New Arrival badge can remain independently.

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

