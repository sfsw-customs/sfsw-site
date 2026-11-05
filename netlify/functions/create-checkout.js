const FIREBASE_PROJECT_ID = 'sfsw-2d5c8';
const FIREBASE_API_KEY = 'AIzaSyD2VAX4MyQQ5nEptG7HOf0f2RQU2jUqGd8';

const SHIPPING_COST = 55;

// Keep in sync with PROMO_CODES in pages/checkout.html.
//   type: 'percent' | 'flat' (value = % or $ off) | 'shipping' (waives shipping cost)
//   target: omit for "$ off rods" · 'rodwrap' / 'splitwrap' to discount just that upgrade
//           (only applies if that upgrade was selected — i.e. its adder is > $0)
//   minItems: minimum number of rods required in cart to apply
//   perItem: true — value = $ off EACH rod in cart (requires minItems)
//   extraPerItem: value = $ off total, PLUS this many $ off each rod beyond minItems
//   type 'wrapPlusTier': waives 100% of the Rod Wrap upgrade AND takes a flat
//           amount off the order once. The flat amount is the highest tier any
//           eligible rod qualifies for (tiers by rodType, else tierDefault).
//           Performance-only builds are excluded from the whole calculation.
//   type 'wrapSale': percent off every upgraded Rod Wrap, and 100% off the
//           Rod Wraps named in freeWraps. Split Wraps, Guide Wraps, Abalone and
//           Performance-only builds are not discounted.
const PROMO_CODES = {
  '50WRAPS':   { type: 'wrapSale', percent: 50,
                 freeWraps: ['Snowflake Wrap', '2 Axis Cross Wrap'],
                 expires: '2026-11-30' }
};

// Performance-only builds are the ones carrying a "Performance Discount" line.
function isPerformanceItem(item) {
  return (item.lines || []).some(l => l.label === 'Performance Discount');
}

// 100% off the Rod Wrap upgrade, plus one flat tier discount for the order.
function wrapPlusTierDiscount(promo, items, rodSubtotal) {
  const eligible = (items || []).filter(it => !isPerformanceItem(it));
  if (!eligible.length) return 0;                       // performance-only cart
  const wrapCost = sumLineAdder(eligible, 'Rod Wrap');  // waived in full
  const tier = Math.max(...eligible.map(it =>
    Object.prototype.hasOwnProperty.call(promo.tiers || {}, it.rodType)
      ? promo.tiers[it.rodType]
      : promo.tierDefault));
  return Math.min(wrapCost + tier, rodSubtotal);
}

// 'wrapSale': percent off each upgraded Rod Wrap, free for the wraps in freeWraps.
// Reads the "+$NN" adder from each item's Rod Wrap line (e.g. "Snowflake Wrap  +$100").
function wrapSaleDiscount(promo, items) {
  let d = 0;
  (items || []).forEach(item => {
    if (isPerformanceItem(item)) return;
    (item.lines || []).forEach(l => {
      if (l.label !== 'Rod Wrap') return;
      const v = String(l.value);
      if (v.includes('Abalone')) return;
      const m = v.match(/\+\$([\d.]+)/);
      if (!m) return;
      const adder = parseFloat(m[1]);
      const free = (promo.freeWraps || []).some(n => v.startsWith(n));
      d += free ? adder : adder * (promo.percent || 0) / 100;
    });
  });
  return Math.round(d * 100) / 100;
}

function wrapTargetLabel(target) { return target === 'splitwrap' ? 'Split Wrap' : 'Rod Wrap'; }

// Sums the "+$NN" adder parsed out of a cart-item line's value text (e.g. "Diamond Wrap  +$50").
// Abalone Wrap is excluded from every wrap-related promo discount.
function sumLineAdder(items, label) {
  let total = 0;
  (items || []).forEach(item => {
    (item.lines || []).forEach(l => {
      if (l.label === label && !String(l.value).includes('Abalone')) {
        const m = String(l.value).match(/\+\$([\d.]+)/);
        if (m) total += parseFloat(m[1]);
      }
    });
  });
  return total;
}

function calcTotals(rodSubtotal, shipping, discount) {
  const subtotal = Math.max(0, rodSubtotal - discount) + shipping;
  const subtotalCents = Math.round(subtotal * 100);
  let totalCents = Math.ceil((subtotalCents + 30) / (1 - 0.029));
  if (totalCents - Math.round(totalCents * 0.029 + 30) < subtotalCents) totalCents++;
  return { totalCents, total: totalCents / 100 };
}

