# Firestore rules for site analytics

The analytics tracker (js/analytics.js) writes visitor data to two Firestore
collections. Firestore blocks those writes until these rules are added.

## How to add them (about 1 minute)

1. Go to https://console.firebase.google.com → project **sfsw-2d5c8**
2. **Firestore Database** → **Rules** tab
3. **Don't delete anything that's already there.** Find the line
   `match /databases/{database}/documents {`
   and paste the block below on the line right after it.
4. Click **Publish**.

```
    // ── Site analytics (js/analytics.js) ──
    // Anyone can write a page view / live ping in the exact expected shape.
    // Only the admin account can read or delete.
    function sfswIsAdmin() {
      return request.auth != null && request.auth.token.email == 'sfloridasw@gmail.com';
    }
    function sfswShortStr(v, n) { return v is string && v.size() <= n; }

    match /analytics_views/{id} {
      allow create: if request.resource.data.keys().hasOnly(
                         ['type','ev','val','page','title','src','ref','dev','vid','sid','newv','ts'])
                    && request.resource.data.type in ['view','event']
                    && request.resource.data.ts == request.time
                    && sfswShortStr(request.resource.data.ev, 40)
                    && sfswShortStr(request.resource.data.val, 120)
                    && sfswShortStr(request.resource.data.page, 200)
                    && sfswShortStr(request.resource.data.title, 120)
                    && sfswShortStr(request.resource.data.src, 60)
                    && sfswShortStr(request.resource.data.ref, 80)
                    && sfswShortStr(request.resource.data.dev, 10)
                    && sfswShortStr(request.resource.data.vid, 20)
                    && sfswShortStr(request.resource.data.sid, 20)
                    && request.resource.data.newv is bool;
      allow read, delete: if sfswIsAdmin();
    }

    match /analytics_live/{tab} {
      allow create, update: if request.resource.data.keys().hasOnly(
                                 ['page','title','src','dev','vid','since','gone','lastSeen'])
                            && request.resource.data.lastSeen == request.time
                            && sfswShortStr(request.resource.data.page, 200)
                            && sfswShortStr(request.resource.data.title, 120)
                            && sfswShortStr(request.resource.data.src, 60)
                            && sfswShortStr(request.resource.data.dev, 10)
                            && sfswShortStr(request.resource.data.vid, 20)
                            && request.resource.data.since is int
                            && request.resource.data.gone is bool;
      allow read, delete: if sfswIsAdmin();
    }
```

If your existing rules already have a broad rule like
`match /{document=**} { allow read, write: if ... }`, these still work —
Firestore allows a request if *any* matching rule allows it.
