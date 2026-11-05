// ── SFSW SITE ANALYTICS ──
// Lightweight, cookie-free visitor tracking. Writes straight to the SFSW
// Firestore project over its REST API (no Firebase SDK needed on public pages).
//
//   analytics_views/{id}  one doc per page view or tracked event (history)
//   analytics_live/{tab}  one doc per open browser tab, refreshed every 30s
//                         while the tab is visible (the "on site now" count)
//
// Visitors get a random anonymous ID in localStorage. No cookies, no IP
// addresses, no names/emails are stored. Loaded automatically by js/sfsw.js.
//
// Not tracked: the admin page, deploy previews / localhost, bots, and any
// browser where you've signed into the admin page (sets sfsw_no_track).
// To test on a non-live domain, run in the console:
//   localStorage.setItem('sfsw_track_debug','1')
(function () {
  'use strict';
  if (window.__sfswAnalytics) return;
  window.__sfswAnalytics = true;

  var PROJECT = 'sfsw-2d5c8';
  var API_KEY = 'AIzaSyD2VAX4MyQQ5nEptG7HOf0f2RQU2jUqGd8';
  var DOCS = 'projects/' + PROJECT + '/databases/(default)/documents/';
  var COMMIT_URL = 'https://firestore.googleapis.com/v1/projects/' + PROJECT +
    '/databases/(default)/documents:commit?key=' + API_KEY;
  var LIVE_HOSTS = ['sfsaltwater.com', 'www.sfsaltwater.com'];
  var HEARTBEAT_MS = 30000;          // live ping interval
  var IDLE_STOP_MS = 30 * 60000;     // stop pinging after 30 min of no input
  var SESSION_GAP_MS = 30 * 60000;   // new session after 30 min away

  // ── storage helpers (private mode can throw) ──
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  // ── should we track this page at all? ──
  var debug = lsGet('sfsw_track_debug') === '1';
  if (lsGet('sfsw_no_track') === '1' && !debug) return;
  if (LIVE_HOSTS.indexOf(location.hostname) === -1 && !debug) return;
  if (/\/admin(\.html)?$/.test(location.pathname)) return;
  var ua = navigator.userAgent || '';
  if (!debug && (navigator.webdriver || /bot|crawl|spider|slurp|headless|lighthouse|pingdom|preview|facebookexternalhit|bingpreview/i.test(ua))) return;

  function rid(n) {
    var a = 'abcdefghijklmnopqrstuvwxyz0123456789', s = '';
    var buf = (window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(n)) : null;
    for (var i = 0; i < n; i++) s += a[(buf ? buf[i] : Math.floor(Math.random() * 256)) % 36];
    return s;
  }

  // ── page identity ──
  function cleanPath(p) {
    p = (p || '/').replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
    return p.length > 1 ? p.replace(/\/$/, '') : '/';
  }
  var PAGE = cleanPath(location.pathname);
  var TITLE = (document.title || PAGE).replace(/\s*[—–|-]\s*(SFSW|South Florida Saltwater).*$/i, '').slice(0, 120);

  // ── device ──
  var DEV = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua) ||
            (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'tablet'
          : /Mobi|iPhone|iPod|Android/i.test(ua) ? 'mobile' : 'desktop';

  // ── traffic source ──
  function classify(host, utm) {
    var s = (utm || host || '').toLowerCase();
    if (!s) return 'direct';
    if (/google/.test(s)) return 'google';
    if (/instagram|^ig$/.test(s)) return 'instagram';
    if (/tiktok/.test(s)) return 'tiktok';
    if (/facebook|^fb$|fb\.com|messenger/.test(s)) return 'facebook';
    if (/youtube|youtu\.be/.test(s)) return 'youtube';
    if (/bing/.test(s)) return 'bing';
    if (/duckduckgo/.test(s)) return 'duckduckgo';
    if (/yahoo/.test(s)) return 'yahoo';
    if (/reddit/.test(s)) return 'reddit';
    if (/^t\.co$|twitter|^x\.com$/.test(s)) return 'x';
    if (/chatgpt|openai|perplexity|claude\.ai|gemini/.test(s)) return 'ai';
    if (/mail|outlook/.test(s)) return 'email';
    if (/qr/.test(s)) return 'qr';
    return s.replace(/^www\./, '').slice(0, 60);
  }
  var refHost = '';
  try { if (document.referrer) refHost = new URL(document.referrer).hostname.replace(/^www\./, ''); } catch (e) {}
  var external = refHost && LIVE_HOSTS.indexOf(refHost) === -1 && LIVE_HOSTS.indexOf('www.' + refHost) === -1;
  var utm = '';
  try { utm = new URLSearchParams(location.search).get('utm_source') || ''; } catch (e) {}

  // ── visitor + session ──
  var vid = lsGet('sfsw_vid');
  var isNewVisitor = !vid;
  if (!vid) { vid = rid(16); lsSet('sfsw_vid', vid); }

  var now = Date.now(), sess = null;
  try { sess = JSON.parse(lsGet('sfsw_sess') || 'null'); } catch (e) {}
  if (!sess || now - sess.last > SESSION_GAP_MS || utm || external) {
    // New session — or a fresh external arrival, which starts a new one.
    sess = { id: rid(12), src: classify(external ? refHost : '', utm), ref: external ? refHost.slice(0, 80) : '', last: now };
  }
  sess.last = now;
  lsSet('sfsw_sess', JSON.stringify(sess));
  function touchSession() { sess.last = Date.now(); lsSet('sfsw_sess', JSON.stringify(sess)); }

  var tab = ssGet('sfsw_tab');
  if (!tab) { tab = rid(12); ssSet('sfsw_tab', tab); }

  // ── Firestore REST ──
  function fv(v) {
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    return { stringValue: String(v == null ? '' : v) };
  }
  function fields(o) { var f = {}; for (var k in o) f[k] = fv(o[k]); return f; }
  function commit(writes, keepalive) {
    try {
      return fetch(COMMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writes: writes }),
        keepalive: !!keepalive,
        credentials: 'omit'
      }).then(function (r) {
        if (!r.ok && debug) r.text().then(function (t) { console.warn('[sfsw analytics]', r.status, t); });
        return r.ok;
      }).catch(function () { return false; });
    } catch (e) { return Promise.resolve(false); }
  }

  // ── history: page views + events ──
  function record(type, ev, val, keepalive) {
    var data = {
      type: type, ev: ev || '', val: (val || '').toString().slice(0, 120),
      page: PAGE, title: TITLE, src: sess.src, ref: sess.ref,
      dev: DEV, vid: vid, sid: sess.id, newv: isNewVisitor
    };
    return commit([{
      update: { name: DOCS + 'analytics_views/' + rid(20), fields: fields(data) },
      updateTransforms: [{ fieldPath: 'ts', setToServerValue: 'REQUEST_TIME' }],
      currentDocument: { exists: false }
    }], keepalive);
  }
  function trackEvent(name, val) { touchSession(); return record('event', name, val, true); }
  window.sfswTrack = trackEvent;   // e.g. sfswTrack('wrap_designer_open')

  // ── live presence ──
  var since = Date.now(), lastInput = Date.now(), timer = null;
  function ping(gone) {
    return commit([{
      update: { name: DOCS + 'analytics_live/' + tab, fields: fields({
        page: PAGE, title: TITLE, src: sess.src, dev: DEV, vid: vid,
        since: since, gone: !!gone
      }) },
      updateTransforms: [{ fieldPath: 'lastSeen', setToServerValue: 'REQUEST_TIME' }]
    }], !!gone);
  }
  function tick() {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - lastInput > IDLE_STOP_MS) return;
    ping(false);
  }
  function start() {
    record('view');
    ping(false);
    timer = setInterval(tick, HEARTBEAT_MS);
  }
  ['click', 'scroll', 'keydown', 'touchstart', 'mousemove'].forEach(function (t) {
    addEventListener(t, function () {
      var wasIdle = Date.now() - lastInput > IDLE_STOP_MS;
      lastInput = Date.now();
      if (wasIdle) { touchSession(); ping(false); }
    }, { passive: true, capture: true });
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { lastInput = Date.now(); touchSession(); ping(false); }
    else ping(true);
  });
  addEventListener('pagehide', function () { ping(true); });
  addEventListener('pageshow', function (e) { if (e.persisted) ping(false); });  // back/forward cache

  // ── automatic events ──
  // Checkout + contact/warranty forms go through Netlify functions; watch for them.
  if (window.fetch) {
    var origFetch = window.fetch;
    window.fetch = function (input, init) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        if (/create-checkout/.test(url)) {
          // Once per session, even if the checkout page re-creates the payment.
          if (ssGet('sfsw_co') !== sess.id) { ssSet('sfsw_co', sess.id); trackEvent('checkout_start'); }
        }
        else if (/save-message/.test(url)) {
          var kind = 'contact';
          try { kind = (JSON.parse(init && init.body).type) || 'contact'; } catch (e) {}
          trackEvent('form_submit', kind);
        }
      } catch (e) {}
      return origFetch.apply(this, arguments);
    };
  }
  // Add to cart (addToCart is defined globally by sfsw.js).
  function wrapCart() {
    if (typeof window.addToCart !== 'function' || window.addToCart.__tracked) return;
    var orig = window.addToCart;
    window.addToCart = function (item) {
      try { trackEvent('add_to_cart', item && (item.name || item.title || item.id)); } catch (e) {}
      return orig.apply(this, arguments);
    };
    window.addToCart.__tracked = true;
  }
  wrapCart();
  document.addEventListener('DOMContentLoaded', wrapCart);
  // Purchase: the order-success page, once per order.
  if (/order-success$/.test(PAGE)) {
    var qp = new URLSearchParams(location.search);
    var oid = qp.get('payment_intent') || '';
    var status = qp.get('redirect_status') || 'succeeded';
    var key = 'sfsw_purchase_' + oid;
    if (oid && status === 'succeeded' && !lsGet(key)) {
      lsSet(key, '1');
      setTimeout(function () { trackEvent('purchase', oid.slice(-12)); }, 0);
    }
  }
  // Any element with data-track="name" logs a click event.
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest && e.target.closest('[data-track]');
    if (el) trackEvent(el.getAttribute('data-track'), el.getAttribute('data-track-val') || '');
  }, true);

  start();
})();
