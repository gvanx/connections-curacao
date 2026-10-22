# HP laptop arrivals — 22 October 2026

Five exact product variants were added to `data/products.json`. `newArrival: true`
enables the badge and New Arrivals filter. The owner supplied these selling
prices during implementation, in the same order as the invoice:

| Product number | Retail price (XCG) |
| --- | ---: |
| D0SN6UA#ABA | 650 |
| CQ1U9UA#ABA | 690 |
| CQ1V1UA#ABA | 690 |
| C84QCUA#ABA | 1,750 |
| D7NF3UA#ABA | 1,750 |

All five use the existing checkout flow. Pending-price rendering remains
available for future unpriced listings, but is not active for these products.

The supplied invoice was used to identify the purchased configurations. No
supplier invoice, purchase prices, or shipment quantities are published.

## Specification sources

| Product number | Exact model | Primary reference |
| --- | --- | --- |
| D0SN6UA#ABA | HP 14-dq6102dx | [HP-authored datasheet](https://files.bbystatic.com/DZsZCHQ5mzwWauB9XrRszQ%3D%3D/2b4d531e-d83d-474e-8ab4-4263dfdb4b35) |
| CQ1U9UA#ABA | HP 15-fd0092wm | [HP-authored product content syndicated by 1WorldSync](https://ws.cs.1worldsync.com/afe75039/page/e3af23b796?mf=HP&pn=CQ1U9UA&lang=EN&market=US&host=www.bestbuy.com&nld=2) |
| CQ1V1UA#ABA | HP 15-fd0094wm | [HP-authored product content syndicated by 1WorldSync](https://ws.cs.1worldsync.com/afe75039/page/e3af23b796?mf=HP&pn=CQ1V1UA&lang=EN&market=US&host=www.bestbuy.com&nld=2) |
| C84QCUA#ABA | HP 15-fd1899nr | [HP Support specifications](https://support.hp.com/us-en/product/product-specs/hp-15.6-inch-laptop-pc-15-fd1000/model/2102811432?sku=C84QCUA) |
| D7NF3UA#ABA | HP OmniBook 3 17-dg0107dx | [HP-authored datasheet](https://files.bbystatic.com/RVoLACxjLXYdVuwDyMQ6iQ%3D%3D/8b25b03b-44b5-4f5b-9c74-aadc690d30e3.pdf) |

### Copy decisions

- The three entry models use **128GB UFS**, which remains labeled UFS.
- The HP 14 invoice says Windows 11 S, while its HP datasheet says Windows 11
  Home. Its public listing says Windows 11 without promising the mode. Confirm
  the installed mode from a unit before making a more specific claim.
- HP's exact product content lists Windows 11 Home for the blue 15-fd0092wm
  and Windows 11 Home in S mode for the silver 15-fd0094wm. These are separate
  variants; their OS detail is retained in the catalog.
- C84QCUA uses **Core 7 150U**, not Core Ultra 7 or Core i7. HP's memory-module
  layout text is inconsistent, so only 16GB DDR4-3200 is promised.
- D7NF3UA uses **Core Ultra 7 255U**. Its backlit keyboard and Full HD IPS
  panel are confirmed by HP. Its Mica Silver gallery finish appears dark gray.
- Bluetooth is listed without a version because HP's datasheets qualify newer
  Bluetooth functionality by operating-system support. No battery-hour,
  bundled subscription, or local warranty claims were added.

## Photo provenance

The five local JPGs are unmodified product-gallery assets matched to the exact
models and finishes. They are served from this website, without hotlinking.

| Local file in `img/products/` | Retrieved image |
| --- | --- |
| hp-14-dq6102dx-sky-blue.jpg | [Best Buy gallery](https://pisces.bbystatic.com/image2/BestBuy_US/images/products/551028fa-f039-43d4-a572-c7ed875be0a3.jpg) |
| hp-15-fd0092wm-moonlight-blue.jpg | [Walmart gallery](https://i5.walmartimages.com/asr/a02da9e5-4d60-4a4b-851a-e6922ff59786.1767d11627ba22a15f08796319cc7722.jpeg) |
| hp-15-fd0094wm-natural-silver.jpg | [Best Buy gallery](https://pisces.bbystatic.com/image2/BestBuy_US/images/products/85cfd941-7fa9-485d-b8e0-08b1172762dd.jpg) |
| hp-15-fd1899nr-natural-silver.jpg | [The PC Wholesale gallery](https://www.thepcwholesale.com/wp-content/uploads/2025/12/8e1c5f1495bf3f13b74183f982687e6952969cb4-4-600x600.jpg) |
| hp-omnibook-3-17-dg0107dx-mica-silver.jpg | [Best Buy gallery](https://pisces.bbystatic.com/image2/BestBuy_US/images/products/ec2794e5-aa46-4f7e-8567-4a79f4a7733b.jpg) |

