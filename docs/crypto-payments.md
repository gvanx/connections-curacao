# USDT and USDC payments

The Connections storefront checkout accepts Sentoo, USDT and USDC. Gift-card
links continue to use the separate Gift Card Curaçao store and its payment methods.

Both stablecoins use **Ethereum (ERC-20)** and the owner-provided receiving wallet:
`0x4E7d1D58Ed7dfe63a15EdCa83437BB6AC7A6eF0e`.

The amount due is the current XCG payment amount divided by **1.74**, rounded to
two decimal places. There is **no Connections crypto fee**. Customers pay any
network or exchange withdrawal fees separately. Delivery fees are included before
conversion. Reservations use the existing XCG 100 deposit, capped at the product
price; the remaining product balance stays in XCG.

Customers choose a coin, review the amount and network, and receive the wallet
address with copy buttons. They send their order, transaction hash and payment
proof through WhatsApp. Staff must verify the actual received token, Ethereum
network, destination and amount before confirming payment or releasing goods.
Checkout only creates a pending order; it does not verify blockchain transfers.

Payment settings are in `CHECKOUT_CONFIG.crypto` in `js/checkout.js`. Set
`enabled` to `false` to pause crypto while keeping Sentoo available. Missing or
invalid destinations are not offered. Update the checkout script version in
`index.html` when changing payment settings so visitors load the new configuration.

Validation: `node --test tests/*.test.cjs` and `node --check js/checkout.js`.
