// ── CUSTOM WRAP DESIGNER (rod builder side) ──
// The designer itself is /wrap-designer/ (SFSW's own copy, no outside service).
// A builder page opens it in a full-screen panel; when the customer taps
// "Use This Design" the designer posts the design back here and we:
//   • price it as the matching Rod Wrap option (same price, no design fee)
//   • set the thread colors from the design
//   • keep the design (picture + pattern, axes, angle, colors) on the rod so
//     it travels through the cart and checkout into the admin order.
(function () {
  'use strict';

  // Each WRAP_COLORS entry gets its own hex in the designer: metallic / UV
  // threads that share a hex with a regular thread are nudged by 1 so the
  // design can say exactly which thread was picked. Must match the rule used
  // to build /wrap-designer/index.html.
  function designHexes(colors) {
    var used = {}, out = [];
    colors.forEach(function (c) {
      var v = parseInt(String(c.hex).slice(1), 16), h;
      while (used[h = '#' + ('000000' + v.toString(16)).slice(-6)]) v = (v + 1) & 0xffffff;
      used[h] = 1; out.push(h);
    });
    return out;
  }

  // Design → Rod Wrap option (by name, so prices come from the page's ROD_WRAPS)
  function wrapNameFor(d) {
    var axes = +d.axes || 2;
    if (/cross/i.test(d.kind || '')) {
      if (/snowflake/i.test(d.pattern || '')) return 'Snowflake Wrap';
      return axes >= 4 ? '4 Axis Cross Wrap' : '2 Axis Cross Wrap';
    }
    var chev = /chevron/i.test(d.pattern || d.kind || '');
    if (axes >= 16) return '16 Axis Wrap';
    if (axes >= 8) return '8 Axis Wrap';
    return (chev ? 'Chevron' : 'Diamond') + ' — ' + (axes >= 4 ? 4 : 2) + ' Axis';
  }

  function summary(d) {
    if (/cross/i.test(d.kind || '')) return (d.pattern || 'Cross wrap') + ' cross wrap · ' + (d.axes || 2) + ' axis';
    return (d.pattern || d.kind || 'Diamond') + ' · ' + (d.axes || 2) + ' axis' + (d.angle ? ' · ' + d.angle : '');
  }

  var overlay = null, onDesign = null;
  function close() {
    if (!overlay) return;
    overlay.style.display = 'none';
    document.documentElement.style.overflow = '';
  }
  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'wrap-designer-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:600;background:#0a0e12;display:none;flex-direction:column';
    overlay.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.75rem 1rem;border-bottom:1px solid rgba(255,255,255,.08);background:#0a0e12">' +
        '<span style="font-family:var(--font-cond);font-weight:600;letter-spacing:.14em;text-transform:uppercase;font-size:13px;color:var(--c-gold)">Design Your Own Wrap</span>' +
        '<div style="display:flex;gap:8px">' +
          '<button type="button" id="wrap-designer-close" style="background:none;border:1px solid rgba(255,255,255,.15);color:#e8e4dc;border-radius:4px;padding:6px 14px;font-family:var(--font-cond);font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;cursor:pointer">✕ Close</button>' +
          '<button type="button" id="wrap-designer-use" style="background:var(--c-gold);border:1px solid var(--c-gold);color:#0a0e12;border-radius:4px;padding:6px 16px;font-family:var(--font-cond);font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;cursor:pointer">Use This Design ✓</button>' +
        '</div>' +
      '</div>' +
      '<iframe id="wrap-designer-frame" title="Wrap designer" style="flex:1;width:100%;border:0;background:#0a0e12"></iframe>';
    document.body.appendChild(overlay);
    overlay.querySelector('#wrap-designer-close').onclick = close;
    // the same "Use This Design" as the button at the bottom of the designer, always in reach
    overlay.querySelector('#wrap-designer-use').onclick = function () {
      var f = document.getElementById('wrap-designer-frame'), btn = this;
      var get = f && f.contentWindow && f.contentWindow.sfswDesignState;
      if (typeof get !== 'function') return;
      btn.disabled = true;
      Promise.resolve(get()).then(function (d) { close(); if (typeof onDesign === 'function') onDesign(d); })
        .catch(function () {}).then(function () { btn.disabled = false; });
    };
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.style.display !== 'none') close(); });
    addEventListener('message', function (e) {
      var f = document.getElementById('wrap-designer-frame');
      if (!f || e.source !== f.contentWindow || e.origin !== location.origin) return;
      if (e.data && e.data.sfsw === 'design' && e.data.d) {
        close();
        if (typeof onDesign === 'function') onDesign(e.data.d);
      }
    });
    return overlay;
  }

  // opts: { colors: WRAP_COLORS, start: previous design or null, onDesign(design) }
  window.sfswOpenWrapDesigner = function (opts) {
    onDesign = opts.onDesign;
    var prev = opts.start, start = null;
    if (prev) {
      start = /cross/i.test(prev.kind || '')
        ? { mode: 'cross', pattern: prev.pattern, axes: prev.axes, colors: (prev.colors || []).map(function (c) { return c.hex; }) }
        : { mode: 'taper', pattern: /chevron/i.test(prev.pattern || '') ? 'chevron' : 'diamond', axes: prev.axes, colors: (prev.colors || []).map(function (c) { return c.hex; }) };
    }
    try { start ? sessionStorage.setItem('sfswDesignStart', JSON.stringify(start)) : sessionStorage.removeItem('sfswDesignStart'); } catch (e) {}
    var o = ensureOverlay(), f = o.querySelector('#wrap-designer-frame');
    f.src = '../wrap-designer/index.html?v=' + Date.now();   // fresh load each time (applies the starting design)
    o.style.display = 'flex';
    document.documentElement.style.overflow = 'hidden';
    if (typeof window.sfswTrack === 'function') window.sfswTrack('wrap_designer_open', prev ? 'edit' : 'new');
  };

  // Turn the designer's output into what the builder stores on the rod.
  // Returns { wrapName, colorIdxs, design }
  window.sfswReadWrapDesign = function (d, WRAP_COLORS) {
    var hexes = designHexes(WRAP_COLORS), idxs = [], colors = [];
    (d.colors || []).forEach(function (c) {
      var i = hexes.indexOf(String(c.c || '').toLowerCase());
      if (i < 0) return;
      var w = WRAP_COLORS[i];
      colors.push({ name: (w.group === 'uv-metallic' ? 'UV Metallic ' : w.metallic ? 'Metallic ' : '') + w.name, hex: hexes[i] });
      if (idxs.indexOf(i) < 0) idxs.push(i);
    });
    // thread counts per color, when the designer's setup lists them in the same order
    var st = d.setup && Array.isArray(d.setup.stripes) ? d.setup.stripes : null;
    var off = st ? (d.colors || []).length - st.length : -1;   // a center color comes first when it's on
    if (st && (off === 0 || off === 1)) {
      colors.forEach(function (c, i) { var x = st[i - off]; if (x && x.t != null) c.threads = x.t; });
      if (off === 1 && d.setup.center && d.setup.center.t != null && colors[0]) colors[0].threads = d.setup.center.t;
    }
    var design = {
      kind: d.kind || '', pattern: d.pattern || '', axes: +d.axes || 2, angle: d.angle || '', size: d.size || '',
      blank: d.blank || '', colors: colors, thumb: d.thumb || '', setup: d.setup || null,
      summary: summary(d)
    };
    if (typeof window.sfswTrack === 'function') window.sfswTrack('wrap_designer_use', design.summary);
    return { wrapName: wrapNameFor(d), colorIdxs: idxs, design: design };
  };
})();
