const Stripe = require('stripe');

const FIREBASE_PROJECT_ID = 'sfsw-2d5c8';
const FIREBASE_API_KEY = 'AIzaSyD2VAX4MyQQ5nEptG7HOf0f2RQU2jUqGd8';
const ONESIGNAL_APP_ID = '4d0c98a3-2bb3-4538-9ea1-75e81233478b';

async function sendPushNotification(title, message, url) {
  if (!process.env.ONESIGNAL_REST_API_KEY) {
    console.error('ONESIGNAL_REST_API_KEY not set — skipping push notification');
    return;
  }
  try {
    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': 'Key ' + process.env.ONESIGNAL_REST_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        target_channel: 'push',
        included_segments: ['Total Subscriptions'],
        headings: { en: title },
        contents: { en: message },
        url: url || 'https://sfsaltwater.com/pages/admin.html',
      }),
    });
    const resBody = await res.text();
    console.log('OneSignal response:', res.status, resBody);
  } catch (err) {
    console.error('Push notification failed:', err.message);
  }
}

function fromFs(fields) {
  const obj = {};
  for (const [k, v] of Object.entries(fields || {})) {
    if (v.stringValue  !== undefined) obj[k] = v.stringValue;
    else if (v.doubleValue  !== undefined) obj[k] = v.doubleValue;
    else if (v.integerValue !== undefined) obj[k] = Number(v.integerValue);
    else if (v.booleanValue !== undefined) obj[k] = v.booleanValue;
    else if (v.arrayValue)  obj[k] = (v.arrayValue.values || []).map(i =>
      i.mapValue ? fromFs(i.mapValue.fields) : (i.stringValue ?? i.doubleValue ?? null)
    );
    else if (v.mapValue) obj[k] = fromFs(v.mapValue.fields);
  }
  return obj;
}

