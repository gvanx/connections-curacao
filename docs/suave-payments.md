# Suave QR requests

Customers select Suave, enter their name and WhatsApp number, and request a QR
code. The site prepares an order request and a WhatsApp draft. Staff create the
actual Suave payment QR for the quoted amount and send it to the customer through
WhatsApp. The website does not generate a generic QR or claim payment approval.

The Suave amount is the XCG amount due at checkout multiplied by **1.03**, rounded
once to two decimal places. The 3% fee is displayed separately. Delivery, if
selected, is included before multiplication. A reservation applies the fee only
to the amount being paid now; it does not reduce the remaining product balance.

Examples: XCG 100 becomes XCG 103.00; XCG 100 plus XCG 35 delivery becomes
XCG 139.05. A gift-card cart totalling XCG 110 becomes XCG 113.30.

Staff emails include `staffAction`, `qrAmount`, `paymentFee`, and status
`Awaiting Suave QR code — payment not verified`. The shared EmailJS template
displays the exact amount staff should put on the QR. Staff verify the Suave
payment before fulfilment; any plan and approval are handled by Suave.

To pause this option, set `CHECKOUT_CONFIG.suave.enabled` to false on Connections,
or `config.suave.enabled` to false in Gift Card Curaçao's `data/store.json`.
Sentoo and direct USDT/USDC payments keep their existing pricing and workflow.

## Twelve-month phone offers

The `/suave/` page selects six new iPhone and Samsung models from the current
`data/products.json` catalog. `suave/offers.js` shares the same quote function
between the offer cards and calculator. The calculator takes the product price,
deducts an optional cash/card contribution, then adds the 3% store fee once.
This optional extra payment to Connections is separate from the first monthly
instalment. Suave charges the first of the 12 monthly payments when the customer
collects the device; it is included in the 12 payments, not an additional payment.
The twelve-month estimate uses the existing 1.465 plan factor; Suave confirms
the actual schedule and approval. Card WhatsApp links are enquiries, not orders
or approval confirmations. Meta `Contact` records a click, not a completed sale.

The Suave wordmark in `suave/suave-logo-white.svg` preserves the original vector
paths from page 2 of the supplied Suave Visual Identity Guidelines v3.12
(October 7, 2026). The page uses the guide's digital blue `#347AF0`, white and
Montserrat, while retaining Connections identification.
