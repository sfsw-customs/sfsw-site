// ── BUILD A SIMILAR ROD ──
// Completed-order pages (build1.html …) get a "Build a Similar Rod" button.
// Clicking it saves that build's specs and opens the matching custom builder
// with ?similar=<build id>. The builder then calls sfswApplySimilarBuild(S, …)
// right before it first renders, which pre-selects the closest matching blank,
// size, reel seat, grip, butt, guides, colors and wraps.
//
// Build specs are free text (see js/builds-data.js), so matching is done by
// name. ALIASES below handles wording that differs between the two; anything
// that still can't be matched is left at the builder's default and listed in
// the banner so the customer knows to pick it.
(function () {
  'use strict';

  // Completed-order rodType → custom builder page
  var CUSTOM_PAGES = {
    'Finesse': 'finesse.html',
    'Inshore Spinning': 'inshore-spinning.html',
    'Heavy Inshore Spinning': 'heavy-inshore.html',
    'Saltwater Baitcaster': 'saltwater-baitcaster.html',
    'Offshore Spinning': 'offshore-spinning.html',
    'Bottom Fishing - Conventional': 'bottom-conventional.html',
    'Live Bait / Kingfish - Conventional': 'live-bait-conventional.html',
    'Pier Conventional': 'pier-conventional.html',
    'Pier Spinning': 'pier-spinning.html'
  };

  // Build-page wording → builder option name (both compared normalized)
  var ALIASES = {
    wrap: {
      '4 axis wrap': 'diamond 4 axis',
      'chevron 8 axis': '8 axis wrap',
      'abalone': 'abalone wrap',
      'snowflake': 'snowflake wrap',
      '4 axis decorative chevron': '4 axis decorative chevron or diamond',
      'cross wrap 2 axis': '2 axis cross wrap',
      'cross wrap 4 axis': '4 axis cross wrap'
    },
    seat: {
      'deluxe': 'deluxe', 'fuji deluxe trigger': 'deluxe', 'fuji deluxe': 'fuji deluxe',
      'at aluminum trigger': 'alps at', 'alps aluminum trigger': 'alps at'   // ALPS AT = aluminum trigger seat
    },
    butt: {
      'at aluminum butt': 'at weighted butt'
    }
  };

  var STORE_KEY = 'sfswSimilarBuild';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/\(.*?\)/g, ' ')
      .replace(/[—–\-·+\/,]/g, ' ')
      .replace(/[^a-z0-9.' ]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function toks(s) { return norm(s).split(' ').filter(Boolean); }
  var BRANDS = ['fuji', 'alps', 'at', 'american'];
  function score(val, cand) {
    var a = toks(val), b = toks(cand);
    if (!a.length || !b.length) return 0;
    if (norm(val) === norm(cand)) return 2;
    var bs = new Set(b), shared = a.filter(function (t) { return bs.has(t); }).length;
    // brand words must agree when both sides name one
    var ba = a.filter(function (t) { return BRANDS.indexOf(t) > -1; });
    var bb = b.filter(function (t) { return BRANDS.indexOf(t) > -1; });
    if (ba.length && bb.length && !bb.every(function (t) { return ba.indexOf(t) > -1; })) return 0;
    return 2 * shared / (a.length + b.length);
  }
  function best(val, list, nameOf, min) {
    var top = null, topScore = min == null ? 0.6 : min;
    (list || []).forEach(function (x) {
      var sc = score(val, nameOf(x));
      if (sc > topScore) { top = x; topScore = sc; }
    });
    return top;
  }
  function aliasOf(kind, v) { var a = ALIASES[kind] || {}; return a[norm(v)] || v; }
  function lenKey(s) { var m = String(s || '').match(/(\d+)\s*'\s*(\d*)/); return m ? m[1] + "'" + (m[2] || '0') : ''; }
  function lbKey(s) { var m = String(s || '').replace(/[–—]/g, '-').match(/(\d+)\s*-\s*(\d+)/); return m ? m[1] + '-' + m[2] : ''; }

  // ── on a completed-order page ──
  window.sfswSimilarUrl = function (build) {
    var page = build && CUSTOM_PAGES[build.rodType];
    return page ? page + '?similar=' + encodeURIComponent(build.id) : null;
  };
  window.sfswBuildSimilar = function (build) {
    var url = window.sfswSimilarUrl(build);
    if (!url) return;
    lsSet(STORE_KEY, JSON.stringify({ id: build.id, rodType: build.rodType, page: build.page, specs: build.specs, at: Date.now() }));
    if (typeof window.sfswTrack === 'function') window.sfswTrack('build_similar_click', build.id);
    window.location.href = url;
  };

  // ── on a custom builder page ──
  // D = { BLANKS, SEATS, GRIPS, GUIDES, ROD_WRAPS, GUIDE_WRAPS, BUTT_OPTIONS,
  //       GIMBAL_OPTIONS, HEATSHRINK_OPTIONS, SPLIT_WRAP_OPTIONS, WRAP_COLORS }
  window.sfswApplySimilarBuild = function (S, D) {
    var id = new URLSearchParams(location.search).get('similar');
    if (!id) return null;
    var saved = null;
    try { saved = JSON.parse(lsGet(STORE_KEY) || 'null'); } catch (e) {}
    if (!saved || saved.id !== id) return null;
    var spec = {};
    (saved.specs || []).forEach(function (s) { spec[s.label] = String(s.value || ''); });
    var matched = [], missed = [];
    function hit(label) { matched.push(label); }
    function miss(label, v) { if (v) missed.push(label + ': ' + v); }

    // Blank + size
    var blankV = spec['Blank'] || '';
    if (blankV && !/n\/a|custom/i.test(blankV)) {
      var blank = null, bScore = 0.59;
      (D.BLANKS || []).forEach(function (b) {
        var sc = Math.max(score(blankV, b.name), score(blankV, String(b.name).replace(/[()]/g, ' ')));
        if (sc > bScore) { blank = b; bScore = sc; }
      });
      if (blank) {
        S.blankId = blank.id; hit('Blank');
        var L = lenKey(spec['Length']), W = lbKey(spec['Line Weight']);
        var vs = blank.variants || [], vi = -1;
        vs.forEach(function (v, i) { if (vi < 0 && lenKey(v.length) === L && lbKey(v.lineWt) === W) vi = i; });
        var exact = vi > -1;
        if (vi < 0) {
          // next closest: same length if possible, then the nearest line rating
          var lbMid = function (k) { var m = /(\d+)-(\d+)/.exec(k); return m ? (+m[1] + +m[2]) / 2 : 0; };
          var lenIn = function (k) { var m = /(\d+)'(\d+)/.exec(k); return m ? +m[1] * 12 + +m[2] : 0; };
          var bestD = Infinity;
          vs.forEach(function (v, i) {
            var d = Math.abs(lenIn(lenKey(v.length)) - lenIn(L)) * 3 + Math.abs(lbMid(lbKey(v.lineWt)) - lbMid(W));
            if (d < bestD) { bestD = d; vi = i; }
          });
          if (vi < 0) vi = 0;
        }
        if (exact) hit('Size');   // otherwise the next closest size is used
        S.variantIdx = vi; S.variantAdder = (vs[vi] && vs[vi].adder) || 0;
        var ext = /extended to\s*(\d+)\s*'\s*(\d*)/i.exec(spec['Length'] || '');
        if (ext && 'extendLength' in S) S.extendLength = ext[1] + "'" + (ext[2] || '0');
      }  // blank not offered in this builder → keep the builder's default
    }

    // Reel seat
    if (spec['Reel Seat']) {
      var seat = best(aliasOf('seat', spec['Reel Seat']), D.SEATS, function (s) { return s.name; });
      if (seat) { S.seatId = seat.id; hit('Reel Seat'); } else miss('Reel Seat', spec['Reel Seat']);
    }

    // Grip (+ heat shrink)
    if (spec['Grip']) {  // grip / heat-shrink misses are silent too
      var parts = spec['Grip'].split('·'), g = norm(parts[0]);
      var flat = [];
      (D.GRIPS || []).forEach(function (grp) { (grp.items || []).forEach(function (it) { flat.push(it); }); });
      var has = function (gid) { return flat.some(function (it) { return it.id === gid; }) ? gid : null; };
      var cork = /cork/.test(g), epdm = /epdm/.test(g), custom = /custom/.test(g), full = /full/.test(g);
      var gid = epdm ? has('epdm')
        : cork ? (custom ? (full ? has('ccork-custom-full') : (has('ccork-custom-split') || has('ccork-custom-full')))
                         : (full ? has('cork-full') : has('cork-split')))
        : (custom ? has('eva-custom') : (full ? (has('eva-full') || has('eva-split')) : (has('eva-split') || has('eva-full'))));
      if (gid) { S.gripId = gid; hit('Grip'); }
      if (parts[1] && D.HEATSHRINK_OPTIONS) {
        var hs = best(parts[1].replace(/heat\s*shrink/i, ''), D.HEATSHRINK_OPTIONS, function (h) { return h.name; }, 0.5);
        if (hs) { S.heatShrinkId = hs.id; hit('Heat Shrink'); }
      }
    }

    // Butt / gimbal
    if (spec['Butt']) {
      var bv = spec['Butt'];
      var gim = /gimbal/i.test(bv) && D.GIMBAL_OPTIONS ? best(bv, D.GIMBAL_OPTIONS, function (x) { return x.name; }) : null;
      if (gim) { S.gimbalId = gim.id; hit('Gimbal'); }
      else {
        bv = aliasOf('butt', bv);
        var butt = best(bv, D.BUTT_OPTIONS, function (x) { return x.name; }, 0.7) ||
                   best(bv.replace(/\bfoam\b/i, 'EVA'), D.BUTT_OPTIONS, function (x) { return x.name; }, 0.7);
        if (butt) { S.buttId = butt.id; hit('Butt'); } else miss('Butt', bv);
      }
    }

    // Guides: frame group, then ring
    if (spec['Guides']) {
      var gv = spec['Guides'].split('+')[0].split(/\bw\//)[0];
      var grp = null, grpScore = 0;
      (D.GUIDES || []).forEach(function (G) {
        var gt = toks(G.group), vt = toks(gv);
        var all = gt.every(function (t) { return vt.indexOf(t) > -1; });
        var sc = all ? gt.length + 1 : score(gv, G.group);
        if (sc > grpScore && (all || sc >= 0.6)) { grp = G; grpScore = sc; }
      });
      if (grp) {
        var rest = toks(gv).filter(function (t) { return toks(grp.group).indexOf(t) < 0; });
        var item = null;
        if (rest.length) {
          item = (grp.items || []).find(function (it) { return norm(it.name) === rest.join(' '); }) ||
                 best(rest.join(' '), grp.items, function (it) { return it.name; }, 0.5);
        }
        item = item || (grp.items || [])[0];
        if (item) { S.guideId = item.id; hit('Guides'); }
        if (/silver/i.test(spec['Guides']) && grp.colors) { var ci = grp.colors.indexOf('Silver'); if (ci > -1) S.guideColorIdx = ci; }
        if (spec['Guides'].indexOf('+') > -1 || /\bw\//.test(spec['Guides'])) miss('Guide upgrade', spec['Guides'].replace(/^[^+]*\+|^.*w\//, '').trim());
      } else miss('Guides', spec['Guides']);
    }

    // Thread colors: first = main, rest = supporting
    if (spec['Colors'] && D.WRAP_COLORS) {
      var idxs = [], missingC = [];
      spec['Colors'].split('·').map(function (c) { return c.trim(); }).filter(Boolean).forEach(function (c) {
        var uv = /uv/i.test(c), met = /metallic/i.test(c);
        var name = norm(c.replace(/uv\s*resistant/i, '').replace(/metallic/i, ''));
        var grpName = uv ? 'uv-metallic' : met ? 'metallic' : undefined;
        var i = D.WRAP_COLORS.findIndex(function (w) { return norm(w.name) === name && (w.group || undefined) === grpName; });
        if (i < 0) i = D.WRAP_COLORS.findIndex(function (w) { return norm(w.name) === name; });
        if (i > -1 && idxs.indexOf(i) < 0) idxs.push(i); else if (i < 0) missingC.push(c);
      });
      if (idxs.length) { S.mainIdx = idxs[0]; S.supportIdxs = idxs.slice(1); hit('Colors'); }
      if (missingC.length) miss('Colors', missingC.join(', '));
    }

    // Rod wrap / performance build
    var perf = /performance/i.test(spec['Build Type'] || '') || /performance/i.test(spec['Rod Wrap'] || '');
    if (!perf && spec['Rod Wrap']) {
      var w = best(aliasOf('wrap', spec['Rod Wrap']), D.ROD_WRAPS, function (x) { return x.name; }, 0.7);
      if (w) { S.wrapId = w.id; S.wrapUserSelected = true; hit('Rod Wrap'); } else miss('Rod Wrap', spec['Rod Wrap']);
    }
    if (spec['Split Wrap'] && D.SPLIT_WRAP_OPTIONS) {
      var sw = best(spec['Split Wrap'], D.SPLIT_WRAP_OPTIONS, function (x) { return x.name; }, 0.6);
      if (sw) { S.splitWrapId = sw.id; hit('Split Wrap'); } else miss('Split Wrap', spec['Split Wrap']);
    }
    if (!perf && spec['Guide Wrap'] && D.GUIDE_WRAPS) {
      var gw = best(spec['Guide Wrap'], D.GUIDE_WRAPS, function (x) { return x.name; }, 0.7);
      if (gw) { S.guideWrapId = gw.id; S.guideWrapUserSelected = true; hit('Guide Wrap'); }  // else leave unselected
    }

    var result = { perf: perf, matched: matched, missed: missed, build: saved };
    if (perf) {
      var keepMain = S.mainIdx, keepSupport = (S.supportIdxs || []).slice();
      setTimeout(function () {
        if (typeof window.applyPerformanceMode !== 'function') return;
        S.performanceOnly = true;
        window.applyPerformanceMode(true);          // hides wrap sections, resets colors…
        S.mainIdx = keepMain; S.supportIdxs = keepSupport;   // …so put the build's colors back
        if (typeof window.updateAll === 'function') window.updateAll();
      }, 0);
    }
    showBanner(result);
    return result;
  };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function showBanner(r) {
    function put() {
      var hero = document.querySelector('.page-hero');
      if (!hero || document.getElementById('similar-banner')) return;
      var num = (String(r.build.page || '').match(/\d+/) || [''])[0];
      var div = document.createElement('div');
      div.id = 'similar-banner';
      div.style.cssText = 'max-width:1200px;margin:1.25rem auto 0;padding:1rem 1.25rem;border:1px solid rgba(201,148,26,.45);background:rgba(201,148,26,.07);border-radius:8px;font-size:14px;line-height:1.6;color:var(--c-text);width:calc(100% - 2rem)';
      div.innerHTML = '<strong style="color:var(--c-gold);font-family:var(--font-cond);letter-spacing:.08em;text-transform:uppercase;font-size:12px">Built from Completed Order' + (num ? ' #' + num : '') + '</strong><br>'
        + 'We\'ve pre-selected the specs from that rod. Review each section below and change anything you like.'
        + (r.perf ? '<br><span style="color:var(--c-muted)">That rod was a Performance Build, so Performance Only is turned on.</span>' : '')
        + (r.missed.length ? '<br><span style="color:var(--c-muted)">Pick these by hand if you want them: ' + esc(r.missed.join(' · ')) + '</span>' : '');
      hero.insertAdjacentElement('afterend', div);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', put); else put();
  }
})();