function fmt(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildEmailHtml(order, piId) {
  const deliveryLabel = order.shippingMethod === 'shipping'
    ? `Shipping — ${fmt(order.shippingCost || 70)}`
    : 'Pick Up / Local Delivery — Free';

  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const itemsHtml = (order.items || []).map(item => {
    const linesHtml = (item.lines || []).map(l => `
      <tr>
        <td style="padding:5px 0;font-size:13px;color:#9a9088;width:130px;vertical-align:top">${l.label}</td>
        <td style="padding:5px 0;font-size:13px;color:#e8e0d4;text-align:right;vertical-align:top">${l.value}</td>
      </tr>
    `).join('');

    return `
      <div style="background:#1a1e22;border:1px solid #2a3038;border-radius:8px;padding:20px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #2a3038">
          <span style="font-family:Georgia,serif;font-size:15px;font-weight:700;color:#e8e0d4;letter-spacing:0.03em">${item.rodType}</span>
          <span style="font-family:Georgia,serif;font-size:15px;font-weight:700;color:#c8a96e">${fmt(item.total)}</span>
        </div>
        <table style="width:100%;border-collapse:collapse">
          ${linesHtml}
        </table>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmed — South Florida Saltwater</title>
</head>
<body style="margin:0;padding:0;background:#0d0f11;font-family:Georgia,serif">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0f11;padding:32px 16px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:0 0 28px">
              <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#e8e0d4;letter-spacing:0.08em">SFSW</div>
              <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:#c8a96e;margin-top:4px">South Florida Saltwater</div>
            </td>
          </tr>

          <!-- Hero banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1e22 0%,#141719 100%);border:1px solid #2a3038;border-radius:10px;padding:36px 32px;text-align:center">
              <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#c8a96e;margin-bottom:12px">Order Confirmed</div>
              <div style="font-family:Georgia,serif;font-size:26px;color:#e8e0d4;margin-bottom:10px">Thank you, ${order.customerName ? order.customerName.split(' ')[0] : 'there'}.</div>
              <div style="font-family:Arial,sans-serif;font-size:14px;color:#9a9088;line-height:1.65">Your custom rod is in the works. We will be in touch with you soon to confirm details and work with you throughout the process.</div>
            </td>
          </tr>

          <tr><td style="height:24px"></td></tr>

          <!-- Order meta -->
          <tr>
            <td style="background:#1a1e22;border:1px solid #2a3038;border-radius:8px;padding:20px 24px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#c8a96e;padding-bottom:14px" colspan="2">Order Details</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#9a9088;padding:4px 0;width:140px">Order Date</td>
                  <td style="font-size:13px;color:#e8e0d4;text-align:right">${orderDate}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#9a9088;padding:4px 0">Delivery</td>
                  <td style="font-size:13px;color:#e8e0d4;text-align:right">${deliveryLabel}</td>
                </tr>
                ${order.customerAddress ? `
                <tr>
                  <td style="font-size:13px;color:#9a9088;padding:4px 0;vertical-align:top">Ship To</td>
                  <td style="font-size:13px;color:#e8e0d4;text-align:right">${order.customerAddress}</td>
                </tr>` : ''}
                <tr>
                  <td style="font-size:13px;color:#9a9088;padding:4px 0">Reference</td>
                  <td style="font-size:12px;color:#9a9088;text-align:right">${piId}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="height:20px"></td></tr>

          <!-- Rod specs -->
          <tr>
            <td>
              <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#c8a96e;margin-bottom:12px">Your Build</div>
              ${itemsHtml}
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="background:#1a1e22;border:1px solid #2a3038;border-radius:8px;padding:20px 24px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:#9a9088;padding:5px 0">Rods</td>
                  <td style="font-size:13px;color:#e8e0d4;text-align:right">${fmt(order.rodSubtotal || 0)}</td>
                </tr>
                ${order.shippingMethod === 'shipping' ? `
                <tr>
                  <td style="font-size:13px;color:#9a9088;padding:5px 0">Shipping</td>
                  <td style="font-size:13px;color:#e8e0d4;text-align:right">${fmt(order.shippingCost || 0)}</td>
                </tr>` : ''}
                <tr>
                  <td style="font-size:13px;color:#9a9088;padding:5px 0">Processing fee (2.9% + $0.30)</td>
                  <td style="font-size:13px;color:#e8e0d4;text-align:right">${fmt((order.grandTotal || 0) - (order.rodSubtotal || 0) - (order.shippingCost || 0))}</td>
                </tr>
                <tr>
                  <td style="height:1px;background:#2a3038" colspan="2"></td>
                </tr>
                <tr>
                  <td style="font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#e8e0d4;padding-top:10px">Total Charged</td>
                  <td style="font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:#c8a96e;text-align:right;padding-top:10px">${fmt(order.grandTotal || 0)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="height:24px"></td></tr>

          <!-- Cancellation notice -->
          <tr>
            <td style="background:#1a1410;border:1px solid #3a2a18;border-radius:8px;padding:20px 24px">
              <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#c8a96e;margin-bottom:10px">Important — Please Read</div>
              <p style="font-family:Arial,sans-serif;font-size:13px;color:#b8a898;line-height:1.7;margin:0 0 8px">Production begins within 48 hours of your purchase timestamp. If you need to cancel or change any specs, you must reply to this email within 48 hours of purchase for a full refund.</p>
              <p style="font-family:Arial,sans-serif;font-size:13px;color:#b8a898;line-height:1.7;margin:0">After 48 hours, your order is locked into production and a 50% non-refundable material retainer applies to any cancellation. The remaining 50% will be returned to your original payment method. For full details, see our <a href="https://sfsaltwater.com/pages/terms.html" style="color:#c8a96e;text-decoration:none">Terms &amp; Conditions</a>.</p>
            </td>
          </tr>

          <tr><td style="height:24px"></td></tr>

          <!-- Contact -->
          <tr>
            <td style="text-align:center;padding:0 0 16px">
              <div style="font-family:Arial,sans-serif;font-size:13px;color:#9a9088;line-height:2">
                Questions? Reply to this email or reach us directly.<br>
                <a href="sms:+15618130004" style="color:#c8a96e;text-decoration:none">(561) 813-0004</a> &nbsp;·&nbsp;
                <a href="mailto:sfloridasw@gmail.com" style="color:#c8a96e;text-decoration:none">sfloridasw@gmail.com</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align:center;padding-top:20px;border-top:1px solid #1e2428">
              <div style="font-family:Arial,sans-serif;font-size:11px;color:#4a5058;line-height:1.8">
                South Florida Saltwater · Boca Raton, FL 33432<br>
                <a href="https://sfsaltwater.com/pages/privacy.html" style="color:#4a5058;text-decoration:none">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="https://sfsaltwater.com/pages/terms.html" style="color:#4a5058;text-decoration:none">Terms &amp; Conditions</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `;
}


exports.handler = async function(event) {
  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const sig = event.headers['stripe-signature'];

    // Verify the request actually came from Stripe
    let payload;
    try {
      payload = stripe.webhooks.constructEvent(
        event.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return { statusCode: 400, body: 'Invalid signature' };
    }

    if (payload.type === 'payment_intent.succeeded') {
      const piId = payload.data.object.id;

      // 1. Mark order as paid in Firestore
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/orders/${piId}?updateMask.fieldPaths=status&key=${FIREBASE_API_KEY}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { status: { stringValue: 'paid' } } }),
        }
      );

      // 2. Fetch full order from Firestore
      const fsRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/orders/${piId}?key=${FIREBASE_API_KEY}`
      );
      const fsData = await fsRes.json();
      const order = fromFs(fsData.fields || {});

      // 3. Send confirmation email via Resend
      if (order.customerEmail) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'South Florida Saltwater <orders@sfsaltwater.com>',
            to: [order.customerEmail],
            subject: 'Order Confirmed — South Florida Saltwater',
            html: buildEmailHtml(order, piId),
          }),
        });
      }

      // 4. Push notification to admin's phone
      await sendPushNotification(
        'New Order Placed',
        `${order.customerName || 'A customer'} — ${fmt(order.grandTotal || 0)}`
      );
    }

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Webhook error:', err.message);
    return { statusCode: 400, body: err.message };
  }
};
