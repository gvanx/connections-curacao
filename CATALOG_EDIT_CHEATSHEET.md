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

## 4) Field Meanings

- `name`: Product title shown on site
- `suffix`: Usually `""` or `"HSO"`
- `price`: Number only (no currency symbol)
- `category`: Controls which section it appears in
- `featured`: `true` shows in Featured Deals
- `image`: Filename from `img/products/`

## 5) Common Tasks

### Change Price

Edit:

```json
"price": 575
```

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

## 7) When You Need `index.html`

Only edit `index.html` for global settings/content:

- checkout config (reserve/delivery/Sentoo/EmailJS)
- navigation/footer/locations text
- category definitions (only when adding a brand-new category key)

## 8) Deploy Changes

```bash
cd /home/ganesh/connections-curacao
git add data/products.json img/products
git commit -m "update catalog"
git push origin main
```