function toFs(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string')  return { stringValue: value };
  if (typeof value === 'number')  return { doubleValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value))       return { arrayValue: { values: value.map(toFs) } };
  if (typeof value === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(value)) fields[k] = toFs(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const {
      items, customerName, customerEmail, customerPhone, customerAddress,
      shippingMethod, shippingCost, promoCode, orderSummary
    } = JSON.parse(event.body);

    const rodSubtotal = items.reduce((sum, item) => sum + item.total, 0);
    // Shipping cost is derived from the chosen method, not trusted from the client.
    let shipping = shippingMethod === 'shipping' ? SHIPPING_COST : 0;

    // Validate promo server-side — never trust a client-supplied discount/total.
    let discount = 0;
    let appliedPromoCode = '';
    if (promoCode) {
      const promo = PROMO_CODES[String(promoCode).trim().toUpperCase()];
      const notExpired = !promo || !promo.expires || new Date() <= new Date(promo.expires + 'T23:59:59');
      const qualifies = promo && notExpired && (!promo.minItems || items.length >= promo.minItems);
      if (qualifies && promo.type === 'shipping') {
        appliedPromoCode = String(promoCode).trim().toUpperCase();
        shipping = 0;
      } else if (qualifies && promo.type === 'wrapSale') {
        const d = Math.min(wrapSaleDiscount(promo, items), rodSubtotal);
        if (d > 0) {
          appliedPromoCode = String(promoCode).trim().toUpperCase();
          discount = d;
        }
      } else if (qualifies && promo.type === 'wrapPlusTier') {
        const d = wrapPlusTierDiscount(promo, items, rodSubtotal);
        if (d > 0) {
          appliedPromoCode = String(promoCode).trim().toUpperCase();
          discount = d;
        }
      } else if (qualifies && promo.target) {
        const wrapCost = sumLineAdder(items, wrapTargetLabel(promo.target));
        if (wrapCost > 0) {
          appliedPromoCode = String(promoCode).trim().toUpperCase();
          const raw = promo.type === 'percent' ? wrapCost * promo.value / 100 : promo.value;
          discount = Math.min(raw, wrapCost);
        }
      } else if (qualifies && promo.perItem) {
        appliedPromoCode = String(promoCode).trim().toUpperCase();
        discount = Math.min(promo.value * items.length, rodSubtotal);
      } else if (qualifies && promo.extraPerItem) {
        appliedPromoCode = String(promoCode).trim().toUpperCase();
        const extra = promo.extraPerItem * Math.max(0, items.length - promo.minItems);
        discount = Math.min(promo.value + extra, rodSubtotal);
      } else if (qualifies) {
        appliedPromoCode = String(promoCode).trim().toUpperCase();
        const raw = promo.type === 'percent' ? rodSubtotal * promo.value / 100 : promo.value;
        discount = Math.min(raw, rodSubtotal);
      }
    }

    const { totalCents, total } = calcTotals(rodSubtotal, shipping, discount);
    const amountCents = totalCents;

    // Create Stripe PaymentIntent
    const params = new URLSearchParams();
    params.append('amount', String(amountCents));
    params.append('currency', 'usd');
    // Card only — covers Apple Pay, Google Pay, and Link via Payment Element
    params.append('payment_method_types[0]', 'card');
    params.append('metadata[customerName]', customerName || '');
    params.append('metadata[customerEmail]', customerEmail || '');
    params.append('metadata[customerPhone]', customerPhone || '');
    params.append('metadata[delivery]', shippingMethod || 'pickup');
    if (appliedPromoCode) params.append('metadata[promoCode]', appliedPromoCode);

    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const intent = await stripeRes.json();
    if (!intent.client_secret) throw new Error(intent.error?.message || 'Stripe error');

    // Save full order to Firestore
    const orderDoc = {
      customerName:    customerName || '',
      customerEmail:   customerEmail || '',
      customerPhone:   customerPhone || '',
      customerAddress: customerAddress || '',
      shippingMethod:  shippingMethod || 'pickup',
      shippingCost:    shipping,
      rodSubtotal,
      promoCode:       appliedPromoCode,
      discountAmount:  discount,
      grandTotal:      total,
      paymentIntentId: intent.id,
      status:          'pending',
      createdAt:       new Date().toISOString(),
      orderSummary:    orderSummary || '',
      items,
    };

    const fsFields = {};
    for (const [k, v] of Object.entries(orderDoc)) fsFields[k] = toFs(v);

    await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/orders?documentId=${intent.id}&key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: fsFields }),
      }
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ clientSecret: intent.client_secret }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
