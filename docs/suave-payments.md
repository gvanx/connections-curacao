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
