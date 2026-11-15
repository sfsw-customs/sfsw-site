/* SFSW Rod Builder
   Turns a custom rod page into a step-by-step build with a live 3D rod on top:
     1 Blank → 2 Grips & Reel Seat → 3 Guides → 4 Wrap (+ split wrap on split grips) → 5 Guide Wraps
   The accessories are picked along the way (heat shrink + trim rings with the grips, hook keeper with the
   guides, decals with the wrap).

   It only rearranges the page that is already there: every option, price, the cart and checkout still come
   from the page's own script. The 3D rod is /rod-builder/rod.html, told what was picked after each change.

   To use on another custom rod page: add  <script src="../js/rod-builder.js"></script>  right after the
   page's own <script> block. Optional settings go before it:
     <script>window.SFSW_BUILDER = { type:'spinning', handle:{ seatAt:10, gButt:2.5, gRear:2.5, gFore:2.5 } }</script>
   type: 'spinning' | 'baitcaster' | 'conventional'.  handle: grip lengths / seat position in inches. */
(function () {
  'use strict';
  var CFG = Object.assign({ type: 'spinning', engine: '../rod-builder/rod.html', handle: null }, window.SFSW_BUILDER || {});
  var layout = document.querySelector('.configurator-layout'), col = document.querySelector('.cfg-steps');
  if (!layout || !col || typeof S === 'undefined' || typeof updateAll !== 'function') return;

  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  var fn = function (name) { try { return typeof window[name] === 'function' ? window[name] : (0, eval)('typeof ' + name + ' === "function" ? ' + name + ' : null'); } catch (e) { return null; } };
  var val = function (name) { try { return (0, eval)('typeof ' + name + ' !== "undefined" ? ' + name + ' : undefined'); } catch (e) { return undefined; } };
  var call = function (name) { var f = fn(name); if (!f) return undefined; try { return f.apply(null, [].slice.call(arguments, 1)); } catch (e) { return undefined; } };
  var secOf = function (bodyId) { var b = $(bodyId); return b ? b.closest('.cfg-section') : null; };

  // ───────────────────────── styles ─────────────────────────
  var css = [
    '.rb-page,.rb-page body{overflow-x:clip!important;overflow-y:visible!important}',   // overflow-x:hidden on the page stops the 3D rod staying at the top
    '.rb-on .build-strip{display:none!important}',
    '.rb-on .grip-photo-wrap,.rb-on .seat-photo-wrap,.rb-on .guide-photo-wrap{display:none!important}',
    '.acc-thumb.rb-seat-thumb{width:132px;height:56px;flex:0 0 132px}.rb-seat-thumb img{width:100%;height:100%;object-fit:contain;background:#0d1218}',
    '@media (max-width:560px){.acc-thumb.rb-seat-thumb{width:96px;flex-basis:96px;height:46px}}',   // the 3D rod shows these parts
    '.rb-on.configurator-layout{grid-template-columns:minmax(0,1fr)!important;grid-template-areas:"steps"!important}',   // the 3D rod and the picks take the full width
    '.rb-build .config-sidebar{position:static;width:auto;max-width:640px;margin:0 auto;grid-area:auto}',
    '.rb-stage{height:clamp(240px,42vh,440px)}',
    '.rb-tab .rb-tot{color:var(--c-gold-light);font-weight:600;margin-left:2px}',
    '.rb-step-last .rb-nav{max-width:640px;margin-left:auto;margin-right:auto}',
    '.rb-top{position:sticky;top:var(--rb-top,64px);z-index:40;background:var(--c-dark);padding-bottom:10px;margin-bottom:4px}',
    '.rb-stage{position:relative;height:clamp(230px,36vh,340px);border:1px solid var(--c-border);border-radius:var(--radius-md);overflow:hidden;background:radial-gradient(120% 90% at 50% 35%,#2a3a4c,#0a0e12)}',
    '.rb-stage iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}',
    '.rb-stage.rb-min{height:0;border:0}',
    '.rb-hide{position:absolute;top:8px;left:8px;z-index:2;font:600 11px var(--font-cond);letter-spacing:.12em;text-transform:uppercase;color:var(--c-muted);background:rgba(17,24,32,.85);border:1px solid var(--c-border2);border-radius:999px;padding:5px 11px;cursor:pointer}',
    '.rb-show{display:none;width:100%;font:600 12px var(--font-cond);letter-spacing:.14em;text-transform:uppercase;color:var(--c-gold);background:var(--c-dark2);border:1px solid var(--c-border);border-radius:var(--radius-md);padding:9px;cursor:pointer}',
    '.rb-stage.rb-min + .rb-show{display:block}',
    '.rb-approx{font-size:12px;line-height:1.4;color:var(--c-muted);padding:7px 2px 0}',
    '.rb-approx b{color:var(--c-gold-light);font-weight:600}',
    '.rb-tabs{display:flex;gap:6px;margin-top:10px}',
    '.rb-tab{flex:1 1 auto;min-width:0;display:flex;align-items:center;justify-content:center;gap:7px;padding:9px 6px;background:var(--c-dark2);border:1px solid var(--c-border);border-radius:var(--radius-md);color:var(--c-muted);font:600 12px var(--font-cond);letter-spacing:.05em;text-transform:uppercase;cursor:pointer;transition:border-color .2s,color .2s}',
    '.rb-tab .rb-n{flex:0 0 auto;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:11px;border:1px solid var(--c-border2);color:var(--c-muted)}',
    '.rb-tab .rb-t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.rb-tab.done .rb-n{background:rgba(201,148,26,.18);border-color:var(--c-gold);color:var(--c-gold-light)}',
    '.rb-tab.on{border-color:var(--c-gold);color:var(--c-text)}',
    '.rb-tab.on .rb-n{background:var(--c-gold);border-color:var(--c-gold);color:#0a0e12}',
    '@media (max-width:700px){.rb-tab:not(.on){flex:0 0 40px}.rb-tab:not(.on) .rb-t{display:none}.rb-stage{height:clamp(190px,30vh,260px)}}',
    '.rb-step{display:none}.rb-step.on{display:block}',
    '.rb-step-title{font-family:var(--font-display);font-size:24px;margin:8px 0 2px}',
    '.rb-step-title em{color:var(--c-gold);font-style:italic}',
    '.rb-step-sub{font-size:13px;color:var(--c-muted);margin-bottom:12px}',
    '.rb-on .cfg-section-head.rb-static{cursor:default}',
    '.rb-on .cfg-section-head.rb-static:hover{background:none}',
    '.rb-on .cfg-section-head.rb-static .cfg-section-chevron{display:none}',
    '.rb-optional{color:var(--c-muted)!important;font-size:12px!important}',
    '.rb-nav{display:flex;gap:10px;margin:14px 0 6px}',
    '.rb-nav .btn{justify-content:center;font-size:14px;padding:13px 16px}',
    '.rb-nav .rb-back{flex:0 0 auto}.rb-nav .rb-next{flex:1 1 auto}',
    '.rb-perf-note{display:none;background:var(--c-dark2);border:1px solid var(--c-border);border-radius:var(--radius-md);padding:14px 16px;font-size:13px;color:var(--c-muted);margin-bottom:10px}',
    '.rb-no3d{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:24px;font-size:14px;line-height:1.5;color:var(--c-muted)}.rb-no3d b{color:var(--c-text);font-weight:600}',
    '.rb-flash{animation:rbflash 1.2s ease}',
    '.rb-on #rod-wrap-options{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}',
    '.rb-on #rod-wrap-options .design-tile{display:none!important}',
    '.rb-on #rod-wrap-options .option-item{margin:0}',
    '.rb-on #rod-wrap-options > div:not(.option-item){grid-column:1/-1;margin:0!important}',
    '.rb-presets-lbl{font:600 11px var(--font-cond);letter-spacing:.18em;text-transform:uppercase;color:var(--c-gold);margin:14px 0 8px}',
    '.rb-dz{margin-top:16px;border-top:1px solid var(--c-border);padding-top:14px}',
    '.rb-dz-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}',
    '.rb-dz-head b{font-family:var(--font-display);font-size:20px;font-weight:400}.rb-dz-head b em{color:var(--c-gold)}',
    '.rb-dz-now{font-size:13px;color:var(--c-gold-light)}',
    '.rb-dz-note{font-size:12.5px;color:var(--c-muted);margin:4px 0 10px;line-height:1.45}',
    '.rb-dz iframe{display:block;width:100%;min-height:900px;border:0;background:#0a0e12}',
    '.rb-dz-load{font-size:13px;color:var(--c-muted);padding:20px 0}',
    '.rb-rg{margin:6px 0 10px;padding:12px 14px;background:var(--c-dark3);border:1px solid var(--c-border);border-radius:var(--radius);display:grid;gap:8px}',
    '.rb-rg-lbl{font-size:12.5px;color:var(--c-muted)}.rb-rg-lbl b{color:var(--c-text);font-weight:600}',
    '.rb-rg-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12.5px;color:var(--c-muted)}',
    '.rb-seg{display:inline-flex;flex-wrap:wrap;gap:0;border:1px solid var(--c-border2);border-radius:8px;overflow:hidden;width:max-content;max-width:100%}',
    '.rb-seg button{background:var(--c-dark2);color:var(--c-muted);border:0;border-right:1px solid var(--c-border);padding:7px 12px;font:600 12px var(--font-cond);letter-spacing:.08em;text-transform:uppercase;cursor:pointer}',
    '.rb-seg button:last-child{border-right:0}.rb-seg button[aria-pressed="true"]{background:var(--c-gold);color:#0a0e12}',
    '.rb-seg.rb-big button{padding:9px 16px}',
    '.rb-rg-tabs{display:flex;align-items:center;gap:12px;flex-wrap:wrap}',
    '.rb-tp{font-family:var(--font-body,inherit);text-transform:none;letter-spacing:0;font-weight:600;font-size:11.5px;color:var(--c-gold-light);margin-left:6px}',
    '.rb-seg button[aria-pressed="true"] .rb-tp{color:#0a0e12}',
    '.rb-rg-price{font-size:13px;color:var(--c-text)}.rb-rg-price b{color:var(--c-gold);font-weight:700}',
    '.rb-chips{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:6px;max-height:236px;overflow:auto;padding-right:2px}',
    '.rb-chips button{display:grid;gap:4px;justify-items:center;padding:6px 4px;background:var(--c-dark2);border:1px solid var(--c-border);border-radius:8px;color:var(--c-text);font-size:11px;line-height:1.2;cursor:pointer}',
    '.rb-chips button img{width:100%;height:34px;object-fit:cover;border-radius:4px;display:block}',
    '.rb-chips button[aria-pressed="true"]{border-color:var(--c-gold);box-shadow:0 0 0 1px var(--c-gold)}',
    '.rb-strip{overflow-x:auto;padding:2px 0}',
    '.rb-rings{position:relative;display:flex;height:52px;border-radius:6px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.45)}',
    '.rb-rings canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}',
    '.rb-rings button{position:relative;height:100%;border:0;padding:0;background:transparent center/cover;cursor:pointer;flex:0 0 auto}',
    '.rb-rings button:hover{box-shadow:inset 0 0 0 2px var(--c-gold)}',
    '.rb-rings.flat button{border-right:1px solid rgba(0,0,0,.35)}',
    '.rb-mini{background:var(--c-dark2);border:1px solid var(--c-border2);color:var(--c-text);border-radius:6px;padding:6px 10px;font-size:12px;cursor:pointer}',
    '.rb-rg-prev{display:grid;gap:10px;padding:18px 10px;justify-items:center}',
    '.rb-rg-prow{display:grid;gap:4px;justify-items:center}.rb-rg-plbl{font:600 11px var(--font-cond);letter-spacing:.14em;text-transform:uppercase;color:var(--c-gold)}',
    '.rb-rg-prev .rb-rings button{pointer-events:none}',
    '.rb-bl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}',
    '.rb-bl{aspect-ratio:1/1;display:flex;flex-direction:column;align-items:flex-start;gap:6px;text-align:left;padding:14px;background:var(--c-dark3);border:1px solid var(--c-border);border-radius:var(--radius-md);color:var(--c-text);cursor:pointer;overflow:hidden;transition:border-color .15s,background .15s}',
    '.rb-bl:hover{border-color:var(--c-border2)}.rb-bl.selected{border-color:var(--c-gold);background:rgba(201,148,26,.07);box-shadow:0 0 0 1px var(--c-gold)}',
    '.rb-bl-name{font-family:var(--font-cond);font-size:16px;font-weight:600;letter-spacing:.03em;line-height:1.15}',
    '.rb-bl-usa{font-family:var(--font-cond);font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--c-teal-light)}',
    '.rb-bl-desc{font-size:11.5px;line-height:1.45;color:var(--c-muted);display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;flex:0 0 auto}',
    '.rb-bl .rb-bl-desc{-webkit-line-clamp:3}.rb-t1 .rb-bl-desc{-webkit-line-clamp:2}.rb-t2 .rb-bl-desc,.rb-t3 .rb-bl-desc{-webkit-line-clamp:1}',
    '.rb-bl-more{align-self:flex-start;background:none;border:0;padding:0;margin-top:-2px;color:var(--c-gold);font-family:var(--font-cond);font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}',
    '.rb-bl-more:hover{text-decoration:underline}',
    '.rb-bl.open{aspect-ratio:auto;min-height:0}.rb-bl.open .rb-bl-desc{display:block!important;-webkit-line-clamp:unset!important;overflow:visible}',
    '.rb-bl-foot{margin-top:auto;width:100%;display:flex;justify-content:space-between;align-items:flex-end;gap:6px}',
    '.rb-bl-len{font-size:11px;color:var(--c-muted);line-height:1.3}.rb-bl.selected .rb-bl-len{color:var(--c-text)}',
    '.rb-bl-price{font-family:var(--font-cond);font-size:17px;font-weight:600;color:var(--c-gold);white-space:nowrap}',
    '.rb-bl-orig{font-size:12px;color:var(--c-muted);text-decoration:line-through;margin-right:4px}',
    '.rb-bl-var{grid-column:1/-1;position:relative;margin-top:2px;background:var(--c-dark3);border:1px solid var(--c-gold);border-radius:var(--radius-md);padding:10px 4px 4px;animation:rbpop .25s ease}',
    '.rb-bl-var::before{content:"";position:absolute;top:-9px;left:var(--caret,24px);border:9px solid transparent;border-top:0;border-bottom-color:var(--c-gold)}',
    '.rb-bl-var::after{content:"";position:absolute;top:-7px;left:calc(var(--caret,24px) + 1px);border:8px solid transparent;border-top:0;border-bottom-color:var(--c-dark3)}',
    '@keyframes rbpop{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}',
    '.rb-bl-var-h{font-family:var(--font-cond);font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--c-gold);padding:2px 12px 4px}',
    '@media (max-width:560px){.rb-bl-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rb-bl{padding:11px}.rb-bl .rb-bl-desc{-webkit-line-clamp:2}.rb-bl.rb-t1 .rb-bl-desc{-webkit-line-clamp:1}.rb-bl.rb-t2 .rb-bl-desc,.rb-bl.rb-t3 .rb-bl-desc{display:none}}',
    '.rb-on .guide-preview{display:none!important}',
    '.rb-gd-group{margin-bottom:16px}.rb-gd-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:8px}',
    '.rb-gd-head b{font-family:var(--font-cond);font-size:13px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--c-gold)}.rb-gd-head span{font-size:12.5px;color:var(--c-muted)}',
    '.rb-gd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}',
    '.rb-gd{display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:11px 12px;background:var(--c-dark3);border:1px solid var(--c-border);border-radius:var(--radius-md);color:var(--c-text);cursor:pointer;text-align:left;transition:border-color .15s,background .15s}',
    '.rb-gd:hover{border-color:var(--c-border2)}.rb-gd.selected{border-color:var(--c-gold);background:rgba(201,148,26,.07);box-shadow:0 0 0 1px var(--c-gold)}',
    '.rb-gd-name{font-family:var(--font-cond);font-size:14.5px;font-weight:600;letter-spacing:.03em}.rb-gd-price{font-family:var(--font-cond);font-size:13px;font-weight:600;color:var(--c-gold)}',
    '.rb-gd-det{margin-top:10px;padding:12px 14px;background:var(--c-dark3);border:1px solid var(--c-gold);border-radius:var(--radius-md);display:grid;gap:10px}',
    '.rb-gd-det-h{font-family:var(--font-cond);font-size:15px;font-weight:600}.rb-gd-det-h span{color:var(--c-gold);margin-left:6px}',
    '.rb-gd-desc{font-size:12.5px;line-height:1.5;color:var(--c-muted)}',
    '.rb-gd-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.rb-gd-k{font:600 10.5px var(--font-cond);letter-spacing:.16em;text-transform:uppercase;color:var(--c-muted);min-width:112px}',
    '.rb-gd-v{font-size:12.5px;color:var(--c-text)}',
    '.rb-gd-sw{display:flex;gap:6px}.rb-gd-sw button{width:26px;height:26px;border-radius:50%;border:2px solid var(--c-border2);cursor:pointer;padding:0}.rb-gd-sw button.on{border-color:var(--c-gold);box-shadow:0 0 0 2px rgba(201,148,26,.35)}',
    '.rb-gd-tips{display:flex;gap:6px;flex-wrap:wrap}.rb-gd-tips button{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;background:var(--c-dark2);border:1px solid var(--c-border2);border-radius:999px;color:var(--c-text);font-size:12.5px;cursor:pointer}',
    '.rb-gd-tips button b{color:var(--c-gold);font-weight:600}.rb-gd-tips button.on{border-color:var(--c-gold);background:rgba(201,148,26,.1)}',
    '.rb-gd-box{width:13px;height:13px;border-radius:3px;border:1.5px solid var(--c-muted);display:inline-block;position:relative}.rb-gd-tips button.on .rb-gd-box{border-color:var(--c-gold);background:var(--c-gold)}',
    '.rb-gd-tips button.on .rb-gd-box::after{content:"";position:absolute;left:3px;top:0;width:4px;height:8px;border:solid #0a0e12;border-width:0 2px 2px 0;transform:rotate(45deg)}',
    '@keyframes rbflash{0%,60%{box-shadow:0 0 0 2px var(--c-gold)}100%{box-shadow:0 0 0 2px transparent}}'
  ].join('\n');
  document.head.appendChild(el('style', null, css));

  // ───────────────────────── steps ─────────────────────────
  // an accessory group, lifted out of "Accessories / Upgrades" into its own card
  function accCard(markerId, title, key) {
    var m = $(markerId), g = m && m.closest('.acc-group'); if (!g) return null;
    var card = el('div', 'cfg-section rb-acc');
    card.dataset.rb = key;
    card.innerHTML = '<div class="cfg-section-head rb-static"><div class="cfg-section-head-left"><span class="cfg-section-label">' + title +
      '</span><span class="cfg-section-chosen rb-optional">Optional</span></div></div><div class="cfg-section-body open"></div>';
    var lbl = g.querySelector('.acc-group-label'); if (lbl) lbl.style.display = 'none';
    g.style.cssText = 'margin:0;padding:0;border:0';
    card.lastChild.appendChild(g);
    return card;
  }
  var perfBanner = col.querySelector('.perf-only-banner'), perfNote = $('perf-active-note');
  var perfBox = null;
  if (perfBanner) { perfBox = el('div'); perfBox.appendChild(perfBanner); if (perfNote) perfBox.appendChild(perfNote); }
  var gwPerf = el('div', 'rb-perf-note', 'Performance builds come with blacked-out guide wraps, so there is nothing to pick here.');

  var STEPS = [
    { title: 'Blank', sub: 'Pick the blank, then its length and power.', view: 'all',
      parts: [secOf('sec-blank')] },
    { title: 'Grips', sub: 'Grips and butt cap, plus heat shrink and trim rings if you want them.', view: 'handle',
      parts: [secOf('sec-grip'), accCard('acc-heatshrink-options', 'Heat Shrink', 'heatshrink'), secOf('sec-butt'), accCard('acc-trim-options', 'Trim Rings', 'trim')] },
    { title: 'Reel <em>Seat</em>', tab: 'Reel Seat', sub: 'The reel seat and its color.', view: 'handle',
      parts: [secOf('sec-seat')] },
    { title: 'Guides', sub: 'Frame, ring material and frame color.', view: 'guides',
      parts: [secOf('sec-guides'), accCard('acc-hookkeeper-options', 'Hook Keeper', 'hookkeeper')] },
    { title: 'Wrap', sub: 'Pick one of our wraps, then make it yours in the Wrap Designer: thread colors, counts and angle. Split grips can add a wrap between the rear grips.', view: 'wrap',
      parts: [perfBox, secOf('sec-wrap-color'), secOf('sec-rod-wraps'), secOf('sec-split-wrap'), accCard('acc-decal-count', 'Decals', 'decals')] },
    { title: 'Guide <em>Wraps</em>', tab: 'Guide Wraps', sub: 'How each guide is wrapped onto the blank.', view: 'guides',
      parts: [gwPerf, secOf('sec-guide-wraps')] },
    // the last step: everything picked, the total, Add to Cart
    { title: 'Your <em>Build</em>', tab: 'Your Build', sub: 'Everything you picked, with the total. Tap a step above to change anything.', view: 'all', last: true,
      parts: [(function () { var sb = document.querySelector('.config-sidebar'); if (!sb) return null; var w = el('div', 'rb-build'); w.appendChild(sb); return w; })()] }
  ];
  STEPS.forEach(function (s) { s.parts = s.parts.filter(Boolean); });
  STEPS = STEPS.filter(function (s) { return s.parts.length; });
  if (STEPS.length < 2) return;

  // section headers stop being accordions: everything in a step is open
  var VIEW_OF = { 'sec-blank': 'all', 'sec-grip': 'handle', 'sec-seat': 'handle', 'sec-butt': 'butt', 'sec-guides': 'guides',
    'sec-wrap-color': 'wrap', 'sec-rod-wraps': 'wrap', 'sec-split-wrap': 'handle', 'sec-guide-wraps': 'guides' };
  [].forEach.call(col.querySelectorAll('.cfg-section'), function (sec) {
    var head = sec.querySelector('.cfg-section-head'), body = sec.querySelector('.cfg-section-body'), lbl = sec.querySelector('.cfg-section-label');
    if (lbl) lbl.textContent = lbl.textContent.replace(/^\s*\d+\s*[—–-]\s*/, '');
    if (!head || !body || sec.classList.contains('rb-acc')) return;
    if (body.id === 'sec-split-wrap') {   // the one optional section: tap to add, tap again to take it off
      if (S.splitWrapId) { body.classList.add('open'); var ch = $('chev-split-wrap'); if (ch) ch.classList.add('open'); }
      return;
    }
    head.removeAttribute('onclick'); head.classList.add('rb-static'); body.classList.add('open');
  });
  var _toggle = window.toggleSection;
  if (typeof _toggle === 'function') window.toggleSection = function (id) {
    _toggle(id);
    if (id === 'sec-split-wrap' && !$(id).classList.contains('open') && S.splitWrapId) {
      S.splitWrapId = null; call('renderSplitWrapOptions'); updateAll();
    }
  };
  var splitChosen = $('chosen-split-wrap');

  var accSec = secOf('sec-accessories'); if (accSec) accSec.style.display = 'none';

  var top = el('div', 'rb-top');
  var stage = el('div', 'rb-stage', '<button type="button" class="rb-hide">Hide 3D rod</button>');
  var showBtn = el('button', 'rb-show', 'Show 3D rod'); showBtn.type = 'button';
  var approx = el('div', 'rb-approx'); approx.hidden = true;
  var tabs = el('div', 'rb-tabs'); tabs.setAttribute('role', 'tablist');
  top.appendChild(stage); top.appendChild(showBtn); top.appendChild(approx); top.appendChild(tabs);
  var panels = el('div', 'rb-panels');
  STEPS.forEach(function (s, i) {
    var t = el('button', 'rb-tab', '<span class="rb-n">' + (i + 1) + '</span><span class="rb-t">' + (s.tab || s.title) + '</span>');
    t.type = 'button'; t.setAttribute('role', 'tab'); t.onclick = function () { go(i, true); }; tabs.appendChild(t); s.tabEl = t;
    var p = el('div', 'rb-step');
    p.appendChild(el('h2', 'rb-step-title', s.title)); p.appendChild(el('div', 'rb-step-sub', s.sub));
    s.parts.forEach(function (x) { p.appendChild(x); });
    var nav = el('div', 'rb-nav'), next = STEPS[i + 1];
    if (i) { var b = el('button', 'btn btn-outline rb-back', '← Back'); b.type = 'button'; b.onclick = function () { go(i - 1, true); }; nav.appendChild(b); }
    if (next) { var n = el('button', 'btn btn-primary rb-next', 'Next: ' + (next.tab || next.title) + ' →'); n.type = 'button';
      n.onclick = function () { go(i + 1, true); }; nav.appendChild(n); }
    if (s.last) p.classList.add('rb-step-last');
    p.appendChild(nav); panels.appendChild(p); s.panel = p;
  });
  col.insertBefore(panels, col.firstChild); col.insertBefore(top, panels);
  layout.classList.add('rb-on'); document.documentElement.classList.add('rb-page');

  var cur = 0, reached = 0;
  // the site menu only counts when it really stays pinned to the top of the window while the page scrolls
  function navH() { var n = document.querySelector('.nav'); if (!n) return 0; var pos = getComputedStyle(n).position;
    if (pos === 'fixed') return n.offsetHeight;
    if (pos === 'sticky' && n.parentElement && (n.parentElement === document.body || n.parentElement.offsetHeight > innerHeight)) return n.offsetHeight;
    return 0; }
  function setTop() { top.style.setProperty('--rb-top', navH() + 'px'); }
  setTop(); addEventListener('resize', setTop);
  function go(i, scroll) {
    cur = Math.max(0, Math.min(STEPS.length - 1, i)); reached = Math.max(reached, cur);
    STEPS.forEach(function (s, k) {
      s.panel.classList.toggle('on', k === cur); s.tabEl.classList.toggle('on', k === cur);
      s.tabEl.classList.toggle('done', k < reached && k !== cur || (k < cur)); s.tabEl.setAttribute('aria-selected', k === cur);
    });
    lastView = null; view(STEPS[cur].view);
    if (typeof placeLengths === 'function') { placeLengths(); moreLinks(); }
    if (scroll) { var y = top.getBoundingClientRect().top + scrollY - navH() - 6; if (Math.abs(scrollY - y) > 4) scrollTo({ top: y, behavior: 'smooth' }); }
    if (typeof window.sfswTrack === 'function') { try { window.sfswTrack('rod_builder_step', STEPS[cur].tab || STEPS[cur].title.replace(/<[^>]+>/g, '')); } catch (e) {} }
  }
  function review() {
    var side = document.querySelector('.config-sidebar'), sum = document.querySelector('.config-summary') || side; if (!side) return;
    view('all');
    var r = side.getBoundingClientRect();
    if (r.top < navH() || r.top > innerHeight * 0.6) scrollTo({ top: r.top + scrollY - navH() - 10, behavior: 'smooth' });
    sum.classList.remove('rb-flash'); void sum.offsetWidth; sum.classList.add('rb-flash');
  }
  stage.querySelector('.rb-hide').onclick = function () { stage.classList.add('rb-min'); };
  showBtn.onclick = function () { stage.classList.remove('rb-min'); };

  // ───────────────────────── the 3D rod ─────────────────────────
  var frame = el('iframe'); frame.title = '3D preview of the rod you are building'; frame.src = CFG.engine; stage.insertBefore(frame, stage.firstChild);
  var rod = null, lastView = null, lastSent = '';
  function view(v) { if (!v || v === lastView) return; lastView = v; if (rod) rod.view(v); }
  var poll = setInterval(function () {
    try { var w = frame.contentWindow; if (w && w.SFSW_rod) { rod = w.SFSW_rod; clearInterval(poll); clearTimeout(giveUp); lastSent = ''; sync(); var v = lastView; lastView = null; rod.ready.then(function () { setTimeout(function () { view(v || STEPS[cur].view); }, 300); }); } } catch (e) {}
  }, 200);
  // no 3D on this device (WebGL off, or Chrome blocked it after a graphics reset): say so in the 3D box; the steps still work
  function no3D() { if (rod) return; clearInterval(poll); clearTimeout(giveUp); frame.remove();
    var m = el('div', 'rb-no3d', '<div><b>The 3D preview can\u2019t start in this browser right now.</b><br>Quit and reopen your browser, then reload this page. Your picks still work below.</div>');
    stage.appendChild(m); }
  var giveUp = setTimeout(no3D, 30000);
  (function () { try { var c = document.createElement('canvas'); if (!(c.getContext('webgl2') || c.getContext('webgl'))) setTimeout(no3D, 0); } catch (e) { setTimeout(no3D, 0); } })();
  frame.addEventListener('load', function () { try { frame.contentWindow.addEventListener('error', function (e) { if (/WebGL/i.test(String(e.message))) no3D(); }); } catch (e) {} });

  // the camera follows what is being picked
  panels.addEventListener('click', function (e) {
    var body = e.target.closest('.cfg-section-body'), card = e.target.closest('.rb-acc');
    var v = card ? ({ heatshrink: 'handle', trim: 'handle', hookkeeper: 'handle', decals: 'wrap' })[card.dataset.rb] : body && VIEW_OF[body.id];
    if (v) setTimeout(function () { view(v); }, 60);
  }, true);

  // ── what was picked → what the 3D rod shows ──
  var CORK_AS = { 'burl-horizontal': 'burl-camo', 'burl-vertical': 'burl-tiger', 'burnt': 'rubber', 'burnt-mix': 'rubber-chunk', 'cactus-1': 'burl-green', 'cactus-2': 'burl-green',
    'cactus-3': 'burl-green', 'green': 'spk-green', 'meadow': 'burl-green', 'red': 'burl-red', 'stacked-1': 'sandwich', 'stacked-2': 'sandwich', 'stacked-3': 'sandwich' };
  var SHRINK_AS = { xwrap: 'xflock', scale: 'fish', honey: 'honey' };
  var TRIM_AS = { 'at-trim': 'step', 'alps-trim': 'dimple', 'matagi-trim': 'slim' };
  var TRIM_COL = { Gunsmoke: 'Gunmetal', 'Pale Gold': 'Champagne', 'Dark Gunmetal': 'Gunmetal' };
  // rod wraps the 3D rod can lay thread for; the rest show the thread colors as a plain wrap
  var WRAP_AS = { 'diam-2': ['diamond', 2], 'chev-2': ['chevron', 2], 'chev-4': ['chevron', 4], 'diam-4': ['diamond', 4], 'dec-4': ['diamond', 4],
    'closed-4': ['diamond', 8], 'axis-16': ['diamond', 16], 'dragon': ['dragon', 8], '2axis-dragon': ['dragon', 8, true], 'trim-bands': ['trim', 2] };
  var hexOf = function (i) { var W = val('WRAP_COLORS') || [], c = W[i]; return c && /^#[0-9a-f]{6}$/i.test(c.hex) ? c.hex.toLowerCase() : '#1a1a1a'; };
  var rings = function (pieces) { var out = []; (pieces || []).forEach(function (p) { var n = +p.inches || 0, m = CORK_AS[p.patternId] || 'burl';
    while (n > 1e-6) { var t = n >= 0.5 ? 0.5 : 0.25; out.push({ m: m, t: t }); n -= t; } }); return out; };
  var total = function (r) { return r.reduce(function (a, x) { return a + x.t; }, 0); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  function wrapSpec(id, main, sup, design, notes, label) {
    var trims = { on: true, mm: 12, c: main, bands: sup[0] ? [{ c: sup[0], t: 3 }] : [], ends: sup[1] ? [{ c: sup[1], t: 2 }] : [] };
    var stripes = sup.length ? [{ c: main, t: 6 }].concat(sup.map(function (c, i) { return { c: c, t: i ? 2 : 3 }; })) : [{ c: main, t: 8 }];
    if (design) {
      if (!/cross/i.test(design.kind || '') && design.setup && Array.isArray(design.setup.stripes)) return { setup: design.setup };
      notes.push('your ' + label + ' design'); return { pattern: 'trim', axes: 2, stripes: stripes, trims: trims };
    }
    var m = WRAP_AS[id];
    if (!m) { notes.push('the ' + label + ' pattern'); return { pattern: 'trim', axes: 2, stripes: stripes, trims: trims }; }
    var spec = { pattern: m[0], axes: m[1], stripes: stripes, trims: trims };
    if (m[0] === 'dragon') spec.dragon = { line: sup[0] || '#1a1a1a', metal: main, over: { on: !!m[2], pattern: 'chevron', axes: 2 } };
    if (m[0] === 'trim') spec.trims = { on: true, mm: 20, c: main, bands: sup[0] ? [{ c: sup[0], t: 4 }] : [], ends: sup[1] ? [{ c: sup[1], t: 2 }] : [] };
    return spec;
  }
  function guideWrapSpec(id, main, sup, notes) {
    var a = sup[0] || main, b = sup[1] || sup[0] || main;
    if (id === 'blacked-out') return { under: false, underC: '#1a1a1a', footC: '#1a1a1a', bands: [{ c: '#1a1a1a', t: 4 }], trims: [{ c: '#1a1a1a', t: 3 }] };
    if (id === 'under-wrapped') return { under: true, underC: a, footC: main, bands: [{ c: b, t: 1 }], trims: [{ c: b, t: 2 }] };
    if (id !== 'gw-advanced') notes.push('the guide wrap pattern');
    return { under: true, underC: a, footC: main, bands: [{ c: main, t: 2 }, { c: b, t: 1 }, { c: main, t: 2 }, { c: b, t: 1 }], trims: [{ c: a, t: 2 }, { c: main, t: 1 }, { c: a, t: 2 }] };
  }

  function spec() {
    var notes = [], v = call('getVariant') || {}, grip = call('getGrip') || {}, seat = call('getSeat') || {}, guide = call('getGuide') || {}, grp = call('getGuideGroup') || {};
    var m = /(\d+)\s*'\s*(\d+)?/.exec(v.length || ''), len = m ? +m[1] * 12 + (+m[2] || 0) : 84;
    var p = { type: CFG.type, len: len, mat: grip.mat === 'eva' ? 'eva' : 'cork', style: grip.style === 'full' ? 'full' : 'split', eva: 'black', shrink: 'none' };
    if (CFG.handle) ['seatAt', 'gButt', 'gRear', 'gFore', 'gripSpan'].forEach(function (k) { if (CFG.handle[k] != null) p[k] = CFG.handle[k]; });
    var EV = val('EVA_COLORS');
    if (call('isCustomEvaGrip') && EV && EV[S.evaColorIdx]) p.eva = EV[S.evaColorIdx].id;
    if (S.heatShrinkId && SHRINK_AS[S.heatShrinkId]) { if (p.mat === 'eva') p.shrink = SHRINK_AS[S.heatShrinkId]; }
    // custom cork: the pieces picked on the page, ring by ring
    p.cork = null;
    var RGs = rgOn() ? rgState() : null;
    if (RGs) {
      p.cork = JSON.parse(JSON.stringify(RGs.g));
      if (p.style === 'split') { if (rgLen(p.cork.butt)) p.gButt = clamp(rgLen(p.cork.butt), 1, 20); if (rgLen(p.cork.rear)) p.gRear = clamp(rgLen(p.cork.rear), 1, 12); }
      if (rgLen(p.cork.fore)) p.gFore = clamp(rgLen(p.cork.fore), 1, 12);
    } else if (call('isCustomCorkGrip') && S.customCork) {
      var bot = rings(S.customCork.bottom), mid = rings(S.customCork.middle), tp = rings(S.customCork.top);
      if (p.style === 'split') {
        p.cork = { butt: bot, rear: mid.length ? mid : bot.slice(-1), fore: tp };
        if (total(bot)) p.gButt = clamp(total(bot), 1, 20); if (total(mid)) p.gRear = clamp(total(mid), 1, 12); if (total(tp)) p.gFore = clamp(total(tp), 1, 12);
      } else { p.cork = { full: bot.concat(mid), fore: tp }; if (total(tp)) p.gFore = clamp(total(tp), 1, 12); }
      Object.keys(p.cork).forEach(function (k) { if (!p.cork[k].length) delete p.cork[k]; });
      notes.push('custom cork');
    }
    p.seat = seat.id; var sc = call('selectedSeatColor'); p.seatCol = sc ? sc.name : null;
    p.lockOn = !!call('lockingRingActive'); var lc = call('selectedLockingRingColor'); if (lc) p.lockCol = lc.name;
    var bid = S.gimbalId || S.buttId; p.butt = bid; p.buttCol = (S.gimbalId ? (S.gimbalColor || {})[bid] : (S.buttColor || {})[bid]) || null;
    p.guide = guide.frame || grp.frame || null;
    var gn = guide.name || '';
    p.ring = /torzite/i.test(gn) ? 'Titanium Torzite' : /titanium/i.test(gn) && /sic/i.test(gn) ? 'Titanium SiC' : /sic/i.test(gn) ? 'SiC' : /ti-?forged/i.test(gn) ? 'TiForged' : 'Alconite';
    var gc = call('guideColorAt', S.guideColorIdx); p.gCol = gc ? gc.name : null;
    // trim rings sit on the fore grip first, then between the split grips
    var qty = 0, tid = null; Object.keys(S.trimRingQty || {}).forEach(function (k) { var q = S.trimRingQty[k] || 0; if (q > 0 && !tid) tid = k; qty += q; });
    p.chkFore = qty > 0; p.chkSplit = qty > 1 && p.style === 'split';
    if (tid) { p.checkType = TRIM_AS[tid] || 'slim'; var tc = (S.trimRingColor || {})[tid]; p.check = TRIM_COL[tc] || tc; }
    // wraps
    var main = hexOf(S.mainIdx), sup = (S.supportIdxs || []).map(hexOf);
    var dc = !S.performanceOnly && S.customDesign && S.customDesign.colors && S.customDesign.colors.length ? S.customDesign.colors.map(function (c) { return c.hex; }) : null;
    if (dc) { main = dc[0]; sup = dc.slice(1); }
    p.mainOn = true;
    if (S.performanceOnly) p.main = wrapSpec('trim-bands', main, sup, null, notes, 'rod wrap');
    else if (S.customDesign && S.customDesign.setup && S.customDesign.sfsw) p.main = { full: S.customDesign.setup, kind: S.customDesign.sfsw };
    else p.main = wrapSpec(S.wrapId, main, sup, S.customDesign, notes, 'rod wrap');
    var sw = call('isSplitGrip') ? call('getSplitWrap') : null;
    p.splitOn = !!sw; if (sw) p.split = wrapSpec(sw.id, main, sup, null, notes, 'split wrap');
    p.gw = guideWrapSpec(S.guideWrapId, main, sup, notes);
    return { p: p, notes: notes };
  }

  var syncT = null;
  function sync() {
    clearTimeout(syncT);
    syncT = setTimeout(function () {
      var s; try { s = spec(); } catch (e) { return; }
      approx.hidden = !s.notes.length;
      if (s.notes.length) approx.innerHTML = '<b>3D preview:</b> ' + s.notes.join(', ') + (s.notes.length > 1 ? ' are' : ' is') + ' a close match in your colors. See the photos for the real thing.';
      if (!rod) return;
      var key = JSON.stringify(s.p); if (key === lastSent) return; lastSent = key;
      rod.set(s.p);
    }, 90);
  }

  // every pick on the page ends in updateAll(): follow it
  var _update = window.updateAll;
  window.updateAll = function () {
    try {   // heat shrink only goes on foam (EVA) grips: hidden, and taken off the build, for cork grips
      var foam = (call('getGrip') || {}).mat === 'eva', hs = document.querySelector('.rb-acc[data-rb="heatshrink"]');
      if (hs) hs.style.display = foam ? '' : 'none';
      if (!foam && S.heatShrinkId) { S.heatShrinkId = null; call('renderAccessories'); }
    } catch (e) {}
    try { rgPrice(); } catch (e) {}
    var r = _update.apply(this, arguments);
    try {
      gwPerf.style.display = S.performanceOnly ? 'block' : 'none';
      if (splitChosen && !S.splitWrapId) splitChosen.textContent = 'Optional · tap to add';
      designerAfterUpdate();
      var LS = STEPS[STEPS.length - 1], pd = $('price-display');   // the running total sits on the Your Build tab
      if (LS && LS.last && pd) LS.tabEl.querySelector('.rb-t').innerHTML = 'Your Build <span class="rb-tot">' + pd.textContent.trim() + '</span>';
    } catch (e) {}
    sync(); return r;
  };

  // ───────────────────────── Wrap Designer ─────────────────────────
  // The rod wraps listed on the page are the presets. Picking one loads it into the Wrap Designer, where the thread
  // colors are picked (Pro-Wrap solids, Pro-Wrap and Fuji metallics). Every change in the designer goes on the 3D rod
  // and into the build; the price is the wrap style the design matches.
  var BASE = CFG.engine.replace(/[^\/]*$/, '');
  var PRESET = {
    'Diamond — 2 Axis': { k: 'taper', p: 'diamond', a: 2 }, 'Chevron — 2 Axis': { k: 'taper', p: 'chevron', a: 2 },
    'Dragon Scale': { k: 'taper', p: 'dragon', a: 8 }, 'Chevron — 4 Axis': { k: 'taper', p: 'chevron', a: 4 },
    'Diamond — 4 Axis': { k: 'taper', p: 'diamond', a: 4 }, '4 Axis Decorative Chevron or Diamond': { k: 'taper', p: 'diamond', a: 4 },
    '8 Axis Wrap': { k: 'taper', p: 'diamond', a: 8 }, '16 Axis Wrap': { k: 'taper', p: 'diamond', a: 16 },
    '2 Axis Wrap Over Dragon Scales': { k: 'taper', p: 'dragon', a: 8, over: true },
    'Snowflake Wrap': { k: 'cross', pat: 'Snowflake', a: 2 }, '2 Axis Cross Wrap': { k: 'cross', a: 2, other: true }, '4 Axis Cross Wrap': { k: 'cross', a: 4, other: true }
  };
  var WRAPS = val('ROD_WRAPS') || [];
  var wrapById = function (id) { return WRAPS.find(function (w) { return w.id === id; }); };
  var idByName = function (n) { var w = WRAPS.find(function (x) { return x.name === n; }); return w ? w.id : null; };
  var presetOf = function (id) { var w = wrapById(id); return w ? PRESET[w.name] : null; };
  var wrapSec = $('sec-rod-wraps'), colorSec = secOf('sec-wrap-color'), optList = $('rod-wrap-options');
  var dzBox = null, dz = null, dzKind = null, dzReady = null, readT = null, lastKind = null;
  if (wrapSec && optList && WRAPS.length) {
    optList.insertAdjacentHTML('beforebegin', '<div class="rb-presets-lbl">Our wraps · pick one to start</div>');
    [].forEach.call(wrapSec.querySelectorAll('p'), function (x) { if (/Design Your Own/.test(x.textContent)) x.style.display = 'none'; });   // the old pop-up designer's note
    dzBox = el('div', 'rb-dz', '<div class="rb-dz-head"><b>Wrap <em>Designer</em></b><span class="rb-dz-now"></span></div>' +
      '<div class="rb-dz-note">Make the wrap yours: thread colors, thread counts, angle and trim bands. Every change shows on the 3D rod above. ' +
      'Priced as the wrap style it matches · one main and 2 supporting colors included, +$10 for each additional color · metallics +$5 each.</div><div class="rb-dz-load">Loading the designer…</div>');
    dz = el('iframe'); dz.id = 'sfsw-designer'; dz.title = 'Wrap Designer'; dz.setAttribute('scrolling', 'no');
    dzBox.appendChild(dz);
    ($('wrap-abalone-colors') || optList).insertAdjacentElement('afterend', dzBox);
    addEventListener('message', function (e) { if (dz && e.source === dz.contentWindow && e.data && e.data.wlH) dz.style.height = Math.max(600, e.data.wlH) + 'px'; });
  }
  var dw = function () { try { return dz && dz.contentWindow; } catch (e) { return null; } };
  function waitFor(test, ms) { return new Promise(function (res) { var t0 = Date.now(); (function tick() { var w = dw(); try { if (w && test(w)) return res(w); } catch (e) {} if (Date.now() - t0 > (ms || 30000)) return res(null); setTimeout(tick, 120); })(); }); }
  function loadKind(kind) {
    if (dzKind === kind && dzReady) return dzReady;
    dzKind = kind; dz.src = BASE + (kind === 'cross' ? 'cross.html' : 'taper.html');
    var mine = dzReady = waitFor(function (w) { return w.location.href.indexOf(kind === 'cross' ? 'cross.html' : 'taper.html') > 0 && w.wlCapture && w.wlApply && w.WL_unrolled && w.__wlRod && w.document.readyState === 'complete'; }).then(function (w) {
      if (!w || mine !== dzReady) return w; var ld = dzBox.querySelector('.rb-dz-load'); if (ld) ld.remove();
      [].forEach.call(w.document.querySelectorAll('label,span,div'), function (x) { if (x.id !== 'thrSize' && !x.children.length && x.textContent.trim() === 'Thread size') x.style.display = 'none'; });   // a label left behind by the thread size row
      var ts = w.document.getElementById('thrSize'); if (ts && ![].some.call(ts.querySelectorAll('button'), function (b) { return !b.hidden; })) ts.style.display = 'none';
      ['input', 'change', 'click', 'keyup'].forEach(function (t) { w.document.addEventListener(t, function (e) {
        if (t !== 'change' && e.target && e.target.tagName === 'SELECT') return; clearTimeout(readT); readT = setTimeout(readDesign, 350); }, true); });
      return w; });
    return dzReady;
  }
  // every color in a design is one of the SFSW threads (Pro-Wrap solids, Pro-Wrap and Fuji metallics)
  var START = { stripes: [{ c: '#1e1617', t: 6 }, { c: '#e7e5e3', t: 3 }, { c: '#dabd66', t: 2 }], trim: '#1e1617' };   // 862 Twilight Black, 807 White, 9130 Metallic Gold
  function snap(w, cap) {
    var B = w.WL_THREADS && w.WL_THREADS.BRANDS && w.WL_THREADS.BRANDS.sfsw; if (!B) return cap;
    var pal = []; B.groups.forEach(function (g) { g[1].forEach(function (x) { pal.push(x[1].toLowerCase()); }); });
    var ok = {}; pal.forEach(function (h) { ok[h] = 1; });
    var near = function (h) { h = String(h || '').toLowerCase(); if (ok[h] || !/^#[0-9a-f]{6}$/.test(h)) return h; var v = parseInt(h.slice(1), 16), best = pal[0], bd = 1e12;
      pal.forEach(function (p) { var q = parseInt(p.slice(1), 16), d = Math.pow((v >> 16) - (q >> 16), 2) * .3 + Math.pow((v >> 8 & 255) - (q >> 8 & 255), 2) * .59 + Math.pow((v & 255) - (q & 255), 2) * .11; if (d < bd) { bd = d; best = p; } }); return best; };
    var walk = function (x) { if (!x || typeof x !== 'object') return; if (Array.isArray(x)) return x.forEach(walk);
      ['c', 'c2', 'line', 'metal'].forEach(function (k) { if (typeof x[k] === 'string') x[k] = near(x[k]); });
      ['stripes', 'bands', 'ends', 'trims', 'center', 'inner', 'dragon'].forEach(function (k) { if (x[k]) walk(x[k]); }); };
    walk(cap); if (cap.fillC) cap.fillC = near(cap.fillC); return cap;
  }
  // "Create your own" cross wraps stay in the builders' tool, not the customer's designer
  function noCustom(w) { var sel = w.document.getElementById('pat'); if (!sel) return;
    var drop = function () { [].slice.call(sel.options).forEach(function (o) { if (/create your own/i.test(o.value)) o.remove(); }); };
    drop(); if (!sel.__rb) { sel.__rb = 1; new MutationObserver(drop).observe(sel, { childList: true }); } }
  var press = function (w, sel) { var b = w.document.querySelector(sel); if (b && !b.hidden && b.getAttribute('aria-pressed') !== 'true') b.click(); };
  var clean = function (o) { o = JSON.parse(JSON.stringify(o)); delete o.saved; delete o.name; return o; };
  function colorsOf(cap, kind) {
    var out = [], seen = {}, add = function (c, t) { c = String(c || '').toLowerCase(); if (!/^#[0-9a-f]{6}$/.test(c)) return; if (seen[c]) { if (t) seen[c].threads = (seen[c].threads || 0) + t; return; } seen[c] = { hex: c, threads: t || null }; out.push(seen[c]); };
    var dragon = kind === 'taper' && cap.pattern === 'dragon', over = dragon && cap.dragon && cap.dragon.over && cap.dragon.over.on;
    if (dragon) { add(cap.dragon && cap.dragon.metal); add(cap.dragon && cap.dragon.line); }
    if (!dragon || over) (cap.stripes || []).forEach(function (x) { add(x.c, +x.t || 0); });
    if (cap.center && cap.center.on) add(cap.center.c);
    if (cap.inner && cap.inner.on) (cap.inner.stripes || []).forEach(function (x) { add(x.c); });
    if (cap.arms === 'cover') add(cap.fillC);
    var T = cap.trims; if (T && T.on !== false) { add(T.c); (T.bands || []).forEach(function (x) { add(x.c); }); (T.ends || []).forEach(function (x) { add(x.c); }); }
    return out;
  }
  function wrapIdFor(cap, kind) {
    var ax = +cap.axes || 2;
    if (kind === 'cross') return idByName(/snowflake/i.test(cap.pat || '') && ax < 4 ? 'Snowflake Wrap' : ax >= 4 ? '4 Axis Cross Wrap' : '2 Axis Cross Wrap');
    if (cap.pattern === 'dragon') return idByName(cap.dragon && cap.dragon.over && cap.dragon.over.on ? '2 Axis Wrap Over Dragon Scales' : 'Dragon Scale');
    if (ax >= 16) return idByName('16 Axis Wrap');
    if (ax >= 8) return idByName('8 Axis Wrap');
    var cur = wrapById(S.wrapId);
    if (ax === 4 && cur && cur.name === '4 Axis Decorative Chevron or Diamond') return cur.id;   // decorative stays decorative
    return idByName((cap.pattern === 'chevron' ? 'Chevron' : 'Diamond') + ' — ' + (ax >= 4 ? 4 : 2) + ' Axis');
  }
  function nearestIdx(hex) {   // a WRAP_COLORS entry, only so the page counts the colors (never the +$10 UV metallics)
    var W = val('WRAP_COLORS') || [], h = parseInt(hex.slice(1), 16), r = h >> 16, g = h >> 8 & 255, b = h & 255, best = 0, bd = 1e12;
    W.forEach(function (c, i) { if (c.group === 'uv-metallic' || !/^#[0-9a-f]{6}$/i.test(c.hex)) return; var v = parseInt(c.hex.slice(1), 16), d = Math.pow(r - (v >> 16), 2) * .3 + Math.pow(g - (v >> 8 & 255), 2) * .59 + Math.pow(b - (v & 255), 2) * .11; if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function readDesign() {
    var w = dw(); if (!w || !w.wlCapture || S.performanceOnly || !presetOf(S.wrapId)) return;
    var cap; try { cap = clean(w.wlCapture()); } catch (e) { return; }
    var kind = dzKind, cols = colorsOf(cap, kind), name = function (h) { try { return (w.WL_THREADS && w.WL_THREADS.name(h)) || h; } catch (e) { return h; } };
    var MET = {}; try { w.WL_THREADS.BRANDS.sfsw.metallic.forEach(function (h) { MET[h.toLowerCase()] = 1; }); } catch (e) {}
    var thumb = ''; try { var u = w.WL_unrolled(900, 220); if (u && u.canvas) { var c = document.createElement('canvas'); c.width = 640; c.height = Math.round(640 * (u.canvas.height / 2) / u.canvas.width); c.getContext('2d').drawImage(u.canvas, 0, 0, u.canvas.width, u.canvas.height / 2, 0, 0, c.width, c.height); thumb = c.toDataURL('image/jpeg', .8); } } catch (e) {}
    var over = cap.dragon && cap.dragon.over && cap.dragon.over.on;
    var pat = kind === 'cross' ? (cap.pat || 'Cross wrap') : cap.pattern === 'dragon' ? (over ? 'Chevron over dragon scales' : 'Dragon scale') : cap.pattern === 'chevron' ? 'Chevron' : 'Diamond';
    var ax = kind === 'taper' && cap.pattern === 'dragon' ? (over ? +cap.dragon.over.axes || 2 : +cap.axes || 8) : +cap.axes || 2;
    S.customDesign = { sfsw: kind, kind: kind === 'cross' ? 'Cross wrap' : 'Wrap Designer', pattern: pat, axes: ax, angle: cap.angle && kind !== 'cross' ? cap.angle + '°' : '', size: '', blank: cap.blankC || '',
      colors: cols.map(function (c) { return { name: name(c.hex), hex: c.hex, threads: c.threads, metallic: !!MET[c.hex] }; }), thumb: thumb, setup: cap,
      summary: (kind === 'cross' ? pat + ' cross wrap' : pat) + ' · ' + ax + ' axis' + (cap.angle && kind !== 'cross' ? ' · ' + cap.angle + '°' : '') };
    if (cols.length) { S.mainIdx = nearestIdx(cols[0].hex); S.supportIdxs = cols.slice(1).map(function (c) { return nearestIdx(c.hex); }); }
    var id = wrapIdFor(cap, kind) || S.wrapId;
    if (id !== S.wrapId) { S.wrapId = id; S.wrapPhotoIdx = 0; }
    S.wrapUserSelected = true;
    call('renderWraps'); updateAll();
  }
  // a preset into the designer: its pattern and axis lines, keeping the customer's colors and the wrap's size on this blank
  var applyN = 0;
  var designCols = function () { return S.customDesign && S.customDesign.colors && S.customDesign.colors.length ? S.customDesign.colors.map(function (c) { return c.hex; }) : null; };
  async function toDesigner(id, restore, prevCols) {
    if (!dz) return; var n = ++applyN;
    var pr = presetOf(id);
    dzBox.style.display = pr && !S.performanceOnly ? '' : 'none';
    if (!pr) return;
    var prev = prevCols || designCols(), first = !prev, switched = false;
    switched = !!(lastKind && lastKind !== (restore ? restore.sfsw : pr.k));
    var w = await loadKind(restore ? restore.sfsw : pr.k); if (!w || n !== applyN) return;
    var fit = null; try { if (rod && rod.fit) fit = await rod.fit(); } catch (e) {}
    var cap = restore ? JSON.parse(JSON.stringify(restore.setup)) : w.wlCapture();
    if (fit) { cap.unit = fit.unit; cap.len = fit.len; cap.dB = fit.dB; cap.dM = fit.dM; cap.dT = fit.dT; }
    if (!restore && dzKind === 'cross') noCustom(w);
    if (!restore && !prev && dzKind === 'taper') { cap.stripes = JSON.parse(JSON.stringify(START.stripes)); if (cap.trims) { cap.trims.c = START.trim; cap.trims.bands = []; cap.trims.ends = []; } }
    if (!restore) snap(w, cap);
    try { w.wlApply(cap); } catch (e) {}
    lastKind = dzKind;
    if (!restore) {
      await new Promise(function (r) { setTimeout(r, 80); });
      if (pr.k === 'taper') {
        press(w, '#pattern [data-v="' + pr.p + '"]');
        var ov = w.document.getElementById('ovOn');
        if (pr.p === 'dragon' && ov && ov.checked !== !!pr.over) ov.click();
        if (pr.over) { press(w, '#ovPat [data-v="chevron"]'); press(w, '#ovAx [data-v="2"]'); }
        press(w, '#axes [data-v="' + pr.a + '"]');
      } else {
        var sel = w.document.getElementById('pat');
        if (sel) { var want = pr.pat || ([].find.call(sel.options, function (o) { return !/snowflake/i.test(o.value); }) || {}).value;
          if (want && sel.value !== want && [].some.call(sel.options, function (o) { return o.value === want; })) { sel.value = want; sel.dispatchEvent(new Event('change', { bubbles: true })); } }
        press(w, '#axes [data-v="' + pr.a + '"]');
      }
      // the customer's colors carry over to the new wrap (a cross wrap's pattern brings its own recipe colors; a first visit starts on SFSW colors)
      await new Promise(function (r) { setTimeout(r, 120); });
      if (n !== applyN) return;
      var cols = prev || START.stripes.map(function (x) { return x.c; });
      var c2 = w.wlCapture();
      if (dzKind === 'cross' || switched || first) { (c2.stripes || []).forEach(function (x, i) { x.c = cols[i % cols.length]; }); if (c2.trims) { c2.trims.c = cols[0]; c2.trims.bands = []; c2.trims.ends = []; } }
      try { w.wlApply(snap(w, c2)); } catch (e) {}
    }
    clearTimeout(readT); readT = setTimeout(readDesign, 450);
  }
  if (dz) {
    var _pick = window.pickWrap, _render = window.renderWraps;
    window.pickWrap = function (id) { var prev = designCols(); _pick(id); setTimeout(function () { toDesigner(id, null, prev); }, 40); };
    // the wrap the design is priced as stays lit in the list
    if (typeof _render === 'function') window.renderWraps = function () { var r = _render.apply(this, arguments);
      if (S.customDesign && optList) [].forEach.call(optList.querySelectorAll('.option-item'), function (o) { o.classList.toggle('selected', (o.getAttribute('onclick') || '').indexOf("'" + S.wrapId + "'") > 0); });
      return r; };
  }
  // the photos at the top of Rod Wrap are always the real photos of the wrap picked; the customer's own design shows on the 3D rod and in the designer
  var _preview = window.renderWrapPreview;
  if (dz && typeof _preview === 'function') window.renderWrapPreview = function () {
    var d = S.customDesign; S.customDesign = null;
    try { return _preview.apply(this, arguments); } finally { S.customDesign = d; } };
  var dzNow = dzBox && dzBox.querySelector('.rb-dz-now');
  // the page's own swatches: every metallic is +$5
  function metLabels() { [].forEach.call(document.querySelectorAll('.wrap-color-section-label'), function (l) {
    var pr = l.querySelector('.wrap-color-section-price'); if (pr && pr.textContent === '+$5') return;
    if (!pr) { pr = el('span', 'wrap-color-section-price'); l.appendChild(document.createTextNode(' ')); l.appendChild(pr); } pr.textContent = '+$5'; }); }
  if (colorSec) new MutationObserver(metLabels).observe(colorSec, { childList: true, subtree: true });
  var wasPerf = !!S.performanceOnly;
  function designerAfterUpdate() {
    if (wasPerf && !S.performanceOnly && dz) setTimeout(function () { toDesigner(S.wrapId); }, 40);   // back from Performance Only
    wasPerf = !!S.performanceOnly;
    var ab = !presetOf(S.wrapId);   // Abalone (no designer): its thread colors are picked on the page
    if (colorSec) colorSec.style.display = (S.performanceOnly || ab || !dz) ? '' : 'none';
    if (dzBox) dzBox.style.display = !ab && !S.performanceOnly ? '' : 'none';
    if (dzNow) { var w = wrapById(S.wrapId); dzNow.textContent = w ? 'Priced as ' + w.name + ' · ' + (w.adder ? '+$' + w.adder : 'Included') : ''; }
    var d = designOn();
    metLabels();
    if (d) {   // the summary's colors line: the real threads from the design
      var names = d.colors.map(function (c) { return c.name; }), fee = (call('supportExtraFee') || 0) + metFee();
      [].forEach.call(document.querySelectorAll('#summary .summary-line'), function (l) { var a = l.querySelector('.sl-label'), v = l.querySelector('.sl-val');
        if (a && v && a.textContent === 'Colors') v.textContent = names.join(' / ') + (fee ? '  +$' + fee : ''); });
      var cc = $('chosen-wrap-color'); if (cc) cc.textContent = names.join(' / ');
      var cw = $('chosen-rod-wrap'), wn = wrapById(S.wrapId); if (cw && wn) cw.textContent = wn.name;
    }
  }
  function designOn() { return !S.performanceOnly && presetOf(S.wrapId) && S.customDesign && S.customDesign.colors && S.customDesign.colors.length ? S.customDesign : null; }
  var metFee = function () { var d = designOn(); if (d) return d.colors.filter(function (c) { return c.metallic; }).length * 5;
    var W = val('WRAP_COLORS') || []; return [S.mainIdx].concat(S.supportIdxs || []).reduce(function (a, i) { return a + (W[i] && W[i].metallic ? 5 : 0); }, 0); };
  window.calcUVMetallicFee = function () { return metFee(); };
  var _order = window.buildOrderItem;
  if (typeof _order === 'function') window.buildOrderItem = function () {
    var it = _order.apply(this, arguments), d = designOn(); if (!d) return it;
    var fee = call('supportExtraFee') || 0, extra = Math.max(0, d.colors.length - 3), mets = d.colors.filter(function (c) { return c.metallic; }).length;
    var notes = []; if (fee) notes.push('+$' + fee + ' for ' + extra + ' extra color' + (extra > 1 ? 's' : '')); if (mets) notes.push('+$' + mets * 5 + ' for ' + mets + ' metallic' + (mets > 1 ? 's' : ''));
    (it.lines || []).forEach(function (l) { if (l.label === 'Colors') l.value = 'Colors (from the wrap design): ' + d.colors.map(function (c, i) { return (i ? '' : 'Main: ') + c.name; }).join(', ') + (notes.length ? '  (' + notes.join(', ') + ')' : ''); });
    (it.buildStrip || []).forEach(function (b) { if (b.label === 'Colors') { b.name = d.colors.map(function (c) { return c.name; }).join(' / ');
      b.colors = d.colors.map(function (c, i) { return { label: i ? (i === 1 ? 'Supporting' : 'Supporting ' + i) : 'Main', hex: c.hex, name: c.name }; }); } });
    return it;
  };
  // start: the design from the cart (Edit), or the wrap already picked
  if (dz) setTimeout(function () {
    if (S.customDesign && S.customDesign.setup && S.customDesign.sfsw) toDesigner(S.wrapId, S.customDesign); else toDesigner(S.wrapId); }, 0);


  // ───────────────────────── Custom grips: ring by ring ─────────────────────────
  // Custom cork and custom EVA are designed like the WrapLab Rod Builder: pick a grip piece, pick a cork or EVA ring,
  // pick the ring size, then tap rings on the strip. The 3D rod shows every ring. The grip's price is the page's own.
  var RG_KIND = { 'ccork-custom-split': 'cork', 'ccork-custom-full': 'cork', 'eva-custom': 'eva', 'eva-custom-full': 'eva' };
  var RGB = BASE + 'rod-parts/', rgList = { cork: [], eva: [] }, rgReal = false, rgEl = null, rgUi = { piece: null, m: null, t: 0.5, tab: null };
  fetch(BASE + 'rings.json').then(function (r) { return r.json(); }).then(function (d) { rgList = d; rgRender(); }).catch(function () {});
  var rgOn = function () { return !!RG_KIND[S.gripId]; };
  var rgIsEva = function (id) { return id.indexOf('eva:') === 0; };
  var rgName = function (id) { var e = rgIsEva(id), l = e ? rgList.eva : rgList.cork, k = e ? id.slice(4) : id, f = l.find(function (x) { return x[0] === k; }); return (e ? 'EVA ' : '') + (f ? f[1] : k); };
  var rgChip = function (id) { return rgIsEva(id) ? RGB + 'eva/' + id.slice(4) + '.webp' : RGB + 'cork/' + id + '-chip.webp'; };
  var rgKeys = function () { var g = call('getGrip') || {}; return g.style === 'full' ? [['full', 'Rear grip'], ['fore', 'Fore grip']] : [['butt', 'Butt piece'], ['rear', 'Rear piece'], ['fore', 'Fore grip']]; };
  var rgLen = function (r) { return (r || []).reduce(function (a, x) { return a + x.t; }, 0); };
  function rgFill(len, m) { var out = [], n = len; while (n > 1e-6) { var t = n >= 0.5 ? 0.5 : 0.25; out.push({ m: m, t: t }); n -= t; } return out; }
  // the rings live in S, so they go into the cart and come back with Edit
  function rgState() {
    if (!rgOn()) return null;
    var kind = RG_KIND[S.gripId], H = CFG.handle || {};
    if (!S.gripRings || S.gripRings.grip !== S.gripId) {
      var m0 = kind === 'eva' ? 'eva:black' : 'burl', len = { butt: H.gButt || 2.5, rear: H.gRear || 2.5, fore: H.gFore || 2.5, full: H.gripSpan || 10.5 };
      S.gripRings = { grip: S.gripId, g: {} };
      rgKeys().forEach(function (k) { S.gripRings.g[k[0]] = rgFill(len[k[0]], m0); });
      rgUi = { piece: null, m: m0, t: 0.5, tab: kind };
    }
    if (!rgUi.m) { rgUi.m = kind === 'eva' ? 'eva:black' : 'burl'; rgUi.tab = kind; }
    if (!rgKeys().some(function (k) { return k[0] === rgUi.piece; })) rgUi.piece = rgKeys()[0][0];
    return S.gripRings;
  }
  function rgBuild() {
    rgEl = el('div', 'rb-rg');
    rgEl.innerHTML = '<div class="rb-rg-lbl">Grip to design</div><div class="rb-seg rb-big" data-k="piece"></div>' +
      '<div class="rb-rg-lbl"><span class="rb-rg-kind"></span>: <b class="rb-rg-name"></b></div><div class="rb-rg-tabs"><div class="rb-seg" data-k="tab"><button type="button" data-v="cork">Cork <span class="rb-tp">+$2.50 per 0.5 in added</span></button><button type="button" data-v="eva">EVA <span class="rb-tp">+$10 per color</span></button></div><span class="rb-rg-price"></span></div>' +
      '<div class="rb-chips"></div>' +
      '<div class="rb-rg-row">Ring size <div class="rb-seg" data-k="size"><button type="button" data-v="0.25">0.25 in</button><button type="button" data-v="0.5">0.5 in</button></div></div>' +
      '<div class="rb-rg-lbl"><b class="rb-rg-now"></b> · tap a ring to give it this material and size</div><div class="rb-strip"></div>' +
      '<div class="rb-rg-row"><button type="button" class="rb-mini" data-a="fill">Fill this grip</button><button type="button" class="rb-mini" data-a="add">Add ring</button><button type="button" class="rb-mini" data-a="del">Remove last ring</button><span class="rb-rg-len"></span></div>';
    rgEl.addEventListener('click', function (e) {
      e.stopPropagation();
      var b = e.target.closest('button'); if (!b) return;
      var seg = b.closest('.rb-seg'), G = rgState(); if (!G) return;
      var cur = function () { return (G.g[rgUi.piece] || []).map(function (r) { return { m: r.m, t: r.t }; }); };
      var set = function (r) { G.g[rgUi.piece] = r; changed(); };
      if (seg) { var k = seg.dataset.k, v = b.dataset.v;
        if (k === 'piece') rgUi.piece = v; else if (k === 'tab') rgUi.tab = v; else if (k === 'size') rgUi.t = +v;
        return rgRender(); }
      if (b.dataset.m) { rgUi.m = b.dataset.m; return rgRender(); }
      if (b.dataset.i != null) {   // painting a ring keeps the grip's length, like WrapLab
        var r = cur(), i = +b.dataset.i, old = r[i], t = rgUi.t;
        if (t < old.t) r.splice(i, 1, { m: rgUi.m, t: t }, { m: old.m, t: old.t - t });
        else if (t > old.t && r[i + 1]) { r[i] = { m: rgUi.m, t: t }; var nx = r[i + 1]; if (nx.t > t - old.t) nx.t -= t - old.t; else r.splice(i + 1, 1); }
        else r[i] = { m: rgUi.m, t: old.t };
        return set(r); }
      var a = b.dataset.a;
      if (a === 'fill') set(cur().map(function (x) { return { m: rgUi.m, t: x.t }; }));
      if (a === 'add') { var r2 = cur(); if (rgLen(r2) + rgUi.t <= rgMax(rgUi.piece) + 1e-6) { r2.push({ m: rgUi.m, t: rgUi.t }); set(r2); } }
      if (a === 'del') { var r3 = cur(); if (r3.length > 1) { r3.pop(); set(r3); } }
    });
    function changed() { rgRender(); call('renderGripPreview'); updateAll(); }
  }
  function rgPaint(host, rings, maxW, h) {   // a strip of rings, lit like a round grip (the rod's own textures when 3D is up)
    var len = rgLen(rings) || 1, ppi = Math.max(18, Math.min(160, (maxW - 2) / len));
    var wrap = el('div', 'rb-rings' + (rgReal ? '' : ' flat')); wrap.style.width = Math.round(len * ppi) + 'px'; if (h) wrap.style.height = h + 'px';
    if (rgReal && rod && rod.paintRings) { var cv = document.createElement('canvas'); wrap.appendChild(cv); try { rod.paintRings(cv, rings, ppi); } catch (e) {} }
    rings.forEach(function (r, i) { var b = el('button', null, ''); b.type = 'button'; b.dataset.i = i; b.title = rgName(r.m) + ', ' + r.t + ' in';
      b.style.width = (r.t * ppi) + 'px'; if (!rgReal) b.style.backgroundImage = 'url("' + rgChip(r.m) + '")'; wrap.appendChild(b); });
    host.appendChild(wrap);
  }
  function rgRender() {
    if (!rgEl || !rgOn()) return; var G = rgState(); if (!G) return;
    var seg = function (k) { return rgEl.querySelector('.rb-seg[data-k="' + k + '"]'); };
    seg('piece').innerHTML = rgKeys().map(function (k) { return '<button type="button" data-v="' + k[0] + '" aria-pressed="' + (k[0] === rgUi.piece) + '">' + k[1] + '</button>'; }).join('');
    var evaOnly = RG_KIND[S.gripId] === 'eva';   // custom EVA grips are EVA rings only; custom cork grips can mix in EVA
    if (evaOnly) { rgUi.tab = 'eva'; if (!rgIsEva(rgUi.m)) rgUi.m = 'eva:black'; }
    seg('tab').style.display = evaOnly ? 'none' : '';
    rgEl.querySelector('.rb-rg-price').innerHTML = evaOnly ? '<b>+$10</b> for each color after the first · any length, no extra cost'
      : (rgUi.tab === 'eva' ? '<b>+$10</b> for each EVA color in the grip' : '<b>+$2.50</b> for every 0.5 in added past 2.5 in' + (S.gripRings && S.gripRings.g.full ? ' (fore grip)' : ''));
    [].forEach.call(seg('tab').children, function (b) { b.setAttribute('aria-pressed', b.dataset.v === rgUi.tab); });
    [].forEach.call(seg('size').children, function (b) { b.setAttribute('aria-pressed', +b.dataset.v === rgUi.t); });
    rgEl.querySelector('.rb-rg-kind').textContent = rgIsEva(rgUi.m) ? 'EVA' : 'Cork';
    rgEl.querySelector('.rb-rg-name').textContent = rgIsEva(rgUi.m) ? rgName(rgUi.m).slice(4) : rgName(rgUi.m);
    var list = rgUi.tab === 'eva' ? rgList.eva.map(function (x) { return 'eva:' + x[0]; }) : rgList.cork.map(function (x) { return x[0]; });
    rgEl.querySelector('.rb-chips').innerHTML = list.map(function (id) { return '<button type="button" data-m="' + id + '" aria-pressed="' + (id === rgUi.m) + '"><img src="' + rgChip(id) + '" alt="" loading="lazy"><span>' + (rgIsEva(id) ? rgName(id).slice(4) : rgName(id)) + '</span></button>'; }).join('');
    var rings = G.g[rgUi.piece] || [], strip = rgEl.querySelector('.rb-strip'); strip.innerHTML = '';
    rgPaint(strip, rings, strip.clientWidth || 600);
    var name = (rgKeys().find(function (k) { return k[0] === rgUi.piece; }) || ['', 'Grip'])[1];
    rgEl.querySelector('.rb-rg-now').textContent = name + ' · ' + rgLen(rings).toFixed(2) + ' in';
    rgEl.querySelector('.rb-rg-len').textContent = rings.length + ' rings · ' + rgLen(rings).toFixed(2) + ' in' + (rgUi.piece === 'full' ? ' (set for this rod)' : ' · up to ' + rgMax(rgUi.piece).toFixed(2) + ' in');
    [].forEach.call(rgEl.querySelectorAll('.rb-mini[data-a="add"],.rb-mini[data-a="del"]'), function (b) { b.style.display = rgUi.piece === 'full' ? 'none' : ''; });
    var x = rgExtra(), xs = rgEl.querySelector('.rb-rg-extra'); if (!xs) { xs = el('div', 'rb-rg-lbl rb-rg-extra'); rgEl.appendChild(xs); }
    var parts = []; if (x.len) parts.push('extra length +$' + x.len.toFixed(2)); if (x.eva) parts.push('EVA colors +$' + x.eva); if (x.colors) parts.push('extra colors +$' + x.colors);
    xs.innerHTML = parts.length ? '<b>Grip extras:</b> ' + parts.join(' · ') : '';
  }
  // how long each piece may get: the rear grip(s) share the room from the butt cap to the seat; the fore grip up to 12 in
  function rgMax(k) { var span = (CFG.handle && CFG.handle.gripSpan) || 10.5, G = S.gripRings;
    if (k === 'fore') return 12; if (k === 'full') return span;
    var other = G && G.g[k === 'butt' ? 'rear' : 'butt']; return Math.max(0.5, span - rgLen(other) - 0.5); }
  // custom grip pricing: the grip's own price plus length and color extras
  //   custom cork: +$2.50 per 0.5 in past 2.5 in (any piece on split, the fore grip on full); EVA rings +$10 per EVA color
  //   custom EVA:  +$10 per color past the first; length is free
  var rgPriced = null;
  function rgExtra() {
    var G = rgState(); if (!G) return { len: 0, eva: 0, colors: 0, total: 0 };
    var kind = RG_KIND[S.gripId], over = function (r) { return Math.ceil(Math.max(0, rgLen(r) - 2.5) / 0.5 - 1e-9) * 2.5; }, out = { len: 0, eva: 0, colors: 0 };
    var cols = {}; Object.keys(G.g).forEach(function (k) { (G.g[k] || []).forEach(function (r) { cols[r.m] = 1; }); });
    if (kind === 'cork') {
      (G.g.full ? ['fore'] : ['butt', 'rear', 'fore']).forEach(function (k) { out.len += over(G.g[k]); });
      out.eva = Object.keys(cols).filter(rgIsEva).length * 10;
    } else out.colors = Math.max(0, Object.keys(cols).length - 1) * 10;
    out.total = out.len + out.eva + out.colors; return out;
  }
  function rgPrice() {   // runs before the page adds up the total
    var g = call('getGrip'); if (rgPriced && rgPriced !== g && rgPriced.rbBase != null) { rgPriced.adder = rgPriced.rbBase; }
    if (!g) return; if (g.rbBase == null) g.rbBase = g.adder;
    g.adder = g.rbBase + (rgOn() ? rgExtra().total : 0); rgPriced = g;
  }
  function rgSummary() {
    var G = rgState(); if (!G) return '';
    return rgKeys().map(function (k) { var n = {}, rs = G.g[k[0]] || [];
      rs.forEach(function (r) { var key = rgName(r.m) + ' ' + r.t + '"'; n[key] = (n[key] || 0) + 1; });
      return k[1] + ' ' + rgLen(rs).toFixed(2) + ' in: ' + Object.keys(n).map(function (x) { return n[x] + ' × ' + x; }).join(', '); }).join(' | ') +
      (function () { var x = rgExtra(), t = []; if (x.len) t.push('extra length +$' + x.len.toFixed(2)); if (x.eva) t.push('EVA colors +$' + x.eva); if (x.colors) t.push('extra colors +$' + x.colors); return t.length ? ' (' + t.join(', ') + ')' : ''; })();
  }
  // the ring designer takes the place of the page's "pick up to 3 cork designs" grid and EVA color list
  window.corkSelectionHtml = function () { return '<div class="rb-rg-slot"></div>'; };
  var _rgGrips = window.renderGrips;
  if (typeof _rgGrips === 'function') window.renderGrips = function () {
    try { (val('GRIPS') || []).forEach(function (grp) { grp.items.forEach(function (it) { if (it.rbBase != null && it.id !== S.gripId) it.adder = it.rbBase; }); }); rgPrice(); } catch (e) {}   // list shows each grip's own price
    var r = _rgGrips.apply(this, arguments);
    var sel = document.querySelector('select[onchange*="pickEvaColor"]');
    if (sel) { var box = sel.closest('div'); var slot = el('div', 'rb-rg-slot'); box.replaceWith(slot); }
    if (rgOn() && !document.querySelector('.rb-rg-slot')) { var it = [].find.call(document.querySelectorAll('#sec-grip .option-item'), function (o) { return (o.getAttribute('onclick') || '').indexOf("'" + S.gripId + "'") > 0; });
      if (it) it.insertAdjacentElement('afterend', el('div', 'rb-rg-slot')); }
    var slot2 = document.querySelector('.rb-rg-slot');
    if (slot2 && rgOn()) { if (!rgEl) rgBuild(); slot2.appendChild(rgEl); rgRender(); }
    return r;
  };
  // the photo at the top of Grips: the customer's rings, piece by piece
  var _rgPrev = window.renderGripPreview;
  if (typeof _rgPrev === 'function') window.renderGripPreview = function () {
    var r = _rgPrev.apply(this, arguments);
    var photo = $('grip-photo'), strip = $('grip-photo-cork-strip'), G = rgState();
    if (G && photo && strip) {
      photo.style.display = 'none'; strip.style.display = ''; strip.innerHTML = '';
      var box = el('div', 'rb-rg-prev');
      rgKeys().forEach(function (k) { var row = el('div', 'rb-rg-prow'); row.appendChild(el('div', 'rb-rg-plbl', k[1] + ' · ' + rgLen(G.g[k[0]]).toFixed(2) + ' in'));
        rgPaint(row, G.g[k[0]] || [], Math.min(560, (strip.clientWidth || 600) - 20), 46); box.appendChild(row); });
      strip.appendChild(box);
    }
    return r;
  };
  var _rgOrder = window.buildOrderItem;
  if (typeof _rgOrder === 'function') window.buildOrderItem = function () {
    var it = _rgOrder.apply(this, arguments);
    if (rgOn()) { var sm = rgSummary(); (it.lines || []).forEach(function (l) { if (l.label === 'Grip') l.value = l.value + ' — Rings: ' + sm; }); it.gripRings = JSON.parse(JSON.stringify(S.gripRings)); }
    return it;
  };
  // once the rod's textures are in, the strips look like the real rings
  (function waitKit() { if (!rod || !rod.ringKit) return setTimeout(waitKit, 500);
    rod.ringKit().then(function (ok) { rgReal = !!ok; if (rgOn()) { rgRender(); call('renderGripPreview'); } }); })();

  // ───────────────────────── Blanks: square cards ─────────────────────────
  // The blanks sit in a grid of square cards; the picked blank's lengths and powers open underneath the grid.
  var _blanks = window.renderBlankCards, blOpen = {};
  window.SFSW_blMore = function (id) { blOpen[id] = !blOpen[id]; call('renderBlankCards'); };
  if (typeof _blanks === 'function' && val('BLANKS')) window.renderBlankCards = function () {
    var host = $('blank-cards'); if (!host) return _blanks.apply(this, arguments);
    var B = val('BLANKS') || [], perf = !!S.performanceOnly, esc = function (t) { return String(t == null ? '' : t); };
    var price = function (b) { return perf ? '<span class="rb-bl-orig">$' + b.price + '</span>$' + (b.price - 50) : '$' + b.price; };
    var cards = B.map(function (b) {
      var sel = b.id === S.blankId, v = sel ? b.variants[S.variantIdx] : null;
      var tight = (b.madeInUSA ? 1 : 0) + (b.name.length > 16 ? 1 : 0) + (b.name.length > 30 ? 1 : 0);   // fewer description lines when the name or badge takes room
      return '<div role="button" tabindex="0" class="rb-bl rb-t' + tight + (sel ? ' selected' : '') + (blOpen[b.id] ? ' open' : '') + '" data-id="' + b.id + '" onclick="pickBlank(\'' + b.id + '\')">' +
        '<span class="rb-bl-name">' + esc(b.name) + '</span>' +
        (b.madeInUSA ? '<span class="rb-bl-usa">★ Made in USA</span>' : '') +
        (b.desc ? '<span class="rb-bl-desc">' + esc(b.desc) + '</span><button type="button" class="rb-bl-more" onclick="event.stopPropagation();SFSW_blMore(\'' + b.id + '\')">' + (blOpen[b.id] ? 'Show less' : 'Read more') + '</button>' : '') +
        '<span class="rb-bl-foot"><span class="rb-bl-len">' + (v ? esc(v.length) + ' · ' + esc(v.lineWt) : b.variants.length + ' length' + (b.variants.length > 1 ? 's' : '')) + '</span>' +
        '<span class="rb-bl-price">' + price(b) + '</span></span></div>';
    }).join('');
    var sb = B.find(function (b) { return b.id === S.blankId; }), rows = '';
    if (sb) rows = '<div class="rb-bl-var"><div class="rb-bl-var-h">' + esc(sb.name) + ' · pick the length and power</div>' +
      '<table class="variant-table"><thead><tr><th class="radio-th"></th><th>Length / Line WT</th><th>Lure WT</th><th>Blank WT</th></tr></thead><tbody>' +
      sb.variants.map(function (v, i) { var c = i === S.variantIdx;
        return '<tr class="variant-row ' + (c ? 'checked' : '') + '" onclick="pickVariant(\'' + sb.id + '\',' + i + ',' + (v.adder || 0) + ')"><td class="radio-cell"><span class="radio-dot"></span></td>' +
          '<td>' + esc(v.length) + ' — ' + esc(v.lineWt) + (v.adder ? ' <span class="variant-adder">+$' + v.adder + '</span>' : '') + '</td><td>' + esc(v.lureWt) + '</td><td>' + esc(v.blankWt) + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
    host.className = 'rb-blanks'; host.innerHTML = '<div class="rb-bl-grid">' + cards + rows + '</div>';
    placeLengths(); moreLinks();
  };
  // "Read more" only where the description is cut off (always on an open card, to close it)
  function moreLinks() { if (!document.querySelector('.rb-bl-grid') || !document.querySelector('.rb-bl-grid').offsetParent) return; [].forEach.call(document.querySelectorAll('.rb-bl'), function (c) {
    var d = c.querySelector('.rb-bl-desc'), m = c.querySelector('.rb-bl-more'); if (!d || !m) return;
    var cut = c.classList.contains('open') || getComputedStyle(d).display === 'none' || d.scrollHeight > d.clientHeight + 2;
    m.style.display = cut ? '' : 'none'; }); }
  // the lengths open right under the row of the picked blank, pointing at it
  function placeLengths() {
    var grid = document.querySelector('.rb-bl-grid'), pan = grid && grid.querySelector('.rb-bl-var'); if (!pan) return;
    var cards = [].slice.call(grid.querySelectorAll('.rb-bl')), i = cards.findIndex(function (c) { return c.classList.contains('selected'); }); if (i < 0) return;
    if (!grid.offsetParent) return;   // step not on screen yet: placed again when it opens
    var cols = cards.filter(function (c) { return c.offsetTop === cards[0].offsetTop; }).length || 1;
    var last = Math.min(cards.length, Math.ceil((i + 1) / cols) * cols) - 1;
    cards[last].insertAdjacentElement('afterend', pan);
    var c = cards[i], gx = grid.getBoundingClientRect().left;
    pan.style.setProperty('--caret', Math.round(c.getBoundingClientRect().left - gx + c.offsetWidth / 2 - 9) + 'px');
  }
  addEventListener('resize', function () { clearTimeout(placeLengths.t); placeLengths.t = setTimeout(function () { placeLengths(); moreLinks(); }, 80); });
  call('renderBlankCards');

  // ───────────────────────── Reel seats: a picture beside each one, like the butt caps ─────────────────────────
  function seatThumb(seat) {
    if (seat.id === S.seatId) { var cur = call('seatPhotoSrc'); if (cur) return cur; }
    var SC = val('SEAT_COLORS') || {}, list = seat.colors && SC[seat.colors];
    if (seat.id === 'alps-mvt' || !list || !list.length) return '../preview/seats/' + seat.id + '.png';
    var slug = fn('slugSeatColor') || function (n) { return String(n).toLowerCase().replace(/\s+/g, '-'); };
    return (seat.colorPhotoPath || '../preview/seats/' + seat.id) + '-' + slug(list[0].name) + '.png';
  }
  var _seats = window.renderSeats;
  if (typeof _seats === 'function' && val('SEATS')) window.renderSeats = function () {
    var host = $('seat-options'); if (!host) return _seats.apply(this, arguments);
    host.innerHTML = val('SEATS').map(function (it) {
      var src = seatThumb(it), sel = it.id === S.seatId;
      return '<div class="option-item has-thumb ' + (sel ? 'selected' : '') + '" onclick="pickSeat(\'' + it.id + '\')">' +
        '<div class="acc-thumb rb-seat-thumb" data-seat="' + it.id + '" onclick="event.stopPropagation();openLightbox(this.querySelector(\'img\').src,\'' + it.name.replace(/'/g, '') + '\')"><img src="' + src + '" alt="' + it.name + '" loading="lazy" onerror="this.parentNode.style.visibility=\'hidden\'"></div>' +
        '<div class="option-item-body"><span class="option-item-name">' + it.name + '</span>' + (it.desc ? '<span class="option-item-desc">' + it.desc + '</span>' : '') + '</div>' +
        '<span class="option-item-price">' + (it.adder === 0 ? 'Included' : '+$' + it.adder) + '</span></div>';
    }).join('');
  };
  // the picked seat's picture follows its color
  var _seatPrev = window.renderSeatPreview;
  if (typeof _seatPrev === 'function') window.renderSeatPreview = function () {
    var r = _seatPrev.apply(this, arguments);
    var t = document.querySelector('.rb-seat-thumb[data-seat="' + S.seatId + '"] img'), src = call('seatPhotoSrc');
    if (t && src && t.getAttribute('src') !== src) { t.parentNode.style.visibility = ''; t.src = src; }
    return r;
  };
  call('renderSeats');

  // ───────────────────────── Guides: compact ring picker ─────────────────────────
  // Each frame is a row of small ring cards (name + price). The picked ring's details open under its frame:
  // what it is, frame color (titanium comes in silver only) and the tip upgrades it allows.
  var TIP_NAMES = { sic: 'SiC', titaniumSic: 'Titanium SiC', torzite: 'Titanium Torzite', titTorzite: 'Titanium Torzite' };
  var _guides = window.renderGuides;
  if (typeof _guides === 'function' && val('GUIDES')) window.renderGuides = function () {
    var host = $('guide-groups'); if (!host) return _guides.apply(this, arguments);
    var fee = val('TIP_UPGRADE_FEES') || {}, money = function (n) { return n ? '+$' + n : 'Included'; };
    host.innerHTML = val('GUIDES').map(function (g) {
      var picked = g.items.find(function (it) { return it.id === S.guideId; });
      var cards = g.items.map(function (it) {
        return '<button type="button" class="rb-gd' + (it.id === S.guideId ? ' selected' : '') + '" onclick="pickGuide(\'' + it.id + '\')">' +
          '<span class="rb-gd-name">' + it.name + '</span><span class="rb-gd-price">' + money(it.adder) + '</span></button>'; }).join('');
      var det = '';
      if (picked) {
        var cols = call('guideColorList') || [], ups = call('tipUpgradeEligibleOptions') || [];
        var ci = Math.min(S.guideColorIdx || 0, Math.max(0, cols.length - 1));
        var colorHtml = cols.length > 1
          ? '<div class="rb-gd-row"><span class="rb-gd-k">Frame color</span><span class="rb-gd-sw">' + cols.map(function (c, i) {
              return '<button type="button" title="' + c.name + '" class="' + (i === ci ? 'on' : '') + '" style="background:' + c.hex + '" onclick="pickGuideColor(' + i + ')"></button>'; }).join('') +
              '</span><span class="rb-gd-v">' + cols[ci].name + '</span></div>'
          : (cols.length === 1 ? '<div class="rb-gd-row"><span class="rb-gd-k">Frame color</span><span class="rb-gd-sw"><button type="button" class="on" style="background:' + cols[0].hex + '"></button></span><span class="rb-gd-v">' + cols[0].name + (picked.titanium ? ' only (titanium frames come in silver)' : '') + '</span></div>' : '');
        var tipHtml = ups.length ? '<div class="rb-gd-row"><span class="rb-gd-k">Upgrade the tip</span><span class="rb-gd-tips">' + ups.map(function (k) {
            return '<button type="button" class="' + (S.tipUpgrade === k ? 'on' : '') + '" onclick="pickTipUpgrade(event,\'' + k + '\')"><span class="rb-gd-box"></span>' + TIP_NAMES[k] + ' <b>+$' + fee[k] + '</b></button>'; }).join('') + '</span></div>' : '';
        det = '<div class="rb-gd-det"><div class="rb-gd-det-h">' + picked.name + ' <span>' + money(picked.adder) + '</span></div>' +
          (picked.desc ? '<div class="rb-gd-desc">' + picked.desc + '</div>' : '') + colorHtml + tipHtml + '</div>';
      }
      return '<div class="rb-gd-group"><div class="rb-gd-head"><b>' + g.group + '</b>' + (g.desc ? '<span>' + g.desc + '</span>' : '') + '</div>' +
        '<div class="rb-gd-grid">' + cards + '</div>' + det + '</div>';
    }).join('');
  };
  var _gPrev = window.renderGuidePreview;
  if (typeof _gPrev === 'function') window.renderGuidePreview = function () { var r = _gPrev.apply(this, arguments); call('renderGuides'); return r; };
  call('renderGuides');

  go(0, false);
  window.updateAll();
})();
