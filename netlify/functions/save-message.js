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

function toFs(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string')  return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
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
    const data = JSON.parse(event.body);

    const doc = {
      type:      data.type || 'contact',
      name:      data.name || '',
      phone:     data.phone || '',
      email:     data.email || '',
      rod:       data.rod || '',
      message:   data.message || '',
      createdAt: new Date().toISOString(),
      read:      false,
    };

    const fsFields = {};
    for (const [k, v] of Object.entries(doc)) fsFields[k] = toFs(v);

    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/messages?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: fsFields }),
      }
    );

    if (!res.ok) throw new Error('Firestore write failed');

    // Push notification to admin's phone
    if (doc.type === 'warranty') {
      await sendPushNotification(
        'New Warranty Claim',
        `${doc.name || 'Someone'} submitted a claim`
      );
    } else {
      await sendPushNotification(
        'New Message',
        `${doc.name || 'Someone'} sent a message`
      );
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
