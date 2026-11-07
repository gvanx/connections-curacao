# Order emails

Both Connections Curaçao and Gift Card Curaçao use EmailJS service
`service_jbzcbpk` and template `template_ckyri4m`.

Subject: `{{storeName}} | Order {{orderId}} | Payment pending`

The shared template is in `emailjs-order-template.html`. Paste its contents into
the EmailJS Code Editor and save. Template changes are managed in EmailJS, not
automatically deployed by this repository. Keep the existing recipient and
sender settings. Double-brace variables escape customer-supplied content; do not
change them to unescaped triple braces.

Both checkouts send store name and URL, UTC order time, customer name/WhatsApp,
line items and quantities, XCG subtotal and amount due, delivery fee and address,
payment type, remaining balance, coin amount, rate, network, wallet, consent and
verification status. The legacy `name`, `whatsapp`, `product`, `amount`, `type`,
`payment`, `orderId`, `delivery`, and `message` fields remain available.

Checkout submissions are **unverified order requests**. Staff must verify the
actual payment before fulfilling an order. The owner chose direct wallet payments
and manual verification; there is no payment processor, automatic verification,
or automatic gift-code delivery. Transaction hashes are not collected at checkout
and are explicitly labelled `Not submitted`; customers send payment proof through
WhatsApp. Do not interpret a browser notification or screenshot as payment proof.

The complete order summary remains in `message`, including item prices and
quantities, for compatibility with alternate template layouts. Notification
failure must not hide payment instructions or the WhatsApp order handoff.
