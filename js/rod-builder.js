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
  // the design each wrap shows on the 3D rod from the first moment (the designer then takes over with the same design)
  var LOOK = { 'Trim Band': {"unit":"in","len":"9.00","dB":"15.0","dM":"14.5","dT":"14.0","pattern":"trim","dragon":{"line":"#1e1617","metal":"#bfbfbf","over":{"on":false,"pattern":"chevron","axes":2}},"axes":2,"angle":45,"mode":"exact","nOverride":null,"tsize":0.21,"blankC":"#101010","arms":"show","fillC":"#1e1617","fill":false,"stripes":[{"c":"#1e1617","t":1}],"c1":1,"center":{"on":false,"c":"#1e1617","t":1},"chevTo":null,"trims":{"on":true,"mm":50.8,"c":"#1e1617","bands":[{"c":"#e1cb3c","t":4},{"c":"#1e1617","t":2},{"c":"#e7e5e3","t":1,"saw":"mid","c2":"#1e1617"},{"c":"#e7e5e3","t":2},{"c":"","t":3,"fade":true},{"c":"#1e1617","t":6},{"c":"#e1cb3c","t":4},{"c":"#e1cb3c","t":1,"saw":"mid","c2":"#1e1617"}],"ends":[{"c":"#e1cb3c","t":6}]},"inner":{"on":false,"pattern":"diamond","chevTo":null,"place":"center","auto":true,"stripes":[{"c":"#e3b729","t":3},{"c":"#1e1617","t":3},{"c":"#2398bf","t":3},{"c":"#e7e5e3","t":3}]},"thread":"sfsw"}, 'Diamond — 2 Axis': {"unit":"in","len":"9.00","dB":"15.0","dM":"14.5","dT":"14.0","pattern":"diamond","dragon":{"line":"#1e1617","metal":"#bfbfbf","over":{"on":false,"pattern":"chevron","axes":2}},"axes":2,"angle":45,"mode":"exact","nOverride":null,"tsize":0.21,"blankC":"#101010","arms":"show","fillC":"#1e1617","fill":false,"stripes":[{"c":"#bfbfbf","t":1},{"c":"#1e1617","t":4},{"c":"#bfbfbf","t":4},{"c":"#4f5254","t":4},{"c":"#142e70","t":6},{"c":"#686a6c","t":2},{"c":"#142e70","t":3},{"c":"#4f5254","t":3},{"c":"#142e70","t":4},{"c":"#bfbfbf","t":2},{"c":"#1e1617","t":1}],"c1":1,"center":{"on":false,"c":"#1e1617","t":1},"chevTo":null,"trims":{"on":true,"mm":20,"c":"#142e70","bands":[],"ends":[]},"inner":{"on":false,"pattern":"diamond","chevTo":null,"place":"center","auto":true,"stripes":[{"c":"#e3b729","t":3},{"c":"#1e1617","t":3},{"c":"#2398bf","t":3},{"c":"#e7e5e3","t":3}]},"thread":"sfsw"} };
  var wrapNamed = function (id) { var W = val('ROD_WRAPS') || []; for (var i = 0; i < W.length; i++) if (W[i].id === id) return W[i]; return null; };
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
    '.rb-no3d{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:24px;font-size:14px;line-height:1.5;color:var(--c-muted)}.rb-no3d b{color:var(--c-text);font-weight:600}',
    '.rb-flash{animation:rbflash 1.2s ease}',
    '.rb-on #rod-wrap-options{display:flex;flex-direction:column;gap:6px}',
    '.rb-on #rod-wrap-options .option-item-body{display:flex;flex-direction:row;flex-wrap:wrap;align-items:center;gap:6px 14px}.rb-on #rod-wrap-options .option-item-name{min-width:200px}.rb-on #rod-wrap-options .rb-exs{margin-top:0}.rb-on #rod-wrap-options .rb-exs:has(.rb-fax){flex-basis:100%}',
    '.rb-on #rod-wrap-options .design-tile{display:none!important}',
    '.rb-on #rod-wrap-options .option-item{margin:0}',
    '.rb-on #rod-wrap-options > div:not(.option-item){grid-column:1/-1;margin:0!important}',
    '.rb-presets-lbl{font:600 11px var(--font-cond);letter-spacing:.18em;text-transform:uppercase;color:var(--c-gold);margin:14px 0 8px}',
    '.rb-dz{margin-top:16px;border-top:1px solid var(--c-border);padding-top:14px}',
    '.rb-dz-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}',
    '.rb-dz-head b{font-family:var(--font-display);font-size:20px;font-weight:400}.rb-dz-head b em{color:var(--c-gold)}',
    '.rb-dz-now{font-size:13px;color:var(--c-gold-light)}',
    '.rb-dz-note{font-size:12.5px;color:var(--c-muted);margin:4px 0 10px;line-height:1.45}',
    '.rb-dz iframe{display:block;width:100%;min-height:0;border:0;background:transparent}',
    '.rb-on #wrap-preview{display:none!important}',
    '.rb-wphoto.rb-wph-full{height:150px;background-size:contain;background-color:#07090c}',
    '.rb-top .rb-wphoto{display:none}.rb-top.rb-wtop .rb-wphoto{display:block}',
    '.rb-rbar{display:none;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0 2px;padding:8px;background:var(--c-dark2,#14181d);border:1px solid var(--c-border);border-radius:var(--radius)}.rb-rnd-slot .rb-rbar{display:flex;margin:0 0 10px}.rb-load{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#0d1117;transition:opacity .4s}.rb-load-out{opacity:0;pointer-events:none}.rb-load-in{display:flex;flex-direction:column;align-items:center;gap:10px;color:#e6e8eb;font-family:var(--font-body,inherit);text-align:center}.rb-load-in b{font-size:20px;letter-spacing:.02em}.rb-load-in span{font-size:14px;color:#8a94a3}.rb-load-sp{width:44px;height:44px;border-radius:50%;border:3px solid rgba(255,255,255,.15);border-top-color:var(--c-gold,#d4a73c);animation:rbspin .8s linear infinite;margin-bottom:6px}@keyframes rbspin{to{transform:rotate(360deg)}}html.rb-loading{overflow:hidden}.rb-fbr{flex-basis:100%;height:2px}.rb-fax{display:flex;flex:0 0 auto;gap:0;margin:0;border:1px solid var(--c-border);border-radius:8px;overflow:hidden}.rb-exs .rb-fax button{background:none;border:0;border-right:1px solid var(--c-border);border-radius:0;color:var(--c-muted);padding:8px 14px;font:600 14px var(--font-body,inherit);cursor:pointer}.rb-exs .rb-fax button:last-child{border-right:0}.rb-exs .rb-fax button.on{background:var(--c-gold);color:#111}.rb-fax small{font-size:12px;opacity:.85}.rb-rg-sz.rb-rg-sz2{margin-left:24px;display:flex;align-items:center;gap:10px}.rb-len.rb-len-off{filter:blur(2px);opacity:.45;pointer-events:none;user-select:none}',
    '.rb-rs{display:flex;align-items:center;gap:8px;background:var(--c-dark3);border:1px solid var(--c-border);border-radius:999px;padding:4px 10px 4px 4px;color:var(--c-text);font-size:13px;cursor:pointer;text-align:left}',
    '.rb-rs i{width:26px;height:26px;border-radius:50%;border:1px solid rgba(255,255,255,.25)}.rb-rs small{display:block;font:600 9.5px var(--font-cond);letter-spacing:.12em;text-transform:uppercase;color:var(--c-muted)}',
    '.rb-rs.on{border-color:var(--c-gold);box-shadow:0 0 0 2px rgba(201,148,26,.25)}.rb-rs b{margin-left:4px;color:var(--c-muted);font-weight:400;padding:0 2px}.rb-rs b:hover{color:#fff}',
    '.rb-rs.add{padding:8px 14px;border-style:dashed;color:var(--c-muted)}.rb-rs.add small{display:inline;color:var(--c-gold)}.rb-rs-tip{font-size:12px;color:var(--c-muted);margin-left:auto}',
    '@media (max-width:640px){.cfg-section:has(#sfsw-designer),.cfg-section:has(#sfsw-trims){overflow:visible!important}#sfsw-designer,#sfsw-trims{width:100vw!important;max-width:100vw!important;margin-left:calc(50% - 50vw)!important;margin-right:calc(50% - 50vw)!important;border-radius:0!important}}' +
    '.rb-exs.rb-exmode::after{content:"Examples are for ideas. Tap Customize or Builder\\2019s Choice to order.";flex-basis:100%;display:block;font-size:12.5px;color:#e0b13a;margin-top:6px}' +
    '#order-btn.rb-blocked{opacity:.45;cursor:not-allowed}.rb-cart-note{margin:0 0 10px;padding:10px 12px;border:1px solid #c9941a;border-radius:8px;color:#e0b13a;font-size:13.5px;line-height:1.45}.rb-cart-note a{color:#f0c75e;text-decoration:underline}.rb-cart-note.rb-flash{animation:rbFlash .6s 2}@keyframes rbFlash{50%{background:rgba(224,177,58,.18)}}' +
    '.rb-len.rb-len-bc{margin:0 0 12px}' +
    '.rb-exs .rb-len.rb-len-ab{display:inline-flex;margin:0 0 0 auto!important;padding:4px 10px;gap:8px}.rb-len-ab .rb-len-l{flex:0 1 auto;font-size:13px}.rb-len-ab .rb-len-fee{display:none}' +
    '.rb-len{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--c-dark3);border:1px solid var(--c-border);border-radius:var(--radius)}.rb-len-l{flex:1;font-size:14px}.rb-len-l small{display:block;color:var(--c-muted);font-size:12px}.rb-len button{width:32px;height:32px;border-radius:50%;background:var(--c-dark2,#14181d);border:1px solid var(--c-border);color:var(--c-text);font-size:18px;cursor:pointer}.rb-len button:disabled{opacity:.35;cursor:default}.rb-len b{min-width:52px;text-align:center;font-weight:600}.rb-len-fee{min-width:64px;text-align:right;color:var(--c-gold);font:600 13px var(--font-cond)}',
    '.rb-tb-row{display:flex;flex-wrap:wrap;align-items:center;gap:14px;margin-bottom:12px}.rb-tb-w{flex:0 1 360px}.rb-tb-now{font-size:14px;margin:4px 0}.rb-tb-note{color:var(--c-muted);font-size:14px}',
    '.rb-wflow{display:flex!important;flex-direction:column;gap:6px}.rb-wflat{display:contents!important}.rb-wflow>.rb-modes{margin:2px 0 8px}',
    '.rb-rnd-note{display:none;font-size:13px;color:var(--c-muted)}.rb-modes.rnd .rb-rnd-note{display:block}.rb-exs button.rb-exm{border-style:dashed}.rb-exs button.rb-exm.on{border-style:solid}','.rb-rpal{margin-top:4px}.rb-rp-h{font:600 11px var(--font-cond);letter-spacing:.14em;text-transform:uppercase;color:var(--c-muted);margin:10px 0 6px}',
    '.rb-rp{display:flex;flex-wrap:wrap;gap:9px}.rb-rp button{width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.18);cursor:pointer;padding:0}.rb-rp button.on{box-shadow:0 0 0 2px var(--c-dark),0 0 0 4px var(--c-gold)}','.rb-wphoto{height:84px;margin:8px 0 2px;border-radius:var(--radius);border:1px solid var(--c-border);background:#0d0f12 center/cover no-repeat;cursor:zoom-in}',
    '.rb-exs{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;cursor:default}.rb-exs button{background:var(--c-dark3);border:1px solid var(--c-border);border-radius:999px;padding:4px 12px;color:var(--c-text);font-size:12.5px;cursor:pointer}.rb-exs button.on{border-color:var(--c-gold);color:var(--c-gold)}',
    '.rb-modes{margin-top:14px;display:flex;flex-direction:column;gap:8px}.rb-ex-h{font:600 11px var(--font-cond);letter-spacing:.16em;text-transform:uppercase;color:var(--c-muted);margin:4px 0 8px}',
    '.rb-ex-row{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px}.rb-ex-none{color:var(--c-muted);font-size:13px;padding:6px 0}',
    '.rb-exc{flex:0 0 200px;scroll-snap-align:start;display:flex;flex-direction:column;gap:6px;background:var(--c-dark3);border:1px solid var(--c-border);border-radius:var(--radius);padding:6px;color:var(--c-text);font-size:13px;cursor:pointer;text-align:left}',
    '.rb-exc i{display:block;height:96px;border-radius:5px;background:#15171a center/cover no-repeat}.rb-exc span{padding:0 4px 2px}.rb-exc.on{border-color:var(--c-gold);color:var(--c-gold)}.rb-exc.photo span{color:var(--c-muted)}',
    '.rb-mode{cursor:pointer}.rb-mode .rb-mode-go{color:var(--c-muted)}.rb-mode.selected .rb-mode-go{color:var(--c-gold)}',
    '.rb-dz.rb-dz-off{position:absolute!important;left:-99999px!important;top:0;width:900px}',
    '.rb-trim{cursor:pointer}.rb-trim-opts{display:inline-flex;flex-direction:column;align-items:flex-start;gap:8px;margin-top:8px;cursor:default;max-width:100%}',
    '.rb-trim-spots{display:flex;gap:8px;flex-wrap:wrap}.rb-trim-spots button{display:flex;align-items:center;gap:7px;background:var(--c-dark3);border:1px solid var(--c-border);border-radius:999px;padding:6px 13px;color:var(--c-text);font-size:13px;cursor:pointer}',
    '.rb-trim-spots i{width:14px;height:14px;border-radius:4px;border:1.5px solid var(--c-border2,#555);display:inline-block}.rb-trim-spots button.on{border-color:var(--c-gold);color:var(--c-gold)}.rb-trim-spots button.on i{background:var(--c-gold);border-color:var(--c-gold);box-shadow:inset 0 0 0 2px var(--c-dark3)}',
    '.rb-on .seat-preview{display:none!important}',
    '.rb-seat-opts{display:flex;flex-direction:column;align-items:flex-start;gap:10px;margin-top:10px;cursor:default}',
    '.rb-seat-opts:empty{display:none}.rb-seat-opts .seat-color-block{text-align:left;min-width:0;margin:0}.rb-seat-opts .seat-swatch-row{justify-content:flex-start}.rb-seat-opts .seat-color-name{margin-top:4px}',
    '.rb-recs{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0 10px}.rb-recs span{font:600 11px var(--font-cond);letter-spacing:.14em;text-transform:uppercase;color:var(--c-muted);margin-right:4px}',
    '.rb-recs button{display:flex;align-items:center;gap:8px;background:var(--c-dark3);border:1px solid var(--c-border);border-radius:var(--radius);padding:5px 12px 5px 5px;color:var(--c-text);font-size:13px;cursor:pointer}',
    '.rb-recs button.on{border-color:var(--c-gold);color:var(--c-gold)}.rb-recs i{width:54px;height:32px;border-radius:4px;background:#15171a center/cover no-repeat}',
    '.rb-on .thread-photo-preview-wrap{display:none!important}',
    '.rb-wgrp{font:600 11px var(--font-cond);letter-spacing:.16em;text-transform:uppercase;color:var(--c-muted);margin:6px 0 -2px!important}',
    '.rb-on #rod-wrap-options .option-item{align-items:center;gap:10px;padding:7px 10px 7px 7px}',
    '.rb-wth{flex:0 0 64px;width:64px;height:40px;border-radius:5px;background:#15171a center/cover no-repeat;position:relative;cursor:zoom-in;border:1px solid var(--c-border)}',
    '.rb-wth b{position:absolute;right:3px;bottom:2px;font:600 9px var(--font-cond);background:rgba(0,0,0,.65);color:#fff;border-radius:3px;padding:0 4px}',
    '.rb-on #rod-wrap-options .option-item-body{flex:1;min-width:0}',
    '.rb-lb{position:fixed;inset:0;z-index:9999;background:rgba(5,7,9,.92);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:20px}',
    '.rb-lb img{max-width:min(1100px,94vw);max-height:72vh;object-fit:contain;border-radius:8px}',
    '.rb-lb .rb-lbt{color:#e8e4dc;font-size:14px}.rb-lb .rb-lbt span{color:var(--c-muted);margin-left:8px}',
    '.rb-lb button{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:50%;width:44px;height:44px;font-size:22px;cursor:pointer;position:absolute;top:50%;transform:translateY(-50%)}',
    '.rb-lb .rb-lbp{left:16px}.rb-lb .rb-lbn{right:16px}.rb-lb .rb-lbx{top:22px;right:16px;transform:none}',
    '.rb-dz-load{font-size:13px;color:var(--c-muted);padding:20px 0}',
    '.rb-rg{margin:6px 0 10px;padding:12px 14px;background:var(--c-dark3);border:1px solid var(--c-border);border-radius:var(--radius);display:grid;gap:8px}',
    '.rb-rg-lbl{font-size:12.5px;color:var(--c-muted)}.rb-rg-lbl b{color:var(--c-text);font-weight:600}',
    '.rb-rg-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12.5px;color:var(--c-muted)}',
    '.rb-seg{display:inline-flex;flex-wrap:wrap;gap:0;border:1px solid var(--c-border2);border-radius:8px;overflow:hidden;width:max-content;max-width:100%}',
    '.rb-seg button{background:var(--c-dark2);color:var(--c-muted);border:0;border-right:1px solid var(--c-border);padding:7px 12px;font:600 12px var(--font-cond);letter-spacing:.08em;text-transform:uppercase;cursor:pointer}',
    '.rb-seg button:last-child{border-right:0}.rb-seg button[aria-pressed="true"]{background:var(--c-gold);color:#0a0e12}',
    '.rb-seg.rb-big button{padding:9px 16px}',
    '.rb-rg-tabs{display:flex;align-items:center;gap:12px;flex-wrap:wrap}',
    '.rb-rg-stripbox{flex:1 1 380px;min-width:0}.rb-rg-stripbox .rb-rg-row{margin-top:6px}.rb-rg-top + .rb-rg-lbl{margin-top:12px}.rb-rings button.on{outline:2px solid var(--c-gold);outline-offset:-2px;z-index:2;position:relative}',
    '.rb-rg-top{display:flex;align-items:center;gap:10px 22px;flex-wrap:wrap}.rb-rg-sz{display:flex;align-items:center;gap:10px;color:var(--c-muted);font-size:14px}',
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
  S.performanceOnly = false;   // a saved cart from the old Performance Only mode opens as a normal build

  var STEPS = [
    { title: 'Blank', sub: 'Pick the blank, then its length and power.', view: 'all',
      parts: [secOf('sec-blank')] },
    { title: 'Grips', sub: 'The grips, plus heat shrink if you want it.', view: 'handle',
      parts: [secOf('sec-grip'), accCard('acc-heatshrink-options', 'Heat Shrink', 'heatshrink')] },
    { title: 'Butt', sub: 'The butt cap or gimbal at the end of the rod.', view: 'butt',
      parts: [secOf('sec-butt')] },
    { title: 'Reel <em>Seat</em>', tab: 'Reel Seat', sub: 'The reel seat and its color.', view: 'handle',
      parts: [secOf('sec-seat')] },
    { title: 'Wrap', sub: 'Pick any wrap style you want, customize your own, choose from our presets, or let us come up with the design.', view: 'wrap',
      parts: [secOf('sec-wrap-color'), secOf('sec-rod-wraps'), secOf('sec-split-wrap')] },
    { skip: function () { return S.wrapId === 'trim-band' || S.wrapMode === 'random'; }, title: 'Trim Bands', sub: 'The bands at both ends of the wrap that hold the thread down.', view: 'trim', parts: [tbBox()] },
    { title: 'Guides', sub: 'Frame, ring material and frame color.', view: 'guides',
      parts: [secOf('sec-guides')] },
    { title: 'Guide <em>Wraps</em>', tab: 'Guide Wraps', sub: 'How each guide is wrapped onto the blank.', view: 'guides',
      parts: [secOf('sec-guide-wraps')] },
    { title: 'Additions', sub: 'Trim rings, a hook keeper and decals. All optional.', view: 'grips',
      parts: [accCard('acc-trim-options', 'Trim Rings', 'trim'), accCard('acc-hookkeeper-options', 'Hook Keeper', 'hookkeeper'), accCard('acc-decal-count', 'Decals', 'decals')] },
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
    if (i) { var b = el('button', 'btn btn-outline rb-back', '← Back'); b.type = 'button'; b.onclick = function () { go(stepBy(i, -1), true); }; nav.appendChild(b); }
    if (next) { var n = el('button', 'btn btn-primary rb-next', 'Next: ' + (next.tab || next.title) + ' →'); n.type = 'button';
      n.onclick = function () { go(stepBy(i, 1), true); }; nav.appendChild(n); s.nextEl = n; }
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
  function skipOn(k) { return !!(STEPS[k] && STEPS[k].skip && STEPS[k].skip()); }
  function stepBy(i, d) { var k = i + d; while (k > 0 && k < STEPS.length - 1 && skipOn(k)) k += d; return k; }
  function syncSkips() {   // hidden steps (Trim Bands with the Trim Band wrap): no tab, and Next / Back step over them
    var num = 0; STEPS.forEach(function (s, k) { if (s.tabEl) { s.tabEl.style.display = skipOn(k) ? 'none' : ''; var nb = s.tabEl.querySelector('.rb-n'); if (nb && !skipOn(k)) nb.textContent = ++num; }   // the tabs count up without gaps
      if (s.nextEl) { var nx = STEPS[stepBy(k, 1)]; s.nextEl.innerHTML = 'Next: ' + (nx.tab || nx.title) + ' →'; } });
    if (skipOn(cur)) go(stepBy(cur, 1));
  }
  // the wrap examples are ideas, not something to order: Add to Cart needs Customize or Builder's Choice
  function wrapReady() { return S.wrapMode === 'build' || S.wrapMode === 'random' || S.wrapId === 'abalone' || !presetOf(S.wrapId); }
  function cartGate() { var ob = document.getElementById('order-btn'); if (!ob) return; var ok = wrapReady(), n = document.getElementById('rb-cart-note');
    ob.classList.toggle('rb-blocked', !ok); ob.setAttribute('aria-disabled', String(!ok));
    [].forEach.call(document.querySelectorAll('#rod-wrap-options .rb-exs'), function (b) { b.classList.toggle('rb-exmode', !ok); });   // a hint under the example buttons
    if (!ok && !n) { n = el('div', 'rb-cart-note'); n.id = 'rb-cart-note'; ob.parentNode.insertBefore(n, ob); }
    if (n) { n.style.display = ok ? 'none' : ''; n.innerHTML = 'The wrap examples are for ideas. To order, go to <a href="#" id="rb-cart-go">Wrap</a> and pick <b>Customize</b> (start from the example and make it yours) or <b>Builder\'s Choice</b>.';
      var g = document.getElementById('rb-cart-go'); if (g) g.onclick = function (e) { e.preventDefault(); toWrapStep(); }; } }
  function toWrapStep() { for (var k = 0; k < STEPS.length; k++) if (STEPS[k].view === 'wrap' && /Wrap/.test(STEPS[k].tab || STEPS[k].title) && !/Guide/.test(STEPS[k].tab || STEPS[k].title)) { go(k, true); return; } }
  (function () { var ob = document.getElementById('order-btn'); if (!ob) return;
    ob.addEventListener('click', function (e) { if (wrapReady()) return; e.preventDefault(); e.stopImmediatePropagation(); cartGate();
      var n = document.getElementById('rb-cart-note'); if (n) { n.classList.remove('rb-flash'); void n.offsetWidth; n.classList.add('rb-flash'); } }, true);
    setInterval(cartGate, 800); })();   /* (cheap: keeps the button in step with the wrap mode) */
  function go(i, scroll) {
    cur = Math.max(0, Math.min(STEPS.length - 1, i)); reached = Math.max(reached, cur);
    STEPS.forEach(function (s, k) {
      s.panel.classList.toggle('on', k === cur); s.tabEl.classList.toggle('on', k === cur);
      s.tabEl.classList.toggle('done', k < reached && k !== cur || (k < cur)); s.tabEl.setAttribute('aria-selected', k === cur);
    });
    lastView = null; view(STEPS[cur].view, true); if (tbEl) setTimeout(renderTB, 0);
    updTop();
    if (typeof placeLengths === 'function') { placeLengths(); moreLinks(); }
    if (scroll) { var y = top.getBoundingClientRect().top + scrollY - navH() - 6; if (Math.abs(scrollY - y) > 4) scrollTo({ top: y, behavior: 'smooth' }); }
    if (typeof window.sfswTrack === 'function') { try { window.sfswTrack('rod_builder_step', STEPS[cur].tab || STEPS[cur].title.replace(/<[^>]+>/g, '')); } catch (e) {} }
  }
  stage.querySelector('.rb-hide').onclick = function () { stage.classList.add('rb-min'); };
  showBtn.onclick = function () { stage.classList.remove('rb-min'); };

  // ───────────────────────── the 3D rod ─────────────────────────
  var frame = el('iframe'); frame.title = '3D preview of the rod you are building'; frame.src = CFG.engine; stage.insertBefore(frame, stage.firstChild);
  var rod = null, lastView = null, lastSent = '', dzBusy = false, lastMain = null, busyT = null;
  var stepAt = 0;
  // "Loading" over the page until the 3D rod, its first wrap and the wrap designer are all ready (at most 25 s, and never on a device without 3D)
  var loadEl = document.getElementById('rb-load0') || el('div', 'rb-load', '<div class="rb-load-in"><div class="rb-load-sp"></div><b>Loading the Rod Builder…</b><span>Setting up your 3D rod</span></div>');
  window.__rbLoadOwned = true; if (!loadEl.parentNode) document.body.appendChild(loadEl); document.documentElement.classList.add('rb-loading');
  var loadAt = Date.now(), loadT = setInterval(function () {
    var fw = null; try { fw = frame && frame.contentWindow; } catch (e) {}
    var ready = !frame.isConnected || (rod && fw && fw.__sfswDone >= 1 && !fw.__sfswHoldMain && S.customDesign && S.customDesign.sfsw && dw() && dw().wlCapture);
    if (ready || Date.now() - loadAt > 25000) { clearInterval(loadT); loadEl.classList.add('rb-load-out'); document.documentElement.classList.remove('rb-loading', 'rb-loading0'); setTimeout(function () { loadEl.remove(); }, 450); }
  }, 150);
  function view(v, step) { if (!v || (v === lastView && !step)) return; lastView = v; if (step) stepAt = Date.now(); if (rod) rod.view(v, !!step); }
  var poll = setInterval(function () {
    try { var w = frame.contentWindow; if (w && w.SFSW_rod) { rod = w.SFSW_rod; clearInterval(poll); clearTimeout(giveUp); lastSent = ''; sync(); var v = lastView; lastView = null; rod.ready.then(function () { setTimeout(function () { view(v || STEPS[cur].view); }, 300); }); } } catch (e) {}
  }, 200);
  // no 3D on this device (WebGL off, or Chrome blocked it after a graphics reset): say so in the 3D box; the steps still work
  function no3D(lost) { if (rod && !lost) return; if (stage.querySelector('.rb-no3d')) return; clearInterval(poll); clearTimeout(giveUp); frame.remove();
    var m = el('div', 'rb-no3d', '<div><b>The 3D preview can\u2019t start in this browser right now.</b><br>Quit and reopen your browser, then reload this page. Your picks still work below.</div>');
    stage.appendChild(m); }
  var giveUp = setTimeout(no3D, 30000);
  addEventListener('message', function (e) { if (e.data && e.data.sfswRod === 'lost' && e.source === frame.contentWindow) no3D(true); });   // the graphics chip dropped the 3D: stop, don't retry
  (function () { try { var c = document.createElement('canvas'), g = c.getContext('webgl2') || c.getContext('webgl'); if (!g) setTimeout(no3D, 0); else { var lx = g.getExtension('WEBGL_lose_context'); if (lx) lx.loseContext(); } } catch (e) { setTimeout(no3D, 0); } })();   // quick check, then give the context straight back
  frame.addEventListener('load', function () { try { frame.contentWindow.addEventListener('error', function (e) { if (/WebGL/i.test(String(e.message))) no3D(); }); } catch (e) {} });

  // the camera follows what is being picked
  panels.addEventListener('click', function (e) {
    var body = e.target.closest('.cfg-section-body'), card = e.target.closest('.rb-acc');
    var v = card ? ({ heatshrink: 'handle', trim: 'handle', hookkeeper: 'handle', decals: 'wrap' })[card.dataset.rb] : body && VIEW_OF[body.id];
    var at = cur; if (v) setTimeout(function () { if (cur === at) view(v); }, 60);   // skip it if the customer already moved to another tab
  }, true);

  // ── what was picked → what the 3D rod shows ──
  var CORK_AS = { 'burl-horizontal': 'burl-camo', 'burl-vertical': 'burl-tiger', 'burnt': 'rubber', 'burnt-mix': 'rubber-chunk', 'cactus-1': 'burl-green', 'cactus-2': 'burl-green',
    'cactus-3': 'burl-green', 'green': 'spk-green', 'meadow': 'burl-green', 'red': 'burl-red', 'stacked-1': 'sandwich', 'stacked-2': 'sandwich', 'stacked-3': 'sandwich' };
  var SHRINK_AS = { xwrap: 'xflock', scale: 'fish', honey: 'honey' };
  var TRIM_AS = { 'at-trim': 'step', 'alps-trim': 'dimple', 'matagi-trim': 'slim' };
  var TRIM_COL = { Gunsmoke: 'Gunmetal', 'Pale Gold': 'Champagne', 'Dark Gunmetal': 'Gunmetal' };
  // rod wraps the 3D rod can lay thread for; the rest show the thread colors as a plain wrap
  var WRAP_AS = { 'trim-band': ['trim', 2], 'diam-2': ['diamond', 2], 'chev-2': ['chevron', 2], 'chev-4': ['chevron', 4], 'diam-4': ['diamond', 4],
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
      if (!/cross/i.test(design.kind || '') && design.setup && Array.isArray(design.setup.stripes)) return underOn() ? { setup: design.setup, blank: S.under.c } : { setup: design.setup };
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
    if (CFG.wrap && CFG.wrap.dB) p.wrapD = +CFG.wrap.dB;   // the blank is this thick where the wrap starts
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
    var TL = trimLoc(), ck = function (id) { var tc = (S.trimRingColor || {})[id]; return { t: TRIM_AS[id] || 'slim', c: TRIM_COL[tc] || tc || 'Silver' }; };
    p.chkFore = !!TL.fore; p.chkSplit = !!TL.split && p.style === 'split';
    p.ckF = TL.fore ? ck(TL.fore) : null; p.ckS = p.chkSplit ? ck(TL.split) : null;
    var k0 = p.ckF || p.ckS; if (k0) { p.checkType = k0.t; p.check = k0.c; }
    // wraps
    var main = hexOf(S.mainIdx), sup = (S.supportIdxs || []).map(hexOf);
    var rnd = S.wrapMode === 'random', dc = !rnd && S.customDesign && S.customDesign.colors && S.customDesign.colors.length ? S.customDesign.colors.map(function (c) { return c.hex; }) : null;
    if (dc) { main = dc[0]; sup = dc.slice(1); }
    p.mainOn = true;
    var ABW = (val('ROD_WRAPS') || []).find(function (w) { return w.id === 'abalone'; }) || { colors: ['Classic'] };
    var AT = abTrim(), abSpec = function (idx) { var c = ABW.colors[idx || 0] || 'Classic'; return { abalone: { img: BASE + 'rod-parts/abalone/' + c.toLowerCase() + '.jpg' }, pattern: 'diamond', axes: 2, stripes: [{ c: '#141414', t: 6 }], trims: { on: AT.on, mm: AT.mm, c: AT.c, bands: [], ends: [] }, len: CFG.wrap ? wrapLen() : undefined }; };   // abalone under clear coat, thin gold trim
    if (S.wrapId === 'abalone') p.main = abSpec(S.abaloneColorIdx);
    else if (dzBusy && !rnd && presetOf(S.wrapId) && lastMain) p.main = lastMain;
    else if (!rnd && S.customDesign && S.customDesign.setup && S.customDesign.sfsw) p.main = { full: S.customDesign.setup, kind: S.customDesign.sfsw };
    else if (!rnd && wrapLen() === BASE_LEN() && LOOK[(wrapNamed(S.wrapId) || {}).name]) p.main = { full: Object.assign({}, LOOK[wrapNamed(S.wrapId).name], { unit: 'in', len: wrapLen().toFixed(2) }), kind: 'taper' };   // until the designer is up: the wrap's own design
    else p.main = wrapSpec(S.wrapId, main, sup, rnd ? null : S.customDesign, notes, 'rod wrap');
    if (p.main && !p.main.full && CFG.wrap) p.main.len = wrapLen();
    if (rnd && p.main && !p.main.full && S.wrapId !== 'abalone') p.main.trims = Object.assign({}, p.main.trims || {}, { on: false });   // Builder's Choice: no trim bands shown
    if (rnd && p.main && !p.main.full && S.wrapId !== 'abalone') p.main.veil = { colors: (bcDragon() && (val('WRAP_COLORS') || [])[bcScaleIdx()] ? [(val('WRAP_COLORS') || [])[bcScaleIdx()].hex] : []).concat([main].concat(sup)).filter(Boolean), name: ((wrapNamed(S.wrapId) || {}).name || '').replace(/\s*\u2014\s*/g, ' - ') };   // Builder's Choice: a sheet over the wrap with their colors
    lastMain = p.main;
    var sw = call('isSplitGrip') ? call('getSplitWrap') : null;
    p.splitOn = !!sw; if (sw) p.split = sw.id === 'abalone' ? abSpec(S.splitAbaloneColorIdx) : wrapSpec(sw.id, main, sup, null, notes, 'split wrap');
    p.gw = S.guideWrapUserSelected ? guideWrapSpec(S.guideWrapId, main, sup, notes)
      : { under: false, underC: '#1a1a1a', footC: '#1a1a1a', bands: [], trims: [{ c: '#dabd66', t: 3 }] };   // black foot wraps with gold trim bands (9130 Metallic Gold) until a guide wrap is picked (wrap examples don't change them)
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
      if (dzBusy && S.wrapMode !== 'random' && presetOf(S.wrapId)) return;   // a new wrap is being laid out: one update when it's ready, not two
      var key = JSON.stringify(s.p); if (key === lastSent) return; lastSent = key;
      var r0 = rod.set(s.p); if (r0 && r0.then && Date.now() - stepAt < 4000) r0.then(function () { if (rod && lastView) rod.view(lastView, true); });
    }, 40);
  }

  // every pick on the page ends in updateAll(): follow it
  var _update = window.updateAll;
  window.updateAll = function () {
    try {   // heat shrink only goes on the foam split and full grips: hidden, and taken off the build, for every other grip
      var gg = call('getGrip') || {}, foam = gg.mat === 'eva' && (gg.id === 'eva-split' || gg.id === 'eva-full'), /* foam split or full only (not custom) */ hs = document.querySelector('.rb-acc[data-rb="heatshrink"]');
      if (hs) hs.style.display = foam ? '' : 'none';
      if (!foam && S.heatShrinkId) { S.heatShrinkId = null; call('renderAccessories'); }
    } catch (e) {}
    try { rgPrice(); } catch (e) {}
    var r = _update.apply(this, arguments);
    try {
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
    'Trim Band': { k: 'taper', p: 'trim', a: 2, recs: [   // a trim band on its own, with a design in the middle
      { trim: '862 Twilight Black', stripes: [['862 Twilight Black', 1]], tb: { mm: 50.8, c: '862 Twilight Black',
        bands: [['9100 Metallic Yellow Gold', 4], ['862 Twilight Black', 2], ['807 White', 1, 'mid', '862 Twilight Black'], ['807 White', 2], ['', 3, 'fade'], ['862 Twilight Black', 6], ['9100 Metallic Yellow Gold', 4], ['9100 Metallic Yellow Gold', 1, 'mid', '862 Twilight Black']],
        ends: [['9100 Metallic Yellow Gold', 6]] } },
      { trim: '404 Teal', stripes: [['404 Teal', 1]], tb: Object.assign({ mm: 50.8 }, { c: '404 Teal', bands: [['404 Teal', 2], ['464 Blurple', 4], ['404 Teal', 1, 'tip', '464 Blurple'], ['404 Teal', 3], ['404 Teal', 1, 'tip', '464 Blurple'], ['464 Blurple', 2], ['', 3, 'fade']], noFill: true,
        ends: [['404 Teal', 4], ['', 3, 'fade'], ['434 Maui Surf', 4], ['', 3, 'fade'], ['428 Summer Sky', 4], ['', 3, 'fade'], ['449 Wildberry', 4], ['', 3, 'fade'], ['455 Cobalt', 4], ['', 3, 'fade'], ['464 Blurple', 4], ['', 3, 'fade'], ['455 Cobalt', 4], ['', 3, 'fade'], ['449 Wildberry', 4], ['', 3, 'fade'], ['428 Summer Sky', 4], ['', 3, 'fade'], ['434 Maui Surf', 4], ['', 3, 'fade'], ['404 Teal', 4]] }) },   // example 2: teal to blurple fade
      { trim: '404 Teal', stripes: [['404 Teal', 1]], tb: { mm: 50.8, c: '404 Teal',   // example 3: teal and neon pink
        bands: [['361 Neon Pink', 2], ['862 Twilight Black', 2], ['361 Neon Pink', 1, 'mid', '862 Twilight Black'], ['361 Neon Pink', 3], ['404 Teal', 1, 'mid', '361 Neon Pink'], ['404 Teal', 4]],
        ends: [['361 Neon Pink', 3], ['', 4, 'fade'], ['404 Teal', 7], ['404 Teal', 1, 'mid', '361 Neon Pink'], ['361 Neon Pink', 3], ['862 Twilight Black', 2], ['361 Neon Pink', 2], ['862 Twilight Black', 2], ['361 Neon Pink', 3], ['404 Teal', 1, 'mid', '361 Neon Pink'], ['404 Teal', 7], ['', 4, 'fade'], ['361 Neon Pink', 3]] } } ] },
    'Diamond — 2 Axis': { k: 'taper', p: 'diamond', a: 2, recs: [   // one design per photo, in photo order; the first stripe is the center
      { trim: '479 Gulfstream',
        stripes: [['9860 Metallic Silver', 1], ['862 Twilight Black', 4], ['9860 Metallic Silver', 4], ['841 Iron Ore', 4], ['479 Gulfstream', 6], ['862S Metallic Twist Black/Silver', 2],
          ['479 Gulfstream', 3], ['841 Iron Ore', 3], ['479 Gulfstream', 4], ['9860 Metallic Silver', 2], ['862 Twilight Black', 1]] },
      { trim: '513 Guacamole',
        stripes: [['9520 Metallic Green', 1], ['862 Twilight Black', 4], ['9520 Metallic Green', 3], ['807 White', 2], ['513 Guacamole', 6], ['807 White', 2],
          ['9520 Metallic Green', 2], ['862 Twilight Black', 2], ['9520 Metallic Green', 1], ['862 Twilight Black', 2], ['9520 Metallic Green', 2], ['807 White', 2],
          ['819 Ghost Grey', 6], ['807 White', 2]] },
      { trim: '862 Twilight Black',
        stripes: [['9100 Metallic Yellow Gold', 1], ['862 Twilight Black', 4], ['9100 Metallic Yellow Gold', 3], ['813 Silver Shiner', 6], ['862 Twilight Black', 6],
          ['9100 Metallic Yellow Gold', 6], ['819 Ghost Grey', 2], ['862 Twilight Black', 2], ['9100 Metallic Yellow Gold', 2]] } ] }, 'Chevron — 2 Axis': { k: 'taper', p: 'chevron', a: 2, recs: [   // example 1 points to the tip, example 2 to the butt
      { trim: '484 Deep Sea', chevTo: 'tip', stripes: [['9860 Metallic Silver', 5], ['484 Deep Sea', 2], ['9860 Metallic Silver', 4], ['484 Deep Sea', 3], ['9860 Metallic Silver', 3], ['479 Gulfstream', 4],
          ['9860 Metallic Silver', 2], ['484 Deep Sea', 5]] },
      { trim: '484 Deep Sea', chevTo: 'butt', stripes: [['807 White', 5], ['862 Twilight Black', 2], ['807 White', 4], ['862 Twilight Black', 3], ['807 White', 3], ['862 Twilight Black', 4],
          ['807 White', 2], ['862 Twilight Black', 5], ['9860 Metallic Silver', 2]] } ] },
    'Dragon Scale': { k: 'taper', p: 'dragon', a: 8, recs: [   // photo 1: metallic green scales, photo 3: metallic silver at 30°, photo 2: metallic blue; the trim bands start in the scales' metallic
      { trim: '9520 Metallic Green', stripes: [['862 Twilight Black', 1]], dragon: { metal: '9520 Metallic Green', line: '862 Twilight Black' } },
      { trim: '9860 Metallic Silver', angle: '30', stripes: [['862 Twilight Black', 1]], dragon: { metal: '9860 Metallic Silver', line: '862 Twilight Black' } },
      { trim: '9460 Metallic Deep Blue', stripes: [['862 Twilight Black', 1]], dragon: { metal: '9460 Metallic Deep Blue', line: '862 Twilight Black' } } ] }, 'Chevron — 4 Axis': { k: 'taper', p: 'chevron', a: 4, recs: [
      { trim: '484 Deep Sea', stripes: [['807 White', 2], ['9860 Metallic Silver', 4], ['807 White', 3], ['9860 Metallic Silver', 3], ['807 White', 4], ['9860 Metallic Silver', 2], ['484 Deep Sea', 2], ['807 White', 4],
          ['484 Deep Sea', 3], ['807 White', 3], ['484 Deep Sea', 4], ['807 White', 2], ['9120 Metallic Goldenrod', 2], ['484 Deep Sea', 3], ['9120 Metallic Goldenrod', 3], ['484 Deep Sea', 2], ['9120 Metallic Goldenrod', 4]] },   // example 1; example 2:
      { trim: '484 Deep Sea', stripes: [['807 White', 5], ['862 Twilight Black', 2], ['807 White', 4], ['862 Twilight Black', 3], ['807 White', 3], ['862 Twilight Black', 4], ['807 White', 2], ['862 Twilight Black', 5],
          ['9860 Metallic Silver', 2], ['862 Twilight Black', 4], ['9860 Metallic Silver', 3], ['862 Twilight Black', 3], ['9860 Metallic Silver', 4], ['862 Twilight Black', 2], ['9860 Metallic Silver', 5]] },   // example 3 has a chevron pattern between, against the main pattern, pointing to the butt
      { trim: '862 Twilight Black', chevTo: 'butt', stripes: [['807 White', 3], ['850 Storm Cloud', 1], ['807 White', 2], ['850 Storm Cloud', 2], ['807 White', 1], ['850 Storm Cloud', 3], ['862 Twilight Black', 1], ['850 Storm Cloud', 2],
          ['862 Twilight Black', 2], ['850 Storm Cloud', 1], ['862 Twilight Black', 3], ['325 Fire Red', 8], ['862 Twilight Black', 3]],
        inner: { pattern: 'chevron', place: 'against', chevTo: 'tip', stripes: [['325 Fire Red', 2], ['807 White', 4], ['325 Fire Red', 2], ['807 White', 4], ['325 Fire Red', 4]] } }] },
    'Chevron — 8 Axis': { k: 'taper', p: 'chevron', a: 8, recs: [   // Brett's three 8 axis examples (all point toward the tip)
      { trim: '9470 Metallic Bluefin', chevTo: 'tip', stripes: [['807 White', 4], ['9470 Metallic Bluefin', 4], ['807 White', 4], ['9470 Metallic Bluefin', 4]] },
      { trim: '9470 Metallic Bluefin', chevTo: 'tip', stripes: [['807 White', 4], ['9300 Metallic Red', 4], ['807 White', 2], ['9470 Metallic Bluefin', 2], ['807 White', 2], ['9470 Metallic Bluefin', 2],
          ['807 White', 2], ['9470 Metallic Bluefin', 2]] },
      { trim: '862 Twilight Black', chevTo: 'tip', stripes: [['807 White', 3], ['9300 Metallic Red', 1], ['807 White', 2], ['9300 Metallic Red', 2], ['807 White', 1], ['9300 Metallic Red', 3],
          ['862 Twilight Black', 1], ['9300 Metallic Red', 2], ['862 Twilight Black', 2], ['9300 Metallic Red', 1], ['862 Twilight Black', 3]] } ] }, 'Chevron — 16 Axis': { k: 'taper', p: 'chevron', a: 16, recs: [   // Brett's three 16 axis examples (all point toward the tip)
      { trim: '9600 Metallic Purple', chevTo: 'tip', stripes: [['862 Twilight Black', 3], ['9600 Metallic Purple', 1], ['862 Twilight Black', 2], ['807 White', 2], ['862 Twilight Black', 2],
          ['9600 Metallic Purple', 3], ['862 Twilight Black', 1]] },
      { trim: '519 Rainforest', chevTo: 'tip', stripes: [['862 Twilight Black', 3], ['519 Rainforest', 2], ['862 Twilight Black', 2], ['519 Rainforest', 3], ['862 Twilight Black', 2]] },
      { trim: '404 Teal', chevTo: 'tip', stripes: [['404 Teal', 2], ['862 Twilight Black', 2], ['404 Teal', 2], ['862 Twilight Black', 2], ['404 Teal', 2]] } ] },
    'Diamond — 4 Axis': { k: 'taper', p: 'diamond', a: 4, recs: [   // examples 1-3, in photo order; the first stripe is the center
      { trim: '479 Gulfstream',
        stripes: [['9860 Metallic Silver', 1], ['862 Twilight Black', 3], ['9860 Metallic Silver', 4], ['479 Gulfstream', 8], ['862S Metallic Twist Black/Silver', 2], ['862 Twilight Black', 3]] },
      { trim: '9470 Metallic Bluefin',
        stripes: [['9870 Metallic Gunmetal', 1], ['807 White', 2], ['9870 Metallic Gunmetal', 4], ['807 White', 3], ['9470 Metallic Bluefin', 2], ['807 White', 3],
          ['9470 Metallic Bluefin', 4], ['807 White', 1]] },
      { trim: '479 Gulfstream',
        stripes: [['9860 Metallic Silver', 1], ['862 Twilight Black', 3], ['9860 Metallic Silver', 3], ['479 Gulfstream', 8], ['862S Metallic Twist Black/Silver', 2], ['862 Twilight Black', 3],
          ['479 Gulfstream', 1], ['862 Twilight Black', 2], ['479 Gulfstream', 2], ['862 Twilight Black', 1], ['479 Gulfstream', 3], ['9860 Metallic Silver', 1]] },
      { trim: '479 Gulfstream',   // example 4
        stripes: [['9860 Metallic Silver', 6], ['479 Gulfstream', 3], ['455 Cobalt', 1], ['479 Gulfstream', 2], ['455 Cobalt', 2], ['479 Gulfstream', 1], ['455 Cobalt', 3], ['836 Forged Steel', 1],
          ['455 Cobalt', 2], ['836 Forged Steel', 2], ['455 Cobalt', 1], ['836 Forged Steel', 3], ['807 White', 1], ['836 Forged Steel', 2], ['807 White', 2]] } ] },
    '8 Axis Wrap': { k: 'taper', p: 'diamond', a: 8, recs: [   // our own designs in the style of the 4 axis examples (fewer threads per color with more axes)
      { trim: '479 Gulfstream', stripes: [['9860 Metallic Silver', 1], ['862 Twilight Black', 2], ['9860 Metallic Silver', 2], ['479 Gulfstream', 4], ['862S Metallic Twist Black/Silver', 1], ['862 Twilight Black', 2]] },
      { trim: '9470 Metallic Bluefin', stripes: [['9870 Metallic Gunmetal', 1], ['807 White', 1], ['9470 Metallic Bluefin', 2], ['807 White', 2], ['9870 Metallic Gunmetal', 2], ['807 White', 1]] },
      { trim: '862 Twilight Black', stripes: [['9100 Metallic Yellow Gold', 1], ['862 Twilight Black', 2], ['9100 Metallic Yellow Gold', 2], ['479 Gulfstream', 3], ['862 Twilight Black', 1], ['9860 Metallic Silver', 2]] } ] },
    '16 Axis Wrap': { k: 'taper', p: 'diamond', a: 16, recs: [
      { trim: '479 Gulfstream', stripes: [['9860 Metallic Silver', 1], ['862 Twilight Black', 1], ['479 Gulfstream', 2], ['862S Metallic Twist Black/Silver', 1], ['862 Twilight Black', 1]] },
      { trim: '9470 Metallic Bluefin', stripes: [['807 White', 1], ['9470 Metallic Bluefin', 1], ['9870 Metallic Gunmetal', 2], ['807 White', 1], ['9470 Metallic Bluefin', 1]] },
      { trim: '862 Twilight Black', stripes: [['9100 Metallic Yellow Gold', 1], ['862 Twilight Black', 1], ['9860 Metallic Silver', 1], ['479 Gulfstream', 2], ['862 Twilight Black', 1]] } ] },
    '2 Axis Wrap Over Dragon Scales': { k: 'taper', p: 'dragon', a: 8, over: true, recs: [   // sax / angle: the scales; over: the diamond wrap on top
      { trim: '479 Gulfstream', sax: 16, angle: '45', dragon: { metal: '9870 Metallic Gunmetal', line: '862 Twilight Black', over: { on: true, pattern: 'diamond', axes: 2, angle: 60 } },
        stripes: [['9120 Metallic Goldenrod', 6], ['862 Twilight Black', 2], ['479 Gulfstream', 5], ['862 Twilight Black', 2], ['850 Storm Cloud', 5], ['807 White', 3], ['325 Fire Red', 5],
          ['807 White', 3], ['862 Twilight Black', 2], ['9120 Metallic Goldenrod', 5], ['862 Twilight Black', 2]] },
      { trim: '9860 Metallic Silver', sax: 8, angle: '30', dragon: { metal: '9860 Metallic Silver', line: '862 Twilight Black', over: { on: true, pattern: 'diamond', axes: 2, angle: 45 } },
        stripes: [['Light Blue', 6], ['850 Storm Cloud', 5], ['807 White', 1], ['9470 Metallic Bluefin', 5], ['Light Blue', 5], ['850 Storm Cloud', 4], ['807 White', 1], ['9470 Metallic Bluefin', 5], ['807 White', 1]] },
      { trim: '9120 Metallic Goldenrod', sax: 8, angle: '45', dragon: { metal: '9120 Metallic Goldenrod', line: '862 Twilight Black', over: { on: true, pattern: 'diamond', axes: 2, angle: 45 } },
        stripes: [['807 White', 10], ['9120 Metallic Goldenrod', 3], ['862 Twilight Black', 5], ['9120 Metallic Goldenrod', 3], ['807 White', 5], ['9120 Metallic Goldenrod', 3], ['862 Twilight Black', 4]] } ] },
    'Snowflake Wrap': { k: 'cross', pat: 'Snowflake', a: 2 }, '2 Axis Cross Wrap': { k: 'cross', a: 2, other: true, recs: [{}, { pat: 'Snowflake' }, {}] }, '4 Axis Cross Wrap': { k: 'cross', a: 4, other: true }
  };
  var WRAPS = val('ROD_WRAPS') || [];
  var wrapById = function (id) { return WRAPS.find(function (w) { return w.id === id; }); };
  var idByName = function (n) { var w = WRAPS.find(function (x) { return x.name === n; }); return w ? w.id : null; };
  var presetOf = function (id) { var w = wrapById(id); return w ? PRESET[w.name] : null; };
  var wrapSec = $('sec-rod-wraps'), colorSec = secOf('sec-wrap-color'), optList = $('rod-wrap-options');
  if (optList) { var dwT = null; new MutationObserver(function (ms) {   // however and whenever the list gets drawn, it gets its Diamond / Chevron rows and examples
    var it = optList.querySelector('.option-item'); if (!it || it.__rbd) return;   // only a freshly drawn list (our own moves inside it don't count)
    clearTimeout(dwT); dwT = setTimeout(function () { var f = optList.querySelector('.option-item'); if (!f || f.__rbd) return; [].forEach.call(optList.querySelectorAll('.option-item'), function (o) { o.__rbd = true; }); try { dressWraps(); } catch (e) {} }, 0); }).observe(optList, { childList: true }); }
  setTimeout(function () { if (optList && optList.querySelector('.option-item')) try { dressWraps(); } catch (e) {} }, 0);   // the list the page drew before this script ran
  var dzBox = null, dz = null, dzKind = null, dzReady = null, readT = null, lastKind = null, modeEl = null, wphoto = null;
  if (!S.under) S.under = { on: false, c: null };
  if (!S.wrapMode) S.wrapMode = S.customDesign && S.customDesign.sfsw ? 'build' : 'example';
  if (wrapSec && optList && WRAPS.length) {
    wphoto = el('div', 'rb-wphoto'); wphoto.title = 'See it bigger'; wphoto.hidden = true; optList.insertAdjacentElement('beforebegin', wphoto);
    optList.insertAdjacentHTML('beforebegin', '<div class="rb-presets-lbl">Our wraps · pick one to start</div>');
    [].forEach.call(wrapSec.querySelectorAll('p'), function (x) { if (/Design Your Own/.test(x.textContent)) x.style.display = 'none'; });   // the old pop-up designer's note
    dzBox = el('div', 'rb-dz', '<div class="rb-dz-head"><b>Wrap <em>Designer</em></b><span class="rb-dz-now"></span></div>' +
      '<div class="rb-dz-note">Pick a preset or tap a color to change it and set the thread counts. Every change shows on the 3D rod. 4 different colors included (the same color in more thread lines is free) · +$10 each extra color · metallics included · Ultra-UV metallics and Metallic Twists +$10 each.</div><div class="rb-dz-load">Loading the designer…</div>');
    dz = el('iframe'); dz.id = 'sfsw-designer'; dz.title = 'Wrap Designer'; dz.setAttribute('scrolling', 'no');
    dzBox.appendChild(dz);
    var setMore = function () {   // the designer always shows its full settings; the Trim Band wrap shows only its trim settings
      try { dz.contentDocument.documentElement.classList.remove('sfsws'); dz.contentDocument.documentElement.classList.toggle('sfswtb', S.wrapId === 'trim-band'); } catch (e) {} };
    var fitDz = function () { try { var d = dz.contentDocument, w = d.querySelector('.wrap'); if (!w) return; var b = w.getBoundingClientRect().bottom;
      [].forEach.call(d.querySelectorAll('.cpop'), function (pp) { if (pp.offsetParent) b = Math.max(b, pp.getBoundingClientRect().bottom + 12); });   // room for an open color picker
      dz.style.height = Math.ceil(b + d.defaultView.scrollY) + 4 + 'px'; } catch (e) {} };
    dz.addEventListener('load', function () { setMore();
      try { var dd = dz.contentDocument, ob = dd.getElementById('openBox'), iw = dd.getElementById('innerWrap'); if (ob && iw) iw.parentNode.insertBefore(ob, iw);   // Color filler right under the thread colors
        underBox(dd, iw); presetBox(dd); axisHook(dd); tgSkin(dd); fillNote(dd);
        if (dd.getElementById('pat')) { var rbx = dd.getElementById('repBox'); if (rbx) rbx.style.setProperty('display', 'none', 'important');   // cross wraps: repetitions fill the wrap on their own; no blank color here
          var bcx = dd.getElementById('blankC'), bf = bcx && bcx.closest('.f'); if (bf) bf.style.display = 'none';
          try { var tgT = null; new dz.contentWindow.MutationObserver(function () { clearTimeout(tgT); tgT = setTimeout(function () { tgSkin(dd); }, 30); }).observe(dd.body, { childList: true, subtree: true }); } catch (e) {} } trimPresetBox(dd, dz.contentWindow, function () { clearTimeout(readT); readT = setTimeout(readDesign, 150); });
        try { new dz.contentWindow.MutationObserver(function () { tgSkin(dd); }).observe(dd.getElementById('innerWrap').parentNode, { childList: true, subtree: true }); } catch (e) {}
        try { var rb = dd.getElementById('resetThreads'); if (rb && !rb.__sfsw) { rb.__sfsw = true;   // reset goes back to the picked preset, or to the wrap the customizer started with
          rb.addEventListener('click', function (e) { e.preventDefault(); e.stopImmediatePropagation(); var pr = lastPreset;
            if (pr === 'scratch') presetScratch(); else presetApply(pr || presetsFor()[0]);
            rb.textContent = 'Reset'; setTimeout(function () { rb.textContent = 'Reset threads to original'; }, 1200); }, true); } } catch (e) {}
        try { var ab = dd.getElementById('armsBtn'); if (ab && !ab.querySelector('.sfswFee')) ab.insertAdjacentHTML('beforeend', ' <small class="sfswFee" style="color:#d4a73c;font-weight:600">+$20</small>'); } catch (e) {}
        [].forEach.call(dd.querySelectorAll('span,label,div,small'), function (x) { if (/^\s*Thread size\s*$/.test(x.textContent) && !x.querySelector('input,button,select')) x.style.display = 'none'; });   // the leftover "Thread size" label
        dd.addEventListener('change', function (e) { if (!e.target || e.target.id !== 'innerOn' || !e.target.checked) return;   // a pattern between starts with a thread line to customize
          setTimeout(function () { try { var w = dz.contentWindow, c = w.wlCapture(); if (c.inner && c.inner.on) { var ms = (c.stripes || []).slice().reverse(); c.inner.stripes = ms.map(function (x, i) { var t = Math.max(i ? 1 : 3, Math.round(x.t * 0.35)); if (i === 0 && t % 2 === 0) t += 1; return { c: x.c, t: t }; }); if (!c.inner.stripes.length) c.inner.stripes = [{ c: '#1e1617', t: 3 }]; c.inner.auto = false; c.inner.touched = true; w.wlApply(c); }   /* starts with the wrap's own colors in the opposite order, about a third the threads */ } catch (x) {} }, 30); }, true);
      } catch (e) {}
      try { new dz.contentWindow.ResizeObserver(fitDz).observe(dz.contentDocument.querySelector('.wrap')); new dz.contentWindow.MutationObserver(function () { setTimeout(fitDz, 0); }).observe(dz.contentDocument.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'hidden', 'class'] }); } catch (e) {} fitDz(); }); setMore();
    // three ways to get a wrap: one of our examples, build your own in the designer, or pick colors and let us lay it out (Random)
    modeEl = el('div', 'rb-modes');
    modeEl.innerHTML = (CFG.wrap ? '<div class="rb-len"><span class="rb-len-l">Wrap length <small>' + BASE_LEN() + ' in included · +$15 each added inch</small></span><button type="button" data-d="-1" aria-label="Shorter">−</button><b></b><button type="button" data-d="1" aria-label="Longer">+</button><span class="rb-len-fee"></span></div>' : '') +

      '<div class="rb-dz-slot"></div>' +
      '<div class="rb-rnd-note">Builder\u2019s Choice: Choose a main color and supporting colors, and we will do a unique design of our choice. 1 Main and 3 supporting colors included (4 colors) · +$10 each extra color.</div>' +
      '<div class="rb-rnd-slot"><div class="rb-rpal"></div></div>';
    ($('wrap-abalone-colors') || optList).insertAdjacentElement('afterend', modeEl);
    modeEl.querySelector('.rb-dz-slot').appendChild(dzBox);
    rndPal = modeEl.querySelector('.rb-rpal'); rndBar = el('div', 'rb-rbar'); rndPal.parentNode.insertBefore(rndBar, rndPal);   // the color slots sit right above the colors, under the note
    [].forEach.call(modeEl.querySelectorAll('.rb-mode'), function (b) { b.onclick = function () { setMode(b.dataset.m === S.wrapMode ? 'example' : b.dataset.m); }; });
    var lenEl = lenBox = modeEl.querySelector('.rb-len'), lbl0 = wrapSec.querySelector('.rb-presets-lbl'); if (lenEl) { lenEl.style.margin = '0 0 12px'; dzBox.insertBefore(lenEl, dzBox.firstChild); }   // wrap length lives in the wrap designer (Customize)
    [].forEach.call(document.querySelectorAll('.rb-len button'), function (b) { b.onclick = function () { setWrapLen(wrapLen() + +b.dataset.d); }; });
    setTimeout(function () { renderModes(); renderLen(); }, 0);
    addEventListener('message', function (e) { if (dz && e.source === dz.contentWindow && e.data && e.data.wlH) fitDz(); });
  }
  var dw = function () { try { return dz && dz.contentWindow; } catch (e) { return null; } };
  function waitFor(test, ms) { return new Promise(function (res) { var t0 = Date.now(); (function tick() { var w = dw(); try { if (w && test(w)) return res(w); } catch (e) {} if (Date.now() - t0 > (ms || 30000)) return res(null); setTimeout(tick, 120); })(); }); }
  function loadKind(kind) {
    if (dzKind === kind && dzReady) return dzReady.then(function (w) { if (w) return w; if (dzReady && dzReady.__null) { dzReady = null; return loadKind(kind); } return w; });   // a designer that never got ready isn't kept: try again
    dzKind = kind; dz.src = BASE + (kind === 'cross' ? 'cross.html' : 'taper.html');
    var mine = dzReady = waitFor(function (w) { return w.location.href.indexOf(kind === 'cross' ? 'cross.html' : 'taper.html') > 0 && w.wlCapture && w.wlApply && w.WL_unrolled && w.__wlRod && w.document.readyState === 'complete'; }, 120000).then(function (w) {
      if (!w) { mine.__null = true; return w; } if (mine !== dzReady) return w; var ld = dzBox.querySelector('.rb-dz-load'); if (ld) ld.remove();
      [].forEach.call(w.document.querySelectorAll('label,span,div'), function (x) { if (x.id !== 'thrSize' && !x.children.length && x.textContent.trim() === 'Thread size') x.style.display = 'none'; });   // a label left behind by the thread size row
      var ts = w.document.getElementById('thrSize'); if (ts) { ts.style.display = 'none';   // no thread size choice: we pick it
        for (var up = ts.parentElement, k = 0; up && k < 3; up = up.parentElement, k++) if (up.textContent.replace(ts.textContent, '').trim() === 'Thread size') { up.style.display = 'none'; break; } }
      /* the cross wraps' Pattern Size slider stays (Brett wants it) */
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
    var tb = kind === 'taper' && cap.pattern === 'trim';   // the Trim Band wrap: only its trim band's colors (the wrap under it never shows)
    if (!tb && (!dragon || over)) (cap.stripes || []).forEach(function (x) { add(x.c, +x.t || 0); });
    if (cap.center && cap.center.on) add(cap.center.c);
    if (cap.inner && cap.inner.on) (cap.inner.stripes || []).forEach(function (x) { add(x.c); });
    if (cap.inner && cap.inner.on && cap.inner.fillOn && cap.inner.pattern !== 'chevron') (cap.inner.fill || []).forEach(function (x) { add(x.c); });   // filler colors count too
    if (cap.arms === 'cover') add(cap.fillC);
    var T = cap.trims; if (T && T.on !== false) { if (!T.noFill) add(T.c); (T.bands || []).concat(T.ends || []).forEach(function (x) { add(x.c); if (x.saw) add(x.c2); }); }   // main trim color only when it's on; a saw blade's second color counts
    return out;
  }
  function wrapIdFor(cap, kind) {
    var ax = +cap.axes || 2;
    if (kind === 'cross') return idByName(ax >= 4 ? '4 Axis Cross Wrap' : '2 Axis Cross Wrap');   // a snowflake is a 2 axis cross wrap
    if (cap.pattern === 'trim') return idByName('Trim Band');
    if (cap.pattern === 'dragon') return idByName(cap.dragon && cap.dragon.over && cap.dragon.over.on ? '2 Axis Wrap Over Dragon Scales' : 'Dragon Scale');
    if (ax >= 16) return idByName(cap.pattern === 'chevron' ? 'Chevron — 16 Axis' : '16 Axis Wrap');
    if (ax >= 8) return idByName(cap.pattern === 'chevron' ? 'Chevron — 8 Axis' : '8 Axis Wrap');
    return idByName((cap.pattern === 'chevron' ? 'Chevron' : 'Diamond') + ' — ' + (ax >= 4 ? 4 : 2) + ' Axis');
  }
  function nearestIdx(hex) {   // a WRAP_COLORS entry, only so the page counts the colors (never the +$10 UV metallics)
    var W = val('WRAP_COLORS') || [], h = parseInt(hex.slice(1), 16), r = h >> 16, g = h >> 8 & 255, b = h & 255, best = 0, bd = 1e12;
    W.forEach(function (c, i) { if (c.group === 'uv-metallic' || !/^#[0-9a-f]{6}$/i.test(c.hex)) return; var v = parseInt(c.hex.slice(1), 16), d = Math.pow(r - (v >> 16), 2) * .3 + Math.pow(g - (v >> 8 & 255), 2) * .59 + Math.pow(b - (v & 255), 2) * .11; if (d < bd) { bd = d; best = i; } });
    return best;
  }
  // Underwrap (+$20): a thread color under the wrap only. The designer's "Blank color" becomes it; the rod's blank keeps its own color.
  var UNDER_FEE = 25, under0 = null;
  function underBox(dd, iw) {
    var bc = dd.getElementById('blankC'); if (!bc || !iw || dd.getElementById('sfswUnder')) return;
    if (under0 == null) under0 = bc.value || '#101010';
    var lab = bc.closest('label'), box = dd.createElement('div'); box.id = 'sfswUnder';
    box.innerHTML = '<label class="chk"><input type="checkbox" id="underOn"> Underwrap <small style="color:var(--muted)">+$' + UNDER_FEE + ' · a thread color laid under the wrap (the blank keeps its color)</small></label><div class="sfswUrow"></div>';
    iw.parentNode.insertBefore(box, iw);
    if (lab) { [].slice.call(lab.childNodes).forEach(function (n) { if (n.nodeType === 3 && /Blank color/.test(n.textContent)) n.textContent = 'Underwrap color '; }); box.querySelector('.sfswUrow').appendChild(lab); }
    var cb = box.querySelector('#underOn');
    var put = function (hex) { bc.value = hex; bc.dispatchEvent(new Event('input', { bubbles: true })); bc.dispatchEvent(new Event('change', { bubbles: true })); };
    cb.addEventListener('change', function () { S.under.on = cb.checked; underSync(); put(cb.checked ? (S.under.c || threadHex(dw())('9460 Metallic Deep Blue') || '#2b38af') : under0); clearTimeout(readT); readT = setTimeout(readDesign, 120); });
    bc.addEventListener('input', function () { if (S.under.on && bc.value !== under0) S.under.c = bc.value; });
    underSync();
  }
  // Presets in the customizer: 5 ready-made color sets for the wrap's own pattern. A wrap can have its own 5
  // (CUSTOM_PRESETS['Diamond — 2 Axis'] = [...]); the rest use the 5 below. Each: name, trim color, thread lines (center first).
  var CUSTOM_PRESETS = {};
  var BASE_PRESETS = [   // five different looks: a classic, Brett's black/storm cloud/gold, a striped green, a redfish/copper, a black-out silver
    { name: 'Gulfstream & Gold', trim: '479 Gulfstream', stripes: [['9130 Metallic Gold', 1], ['479 Gulfstream', 4], ['807 White', 2], ['9130 Metallic Gold', 2], ['479 Gulfstream', 3]] },
    { name: 'Black, Storm Cloud & Gold', trim: '862 Twilight Black', exact: true, stripes: [['862 Twilight Black', 8], ['850 Storm Cloud', 1], ['862 Twilight Black', 2], ['850 Storm Cloud', 2], ['862 Twilight Black', 1], ['850 Storm Cloud', 3],
      ['9100 Metallic Yellow Gold', 3], ['850 Storm Cloud', 2], ['9100 Metallic Yellow Gold', 2], ['850 Storm Cloud', 1], ['9100 Metallic Yellow Gold', 3]] },
    { name: 'Green Stripes', open: 0.4, trim: '9520 Metallic Green', stripes: [['807 White', 3], ['9520 Metallic Green', 2], ['862 Twilight Black', 1], ['9520 Metallic Green', 2], ['862 Twilight Black', 1], ['513 Guacamole', 4], ['807 White', 1], ['513 Guacamole', 2]] },
    { name: 'Redfish & Copper', open: 0.4, trim: '319 Redfish', stripes: [['740 Copper', 1], ['862 Twilight Black', 2], ['319 Redfish', 5], ['740 Copper', 1], ['862 Twilight Black', 1], ['740 Copper', 1], ['319 Redfish', 2]] },
    { name: 'Black-Out Silver', open: 0.4, trim: '862 Twilight Black', stripes: [['862 Twilight Black', 3], ['9860 Metallic Silver', 1], ['862 Twilight Black', 1], ['9860 Metallic Silver', 1], ['841 Iron Ore', 4], ['9860 Metallic Silver', 2]] }];
  // Preset 1-5 (not the photo examples, so no one gets a wrap that's already on someone else's rod); the customizer opens on Preset 1
  // every Chevron Wrap (2 / 4 / 8 / 16 axis): Preset 1-3 are the Chevron 4 Axis examples (counts scaled to the axis count; example 3 has its chevron pattern between)
  (function () { var ex = (PRESET['Chevron — 4 Axis'] || {}).recs || [], L = [0, 1, 2].map(function (i) { var r = ex[i]; return r && r.stripes ? { trim: r.trim, stripes: r.stripes, inner: r.inner, chevTo: r.chevTo, exact: true, ax: 4 } : BASE_PRESETS[i]; }).concat([BASE_PRESETS[3], BASE_PRESETS[4]]);
    ['Chevron — 2 Axis', 'Chevron — 4 Axis', 'Chevron — 8 Axis', 'Chevron — 16 Axis'].forEach(function (n) { CUSTOM_PRESETS[n] = L; }); })();
  function presetsFor() {
    var w = wrapNamed(S.wrapId), L = (w && CUSTOM_PRESETS[w.name]) || BASE_PRESETS;
    return L.slice(0, 5).map(function (x, i) { return { name: 'Preset ' + (i + 1), trim: x.trim, stripes: x.stripes, exact: x.exact, open: x.open, inner: x.inner, ax: x.ax }; });
  }
  function presetBox(dd) {
    var tb = dd.getElementById('threadsBox'); if (!tb || dd.getElementById('sfswPresets')) return;
    var box = dd.createElement('div'); box.id = 'sfswPresets'; box.className = 'f'; box.style.cssText = 'margin:0 0 10px';
    box.innerHTML = '<label style="display:flex;align-items:center;gap:10px"><span>Presets</span><select id="sfswPreset" style="min-width:240px;background:#0f141b;color:inherit;border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:7px 10px;font:inherit"></select></label>';
    tb.parentNode.insertBefore(box, tb);
    var sel = box.querySelector('select');
    sel.addEventListener('change', function () {
      if (sel.value === 'scratch') return presetScratch();
      var pr = presetsFor()[+sel.value]; if (pr) presetApply(pr); });
    presetFill();
  }
  // a preset keeps its colors and their ratio; on diamonds the counts are scaled so the diamonds take up as much room as the open space between them
  var lastPreset = null, fitTok = 0;
  // a second, hidden designer just for measuring: the search for the right thread counts runs there, so the customer's
  // designer and the 3D rod only change once, to the final answer (no flicker while it searches)
  var mf = null, mfReady = null;
  function measFrame() {
    if (mfReady) return mfReady;
    mf = el('iframe'); mf.id = 'sfsw-meas'; mf.setAttribute('aria-hidden', 'true'); mf.tabIndex = -1;
    mf.style.cssText = 'position:fixed;left:-10000px;top:0;width:1000px;height:700px;border:0;visibility:hidden;pointer-events:none';
    mfReady = new Promise(function (res) { mf.addEventListener('load', function () { var n = 0, t = setInterval(function () { var fw = mf.contentWindow;
      if ((fw && fw.wlApply && fw.WL_unrolled) || ++n > 100) { clearInterval(t); res(fw && fw.wlApply ? fw : null); } }, 100); }); });
    mf.src = BASE + 'taper.html'; document.body.appendChild(mf); return mfReady;
  }
  // find the total thread count that leaves half the wrap open; mk(T) builds the design for a total of T
  var fitMemo = {};   // the same design on the same wrap again: no need to measure again
  async function fitHalf(mk, lo, hi, tok, target) {
    target = target || 0.5; var key = JSON.stringify(mk(1, true)) + '|' + lo + '|' + hi + '|' + target; if (fitMemo[key]) return fitMemo[key];
    var fw = await measFrame(), sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    if (!fw) return Math.round((lo + hi) / 2);
    while (hi - lo > 2) { if (tok !== fitTok) return null; var mid = Math.round((lo + hi) / 2), c = mk(mid, true); fw.wlApply(c); await sleep(0);
      if (openShare(fw, c) > target) lo = mid; else hi = mid; }
    if (tok !== fitTok) return null; return (fitMemo[key] = Math.round((lo + hi) / 2));
  }
  async function presetApply(pr, fresh) {
    lastPreset = pr; var tok = ++fitTok;
    var w = dw(); if (!w || !w.wlCapture) return; var hx = threadHex(w), pw = presetOf(S.wrapId);
    var base = pr.stripes.map(function (x) { return { c: hx(x[0]), t: x[1] }; }), sum = base.reduce(function (a, x) { return a + x.t; }, 0), keep = clean(w.wlCapture());
    presetClear(keep);
    if (fresh && pw) { keep.pattern = pw.p; keep.axes = pw.a; keep.nOverride = null; keep.chevTo = null; keep.center = { on: false, c: base[0].c, t: 1 };
      keep.inner = { on: false, pattern: 'diamond', place: 'center', auto: true, stripes: [] }; keep.unit = 'in'; keep.len = wrapLen().toFixed(2); }
    var mk = function (T, measuring) { var c = JSON.parse(JSON.stringify(keep)), f = T / sum; c.stripes = base.map(function (x, i) { return { c: x.c, t: Math.max(i ? 1 : 2, Math.round(x.t * f)) }; });   /* the center starts with at least 2 threads */
      if (c.trims) { c.trims.c = hx(pr.trim); c.trims.bands = []; c.trims.noFill = false; c.trims.ends = []; } if (c.pattern === 'chevron') c.chevTo = pr.chevTo || null;   /* the preset's chevron direction */ if (measuring) { c.arms = 'show'; if (c.inner) c.inner.on = false; }
      else if (pr.inner) { c.inner = recInner(pr, hx); c.inner.stripes = c.inner.stripes.map(function (x) { return { c: x.c, t: Math.max(1, Math.round(x.t * f)) }; }); }   // the preset's own pattern between
      return c; };
    var axK = pr.ax ? pr.ax / (+keep.axes || pr.ax) : 1;   // a preset made for another axis count: scale its counts
    var T = keep.pattern === 'diamond' && !pr.exact ? await fitHalf(mk, 4, 120, tok, pr.open) : sum * axK;
    if (T == null || tok !== fitTok) return;   // another preset was picked meanwhile
    w.wlApply(mk(T)); clearTimeout(readT); readT = setTimeout(readDesign, 20);
  }
  // Trim band presets (Trim Band wrap's customizer and the Trim Bands tab): Build From Scratch, then Preset 1-5; Preset 1 is the Trim Band example
  var TRIM_PRESETS = [null];   // Preset 1-3 = the Trim Band examples 1-3 (Preset 1 is filled in where it's used), then Presets 4-5
  (function () { var R = (PRESET['Trim Band'] || {}).recs || []; [1, 2].forEach(function (i) { if (R[i] && R[i].tb) TRIM_PRESETS.push(R[i].tb); }); })();
  TRIM_PRESETS.push(
    { c: '862 Twilight Black', bands: [['9520 Metallic Green', 4], ['807 White', 2], ['513 Guacamole', 3], ['', 3, 'fade']], ends: [['9520 Metallic Green', 4]] },
    { c: '484 Deep Sea', bands: [['807 White', 2], ['484 Deep Sea', 3], ['807 White', 1, 'mid', '484 Deep Sea'], ['9860 Metallic Silver', 2]], ends: [['807 White', 3]] });
  function trimPresetBox(dd, fw, after) {
    var tw = dd.getElementById('trimWrap'); if (!tw || dd.getElementById('sfswTrimPreset')) return;
    var box = dd.createElement('div'); box.className = 'sfswTP'; box.style.cssText = 'margin:4px 0 12px';
    box.innerHTML = '<label style="display:flex;align-items:center;gap:10px"><span style="font-size:15px">Presets</span><select id="sfswTrimPreset" style="min-width:240px;background:#0f141b;color:inherit;border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:7px 10px;font:inherit">'
      + '<option value="scratch">Build From Scratch</option>' + [1, 2, 3, 4, 5].map(function (i) { return '<option value="' + (i - 1) + '">Preset ' + i + '</option>'; }).join('') + '</select></label>';
    tw.parentNode.insertBefore(box, tw);
    var sel = box.querySelector('select');
    trimPresetSync(dd, fw);
    sel.addEventListener('change', function () { try {
      var c = fw.wlCapture(), hx = threadHex(fw), mm = (c.trims && c.trims.mm) || 20, ex = ((PRESET['Trim Band'] || {}).recs || [])[0];
      if (sel.value === 'scratch') c.trims = { on: true, mm: mm, c: (c.trims && c.trims.c) || hx('862 Twilight Black'), bands: [], ends: [] };
      else { var T = +sel.value === 0 && ex ? ex.tb : TRIM_PRESETS[+sel.value]; c.trims = tbOf({ mm: S.wrapId === 'trim-band' ? 50.8 : mm, c: T.c, bands: T.bands, ends: T.ends, noFill: T.noFill }, hx); }
      fw.wlApply(c); if (after) after(); } catch (e) {} });
  }
  function trimPresetSync(dd, fw) {   // show Preset 1 for the Trim Band example, Build From Scratch for plain trims
    try { var sel = dd.getElementById('sfswTrimPreset'); if (!sel) return; var t0 = fw.wlCapture().trims || {};
      sel.value = S.wrapId === 'trim-band' ? String(Math.min(recPick['trim-band'] || 0, 2))   // Trim Band Example 1-3 = Preset 1-3
        : S.wrapId === 'trim-band' || (t0.bands || []).length || (t0.ends || []).length ? (sel.value === 'scratch' ? '0' : sel.value) : 'scratch'; } catch (e) {}
  }
  function presetClear(c) {   // a new preset starts clean: Underwrap and the pattern between go off
    if (c.inner) c.inner.on = false;
    if (S.under && S.under.on) { S.under.on = false; if (under0) c.blankC = under0; setTimeout(underSync, 0); }
  }
  function presetScratch() {   // Build From Scratch: just a center line to build on
    lastPreset = 'scratch'; fitTok++; var w = dw(); if (!w || !w.wlCapture) return;
    var c = clean(w.wlCapture()), hx = threadHex(w); presetClear(c); c.stripes = [{ c: hx('807 White'), t: 2 }];   /* 2 white threads in the center */
    c.center = { on: false, c: c.stripes[0].c, t: 1 }; if (c.inner) c.inner.on = false; if (c.trims) { c.trims.bands = []; c.trims.noFill = false; c.trims.ends = []; }
    w.wlApply(c); clearTimeout(readT); readT = setTimeout(readDesign, 150);
  }
  function openShare(w, c) {   // how much of the wrap (between the trims) still looks like bare blank
    var r = w.WL_unrolled(900, 240); if (!r) return 0.5;
    var B = [1, 3, 5].map(function (i) { return parseInt((c.blankC || '#101010').slice(i, i + 2), 16); }), x = r.canvas.getContext('2d'), W = r.canvas.width, H = r.canvas.height;
    var t0 = Math.round((r.trimMM || 0) / (r.lengthMM || 1) * W) + 3, d = x.getImageData(t0, 0, Math.max(1, W - 2 * t0), H).data, bl = 0, n = 0;
    for (var i = 0; i < d.length; i += 16) { n++; if (d[i + 3] < 10 || Math.abs(d[i] - B[0]) + Math.abs(d[i + 1] - B[1]) + Math.abs(d[i + 2] - B[2]) < 80) bl++; }   // thread close to the blank's color (black on black) reads as open, so it counts as open
    return bl / n;
  }


  function presetPick(v) { try { var sel = dz.contentDocument.getElementById('sfswPreset'); if (sel) sel.value = String(v); } catch (e) {} }
  function presetFill() {   // the list for the picked wrap: Build From Scratch, then Preset 1-5
    try { var sel = dz.contentDocument.getElementById('sfswPreset'); if (!sel) return;
      sel.innerHTML = '<option value="scratch">Build From Scratch</option>' + presetsFor().map(function (p, i) { return '<option value="' + i + '">' + p.name + '</option>'; }).join(''); } catch (e) {}
  }
  // Axis lines in the customizer: picking another axis count switches the wrap in the list to that wrap (Diamond 2 → Diamond 4, …),
  // keeps the customer's colors, and scales the thread counts by old/new axes so the wrap keeps the same look and stays even
  function axisWrap(p, a) { var hit = null; WRAPS.forEach(function (w) { var pr = PRESET[w.name]; if (!hit && pr && pr.p === p && pr.a === a && !/Decorative|Dragon/i.test(w.name)) hit = w.id; }); return hit; }
  function axisSync() {
    try { var dd = dz.contentDocument, m = dd.querySelector('.dsrow .mirrow'), seg = dd.querySelector('[data-mirror="axes"]'); if (!m || !seg) return;
      var c = dw().wlCapture(), p = c.pattern, drag = p === 'dragon' && !(c.dragon && c.dragon.over && c.dragon.over.on), ok = (p === 'diamond' || p === 'chevron' || drag) && S.wrapId !== 'trim-band';
      m.style.setProperty('display', ok ? 'flex' : 'none', 'important');
      [].forEach.call(seg.querySelectorAll('button'), function (b) { var show = ok && (drag ? DRAG_AX[+b.dataset.v] != null : axisWrap(p, +b.dataset.v)); if (show && +b.dataset.v === 32) b.style.setProperty('display', 'block', 'important'); else b.style.setProperty('display', show ? '' : 'none'); if (show) b.hidden = false; });   /* 32 is hidden for regular wraps; dragon scales use it */
      [].forEach.call(dd.querySelectorAll('#angle button'), function (b) { var off = drag && +c.axes === 32 && b.dataset.v !== '45'; b.disabled = off; b.style.opacity = off ? '.35' : ''; b.title = off ? '32 axis dragon scales come in 45° only' : ''; });
      var fee = dd.getElementById('sfswAxFee'), cw = drag ? { adder: DRAG_AX[+c.axes] || 0 } : (wrapById(S.wrapId) || {}), sb = seg.querySelector('button[aria-pressed="true"]');   // the upcharge, right under the axis count picked
      if (!fee) { fee = dd.createElement('small'); fee.id = 'sfswAxFee'; fee.style.cssText = 'position:absolute;font-size:12px;font-weight:600;color:#d4a73c;white-space:nowrap;transform:translateX(-50%);pointer-events:none'; m.style.position = 'relative'; m.appendChild(fee); }
      if (ok && sb && cw.adder) { fee.textContent = '+$' + cw.adder; fee.style.display = ''; var rb = sb.getBoundingClientRect(), rm = m.getBoundingClientRect(); fee.style.left = (rb.left - rm.left + rb.width / 2) + 'px'; fee.style.top = (rb.bottom - rm.top + 3) + 'px'; m.style.marginBottom = '14px'; }
      else { fee.style.display = 'none'; m.style.marginBottom = ''; }
    } catch (e) {}
  }
  // Dragon Scale: 8 axis included, 16 +$25, 32 +$50 (32 only at 45°)
  var DRAG_AX = { 8: 0, 16: 25, 32: 50 };
  function setDragonAx(a) {
    S.dragonAx = a; var w = dw(); if (!w || !w.wlCapture) return;
    try { var c = w.wlCapture(); if (c.pattern !== 'dragon') return; c.axes = a; if (a === 32) c.angle = '45'; w.wlApply(c); } catch (e) {}
    clearTimeout(readT); readT = setTimeout(readDesign, 30); setTimeout(exButtons, 60);
  }
  function dragonFee() { var d = designOn(), c = d && d.setup; return c && c.pattern === 'dragon' && !(c.dragon && c.dragon.over && c.dragon.over.on) ? (DRAG_AX[+c.axes] || 0) : 0; }
  // Dragon Scale: the metallic overwrap is picked from all the Metallic and Ultra-UV Metallic threads, shown right here (no color board);
  // a plain Dragon Scale has no "wrap over it" (that's the 2 Axis Wrap Over Dragon Scales), and presets don't apply to dragon scales
  function dragonSync() {
    try { var dd = dz.contentDocument, w = dz.contentWindow, box = dd.getElementById('dragonBox'); if (!box) return;
      var c = w.wlCapture(), drag = c.pattern === 'dragon';
      var ov = dd.getElementById('ovOn'), ovl = ov && ov.closest('label'); if (ovl) ovl.style.display = S.wrapId === 'dragon' ? 'none' : '';
      var pb = dd.getElementById('sfswPresets'); if (pb) pb.style.display = drag ? 'none' : '';
      if (!drag) return;
      var sw = dd.getElementById('dgSw'), mi = dd.getElementById('dgMetal'), ml = mi && mi.closest('label'); if (sw) sw.style.display = 'none'; if (ml) ml.style.display = 'none';
      var mine = dd.getElementById('sfswDgMet');
      if (!mine) { mine = dd.createElement('div'); mine.id = 'sfswDgMet'; mine.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:4px;flex:1 1 100%';
        var G = (w.WL_THREADS.groups([]) || []).filter(function (g) { return /^Metallic ·|^Ultra-UV/.test(g[0]); });
        mine.innerHTML = '<div style="font-size:13px;color:var(--muted)">Metallic overwrap: <b id="sfswDgName" style="color:var(--fg)"></b></div>' + G.map(function (g) {
          return '<div><div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:2px 0 6px">' + g[0] + '</div><div style="display:flex;flex-wrap:wrap;gap:7px">' + g[1].map(function (x) {
            return '<button type="button" data-h="' + x[1] + '" title="' + x[0] + '" aria-label="' + x[0] + '" style="width:30px;height:30px;border-radius:50%;cursor:pointer;border:2px solid rgba(255,255,255,.15);background:radial-gradient(circle at 32% 30%,#fff 0,' + x[1] + ' 38%,' + x[1] + ' 62%,rgba(0,0,0,.55) 100%)"></button>'; }).join('') + '</div></div>'; }).join('');
        sw.parentNode.insertBefore(mine, sw.nextSibling);
        mine.addEventListener('click', function (e) { var b = e.target.closest('button[data-h]'); if (!b) return; try { var c2 = w.wlCapture(); c2.dragon = c2.dragon || {}; c2.dragon.metal = b.dataset.h; w.wlApply(c2); } catch (x) {}
          clearTimeout(readT); readT = setTimeout(readDesign, 30); }); }
      var cur = String((c.dragon && c.dragon.metal) || mi.value || '').toLowerCase();
      [].forEach.call(mine.querySelectorAll('button[data-h]'), function (b) { var on = b.dataset.h.toLowerCase() === cur; b.style.borderColor = on ? '#d4a73c' : 'rgba(255,255,255,.15)'; b.style.boxShadow = on ? '0 0 0 2px #d4a73c' : 'none'; });
      var nm = dd.getElementById('sfswDgName'); if (nm) { try { nm.textContent = w.WL_THREADS.name(cur) || ''; } catch (x) {} }
    } catch (e) {}
  }
  var axBase = null;   // the design before the axis count was changed (switching 2 → 16 → 2 comes back to it exactly)
  function axisHook(dd) {
    var seg = dd.querySelector('[data-mirror="axes"]'); if (!seg || seg.__sfsw) return; seg.__sfsw = true;
    seg.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var w = dw(); if (!w || !w.wlCapture) return;
      var c0 = w.wlCapture(), a0 = +c0.axes, a1 = +b.dataset.v;
      if (c0.pattern === 'dragon') { if (DRAG_AX[a1] == null) { e.preventDefault(); e.stopImmediatePropagation(); return; } setDragonAx(a1); e.preventDefault(); e.stopImmediatePropagation(); return; }   // dragon scales: 8 / 16 / 32 on the same wrap
      var id = axisWrap(c0.pattern, a1); if (!id || a1 === a0) { if (!id) { e.preventDefault(); e.stopImmediatePropagation(); } return; }
      var cnt = function (c) { return JSON.stringify([c.stripes, c.inner && c.inner.stripes, c.inner && c.inner.fill]); };
      if (!axBase || axBase.last !== cnt(c0)) axBase = { axes: a0, c: JSON.parse(JSON.stringify(c0)) };   // counts were changed by hand since the last axis switch: scale from these
      setTimeout(function () { try {
        var B = axBase.c, c = w.wlCapture(), k = axBase.axes / a1, sc = function (L) { return (L || []).map(function (x, i) { return { c: x.c, t: Math.max(1, Math.round(x.t * k)) }; }); };
        c.axes = a1; c.stripes = sc(B.stripes); if (c.inner && B.inner) { c.inner.stripes = sc(B.inner.stripes); c.inner.fill = sc(B.inner.fill); }
        w.wlApply(c); axBase.last = cnt(w.wlCapture());
        S.wrapId = id; S.wrapUserSelected = true; modeWrap = id; call('renderWraps'); exButtons(); updateAll();
        clearTimeout(readT); readT = setTimeout(readDesign, 150);
      } catch (x) {} }, 60);
    }, true);
    axisSync();
  }
  // Underwrap / Add a pattern between / Filler over it: shown as toggle buttons like Color filler, with the note to the right
  function tgSkin(dd) {
    var ref = dd.getElementById('armsBtn'); if (!ref) return; var cs = dd.defaultView.getComputedStyle(ref), seg = dd.defaultView.getComputedStyle(ref.parentNode);
    ['underOn', 'innerOn', 'innerFillOn', 'btOn'].forEach(function (id) {
      if (id === 'innerOn' || id === 'btOn') { var iI = dd.getElementById(id), sm = iI && iI.closest('label.chk') && iI.closest('label.chk').querySelector('small'); if (sm && !/\+\$/.test(sm.textContent)) sm.textContent = (id === 'btOn' ? '+$100' : '+$50') + ' · ' + sm.textContent.replace(/^\(|\)$/g, '') + (id === 'innerOn' ? ' · up to 2 new colors included' : ''); }
      var inp = dd.getElementById(id), lab = inp && inp.closest('label.chk'); if (!lab) return;
      var btn = lab.querySelector('.sfswTgB');
      if (!btn) {
        var title = '', note = null;
        [].slice.call(lab.childNodes).forEach(function (n) { if (n === inp) return; if (n.nodeType === 3) { title += n.textContent; n.remove(); } else if (n.tagName === 'SMALL') note = n; });
        inp.style.cssText = 'position:absolute;opacity:0;width:1px;height:1px;pointer-events:none';
        var wrap = dd.createElement('span'); wrap.className = 'sfswTg';
        wrap.style.cssText = 'display:inline-flex;border:' + seg.border + ';border-radius:' + seg.borderRadius + ';background:' + seg.backgroundColor + ';overflow:hidden;flex:0 0 auto';
        btn = dd.createElement('span'); btn.className = 'sfswTgB'; btn.textContent = title.trim();
        btn.style.cssText = 'font:' + cs.font + ';padding:' + cs.padding + ';cursor:pointer;white-space:nowrap';
        var fee = (note && /^\s*\+\$\d+/.exec(note.textContent)) ? /\+\$\d+/.exec(note.textContent)[0] : '';
        if (fee) { btn.insertAdjacentHTML('beforeend', ' <small style="color:#d4a73c;font-weight:600">' + fee + '</small>'); note.textContent = note.textContent.replace(/^\s*\+\$\d+\s*·\s*/, ''); }
        wrap.appendChild(btn); lab.insertBefore(wrap, lab.firstChild);
        lab.style.gap = '12px'; lab.style.position = 'relative'; lab.style.margin = '6px 0';
        if (note) { note.style.fontSize = '13px'; lab.appendChild(note); }
        inp.addEventListener('change', function () { tgPaint(inp, btn); });
      }
      tgPaint(inp, btn);
    });
  }
  function fillNote(dd) { var ab = dd.getElementById('armsBtn'); if (!ab || dd.getElementById('sfswFillNote')) return; var row = ab.closest('.seg'); if (!row) return;
    row.insertAdjacentHTML('afterend', '<small id="sfswFillNote" style="font-size:13px;color:var(--muted)">' + (dd.getElementById('btOn') ? 'fills the open space between the cross wraps with one thread color · included with a pattern between' : 'fills the open space inside the diamonds with one thread color') + '</small>'); }
  // the color bubbles: one per different color in the design; past the included ones each shows its +$10 in gold
  function bubFill(dd, bub) { var d = designOn(), cs = (d && d.colors) || [], inc = 4 + innerFree(), ex = Math.max(0, cs.length - inc), nm = function (c) { return String(c.name || '').replace(/^\d+[A-Z]?\s+/, ''); };
    var fe = cs.map(function (c, i) { return (i >= inc ? 10 : 0) + (c.uv || c.twist ? 10 : 0); }), tot = fe.reduce(function (a, b) { return a + b; }, 0);   // past the included: +$10; Ultra-UV / Metallic Twist: +$10 more
    var h = cs.length ? '<div class="sfswBubH">Your colors <span>' + cs.length + ' · ' + Math.min(cs.length, inc) + ' included</span>' + (tot ? ' <b>+$' + tot + '</b>' : '') + '</div><div class="sfswBubs">'
      + cs.map(function (c, i) { var f = fe[i]; return '<span class="sfswB' + (f ? ' x' : '') + '" title="' + nm(c) + '"><i style="background:' + c.hex + '"></i>' + (f ? '<em>+$' + f + '</em>' : '') + '</span>'; }).join('') + '</div>' : '';
    if (bub.innerHTML !== h) bub.innerHTML = h;
    if (!dd.getElementById('sfswBubCss')) { var css = dd.createElement('style'); css.id = 'sfswBubCss'; css.textContent = '#sfswBub,.sfswBubT{margin:4px 0 12px}.sfswBubH{font-size:13px;color:var(--muted);margin-bottom:6px}.sfswBubH b{color:#e0b13a;margin-left:4px}.sfswBubs{display:flex;flex-wrap:wrap;gap:8px}.sfswB{display:inline-flex;flex-direction:column;align-items:center;gap:3px}.sfswB i{width:28px;height:28px;border-radius:50%;border:2px solid rgba(255,255,255,.25);display:block}.sfswB.x i{border-color:#e0b13a;box-shadow:0 0 0 2px rgba(224,177,58,.35)}.sfswB em{font:700 11px var(--body);font-style:normal;color:#e0b13a}'; dd.head.appendChild(css); } }
  // between the thread colors and Color filler: what the extra colors add (4 different colors included, +$10 each after)
  function extraNote() {
    try { var dd = dz.contentDocument, ob = dd.getElementById('openBox');
      var fe = dd.querySelector('#armsBtn .sfswFee'); if (fe) { var ff = fillFee(); fe.textContent = ff ? '+$' + ff : 'Included'; }   // the filler's price (included with a cross wrap's pattern between)
      if (!ob) { if (window.__sfswTbPaintNow) window.__sfswTbPaintNow(); var st0 = dd.getElementById('stripes'), bx0 = st0 && st0.closest('.f'), bb0 = dd.getElementById('sfswBub'); if (bx0) { if (!bb0) { bb0 = dd.createElement('div'); bb0.id = 'sfswBub'; bx0.parentNode.insertBefore(bb0, bx0); } bubFill(dd, bb0); } return; }
      var n = dd.getElementById('sfswExtra');
      if (!n) { n = dd.createElement('div'); n.id = 'sfswExtra'; n.style.cssText = 'font-size:13px;color:var(--muted);margin:2px 0 10px'; ob.parentNode.insertBefore(n, ob); }
      var total = window.SFSW_designColors ? SFSW_designColors() : null, extra = total == null ? 0 : Math.max(0, total - 4);
      n.innerHTML = extra ? '<b style="color:#d4a73c">+$' + extra * 10 + '</b> for ' + extra + ' extra color' + (extra > 1 ? 's' : '') + ' <span>(' + total + ' different colors · 4 included · +$10 each extra)</span>' : '';
      n.style.display = extra ? '' : 'none';
      // above the thread colors: a bubble for each different color in the design; past the included ones each shows its +$10 in gold
      var st = dd.getElementById('stripes'), box = st && st.closest('.f'), bub = dd.getElementById('sfswBub');
      if (box) { if (!bub) { bub = dd.createElement('div'); bub.id = 'sfswBub'; box.parentNode.insertBefore(bub, box); } bubFill(dd, bub); }
      if (window.__sfswTbPaintNow) window.__sfswTbPaintNow();
    } catch (e) {}
  }
  function tgPaint(inp, btn) { btn.setAttribute('aria-pressed', String(inp.checked)); btn.style.background = inp.checked ? 'var(--ink)' : 'none'; btn.style.color = inp.checked ? '#fff' : 'var(--muted)'; }
  function underOk() { var d = S.customDesign, st = d && d.setup; return S.wrapId !== 'trim-band' && !(st && st.pattern === 'dragon') && S.wrapId !== 'abalone'; }
  function underSync() {   // no Underwrap on the dragon scale wraps (they have their metallic) or the Trim Band
    try { var dd = dz.contentDocument, box = dd.getElementById('sfswUnder'), cb = dd.getElementById('underOn'), bc = dd.getElementById('blankC'); if (!box) return;
      var ok = underOk(); box.style.display = ok ? '' : 'none'; if (!ok && S.under.on) { S.under.on = false; if (bc && under0) { bc.value = under0; bc.dispatchEvent(new Event('input', { bubbles: true })); } }
      cb.checked = S.under.on; var tb = box.querySelector('.sfswTgB'); if (tb) tgPaint(cb, tb); var row = box.querySelector('.sfswUrow'); if (row) row.style.display = S.under.on ? '' : 'none'; } catch (e) {}
  }
  function underOn() { return !!(S.under.on && S.wrapMode === 'build' && designOn() && underOk() && S.under.c); }
  window.SFSW_underwrap = underOn;
  var thumbT = null;
  function readDesign() {
    dzBusy = false; underSync(); axisSync(); dragonSync();
    var w = dw(); if (!w || !w.wlCapture || !presetOf(S.wrapId) || S.wrapMode === 'random') return;
    var cap; try { cap = clean(w.wlCapture()); } catch (e) { return; }
    var kind = dzKind, cols = colorsOf(cap, kind), name = function (h) { try { return (w.WL_THREADS && (w.WL_THREADS.fullName || w.WL_THREADS.name)(h)) || h; } catch (e) { return h; } };
    var MET = {}, UV = {}; try { w.WL_THREADS.BRANDS.sfsw.metallic.forEach(function (h) { MET[h.toLowerCase()] = 1; }); w.WL_THREADS.BRANDS.fuji.metallic.forEach(function (h) { UV[h.toLowerCase()] = 1; }); } catch (e) {}
    var thumb = (S.customDesign && S.customDesign.thumb) || '';   // the thumbnail (cart / summary) is redrawn just after, out of the way of the 3D rod
    clearTimeout(thumbT); thumbT = setTimeout(function () { try { var u = w.WL_unrolled(900, 220); if (u && u.canvas && S.customDesign) { var c = document.createElement('canvas'); c.width = 640; c.height = Math.round(640 * (u.canvas.height / 2) / u.canvas.width); c.getContext('2d').drawImage(u.canvas, 0, 0, u.canvas.width, u.canvas.height / 2, 0, 0, c.width, c.height); S.customDesign.thumb = c.toDataURL('image/jpeg', .8); } } catch (e) {} }, 900);
    var over = cap.dragon && cap.dragon.over && cap.dragon.over.on;
    var pat = kind === 'cross' ? (cap.pat || 'Cross wrap') : cap.pattern === 'dragon' ? (over ? (cap.dragon.over.pattern === 'diamond' ? 'Diamond' : 'Chevron') + ' over dragon scales' : 'Dragon scale') : cap.pattern === 'trim' ? 'Trim band' : cap.pattern === 'chevron' ? 'Chevron' : 'Diamond';
    var ax = kind === 'taper' && cap.pattern === 'dragon' ? (over ? +cap.dragon.over.axes || 2 : +cap.axes || 8) : +cap.axes || 2;
    S.customDesign = { sfsw: kind, kind: kind === 'cross' ? 'Cross wrap' : 'Wrap Designer', pattern: pat, axes: ax, angle: cap.angle && kind !== 'cross' ? cap.angle + '°' : '', size: '', blank: cap.blankC || '',
      colors: cols.map(function (c) { var uv = !!UV[String(c.hex).toLowerCase()], tw = false; try { tw = !!(w.WL_TWIST && w.WL_TWIST.has(c.hex)); } catch (e) {} return { name: name(c.hex) + (uv ? ' (Ultra-UV)' : ''), hex: c.hex, threads: c.threads, metallic: !!MET[String(c.hex).toLowerCase()], uv: uv, twist: tw }; }), thumb: thumb, setup: cap,
      summary: cap.pattern === 'trim' && kind !== 'cross' ? 'Trim band' : (kind === 'cross' ? pat + ' cross wrap' : pat) + ' · ' + ax + ' axis' + (cap.angle && kind !== 'cross' ? ' · ' + cap.angle + '°' : '') };
    if (cols.length) { S.mainIdx = nearestIdx(cols[0].hex); S.supportIdxs = cols.slice(1).map(function (c) { return nearestIdx(c.hex); }); }
    var id = wrapIdFor(cap, kind) || S.wrapId;
    if (id !== S.wrapId && !(dzHold && Date.now() - dzHold < 10000)) { S.wrapId = id; S.wrapPhotoIdx = 0; }
    S.wrapUserSelected = true;
    call('renderWraps'); updateAll(); extraNote();
  }
  // a preset into the designer: its pattern and axis lines, keeping the customer's colors and the wrap's size on this blank
  var applyN = 0;
  var designCols = function () { return S.customDesign && S.customDesign.colors && S.customDesign.colors.length ? S.customDesign.colors.map(function (c) { return c.hex; }) : null; };
  function tbOf(T, hx) { var it = function (x) { var o = { c: x[0] ? hx(x[0]) : '', t: x[1] }; if (x[2] === 'fade') o.fade = true; else if (x[2]) { o.saw = x[2]; o.c2 = hx(x[3]); } return o; };
    return { on: true, noFill: !!T.noFill, mm: T.mm, c: hx(T.c), bands: T.bands.map(it), ends: (T.ends || []).map(it) }; }
  function threadHex(w) { var m = {}; try { w.WL_THREADS.BRANDS.sfsw.groups.forEach(function (g) { g[1].forEach(function (x) { m[x[0]] = x[1]; }); }); } catch (e) {}
    return function (n) { return m[n] || '#1e1617'; }; }
  var recPick = {}, dzHold = 0;   // which photo design each wrap is on
  function recOf(pr, id) { var r = pr && pr.recs ? pr.recs[Math.min(recPick[id] || 0, pr.recs.length - 1)] : null; return r && (r.stripes || r.pat) ? r : null; }   // a photo-only example has no recipe
  function recInner(R, hx) { var I = R && R.inner; if (!I) return null;   // an example's pattern between
    return { on: true, pattern: I.pattern || 'diamond', place: I.place || 'center', chevTo: I.chevTo || null, auto: false, touched: true, stripes: I.stripes.map(function (x) { return { c: hx(x[0]), t: x[1] }; }), fillOn: false, fill: [] }; }
  // Customize / Builder's Choice open right under the picked wrap: the list is laid out by order (moving the designer would reload it)
  function placeModes(card) {
    if (!modeEl || !optList) return; var par = optList.parentNode; if (modeEl.parentNode !== par) return;
    par.classList.add('rb-wflow'); optList.classList.add('rb-wflat');
    var k = 0, after = null;
    [].forEach.call(par.children, function (c) {
      if (c === optList) { [].forEach.call(optList.children, function (x) { x.style.order = (k += 2); if (x === card) after = k; }); return; }
      if (c === modeEl) return; c.style.order = (k += 2);
    });
    modeEl.style.order = after != null ? after + 1 : k + 1;
  }
  function renderModes() {
    if (!modeEl) return; var id = S.wrapId, pr = presetOf(id), w = wrapNamed(id), ph = wrapPhotos(w), recs = (pr && pr.recs) || [], m = S.wrapMode;
    modeEl.style.display = pr ? '' : 'none';
    exButtons();
    if (lenBox && dzBox && !lenBox.closest('.rb-exs')) {   // Builder's Choice has no designer: the wrap length sits above its color slots
      if (m === 'random' && rndBar) { if (lenBox.nextSibling !== rndBar) rndBar.parentNode.insertBefore(lenBox, rndBar); lenBox.classList.add('rb-len-bc'); renderLen(); }
      else if (lenBox.parentNode !== dzBox) { lenBox.classList.remove('rb-len-bc'); dzBox.insertBefore(lenBox, dzBox.firstChild); } }
    [].forEach.call(modeEl.querySelectorAll('.rb-mode'), function (b) { b.classList.toggle('selected', b.dataset.m === m); });
    if (dzBox) dzBox.classList.toggle('rb-dz-off', m !== 'build');
    if (colorSec) colorSec.style.display = 'none'; if (rndPal) rndPal.style.display = m === 'random' ? '' : 'none'; if (rndBar) rndBar.style.display = m === 'random' ? '' : 'none'; modeEl.classList.toggle('rnd', m === 'random'); updTop();
  }
  // what floats under the 3D rod on the Wrap step: the example's photo, and in Random the color slots
  function updTop() {
    if (typeof top === 'undefined' || !top || !STEPS[cur]) return; var onWrap = STEPS[cur].view === 'wrap', rnd = onWrap && S.wrapMode === 'random' && !!modeEl && modeEl.style.display !== 'none';
    if (wphoto && wphoto.parentNode !== top) top.insertBefore(wphoto, approx);
    top.classList.toggle('rb-wtop', onWrap && !!wphoto && !wphoto.hidden && !rnd && S.wrapMode !== 'build');   // no wrap photo while customizing
    if (rnd) renderRandom();
  }
  // customers see color names without thread numbers (Brett's order keeps them)
  function shown(n) { return String(n || '').replace(/^\d+[A-Z]?\s+/, ''); }
  function lumOf(h) { h = String(h || '').replace('#', ''); return .299 * parseInt(h.slice(0, 2), 16) + .587 * parseInt(h.slice(2, 4), 16) + .114 * parseInt(h.slice(4, 6), 16); }
  // Random: tap a slot in the floating bar (Main, Supporting 1, 2 …), then tap colors below to fill it
  var rndBar, rndPal, rndSlot = 'main';
  // Builder's Choice on the 2 Axis Wrap Over Dragon Scales: a metallic for the scales, then the 4 included colors for the wrap over them
  function bcDragon() { return S.wrapId === '2axis-dragon'; }
  function bcScaleIdx() { var W = val('WRAP_COLORS') || []; if (!(W[S.bcScale] && W[S.bcScale].metallic)) { var k = -1; W.forEach(function (c, i) { if (k < 0 && c.metallic && c.group !== 'uv-metallic' && /Silver/.test(c.name)) k = i; }); if (k < 0) W.forEach(function (c, i) { if (k < 0 && c.metallic) k = i; }); S.bcScale = k; } return S.bcScale; }
  function bcScaleFee() { if (!bcDragon() || S.wrapMode !== 'random') return 0; var W = val('WRAP_COLORS') || [], c = W[bcScaleIdx()]; return c && c.group === 'uv-metallic' ? 10 : 0; }
  function renderRandom() {
    var W = val('WRAP_COLORS') || []; if (!rndBar || !W.length) return; var sup = S.supportIdxs || (S.supportIdxs = []), inc = 3, fee = 10;
    var rn = document.querySelector('.rb-rnd-note'); if (rn) rn.textContent = bcDragon() ? 'Builder\u2019s Choice: Choose a metallic for the dragon scales, then a main and supporting colors for the wrap over them, and we will do a unique design of our choice. The scales\u2019 metallic plus 4 colors for the wrap over included · +$10 each extra color.'
      : 'Builder\u2019s Choice: Choose a main color and supporting colors, and we will do a unique design of our choice. 1 Main and 3 supporting colors included (4 colors) · +$10 each extra color.';
    if (bcDragon() && rndBar.__w !== S.wrapId) rndSlot = 'scale';   // the 2 Axis Wrap Over opens on the scales' metallic
    rndBar.__w = S.wrapId;
    if (rndSlot === 'scale' ? !bcDragon() : (rndSlot !== 'main' && !(rndSlot < sup.length))) rndSlot = bcDragon() ? 'scale' : 'main';
    var slot = function (k, i, label) { var c = W[i] || {}, on = rndSlot === k;   /* (k: 'scale', 'main' or a supporting index) */
      return '<button type="button" class="rb-rs' + (on ? ' on' : '') + '" data-k="' + k + '"><i style="background:' + (c.hex || '#333') + '"></i><span><small>' + label + '</small>' + (shown(c.name) || '—') + '</span>' +
        (k !== 'main' && k !== 'scale' ? '<b data-x="' + k + '" title="Remove">×</b>' : '') + '</button>'; };
    rndBar.innerHTML = (bcDragon() ? slot('scale', bcScaleIdx(), 'Scales · metallic') : '') + slot('main', S.mainIdx, bcDragon() ? 'Wrap over · main' : 'Main') + sup.map(function (i, k) { return slot(k, i, 'Supporting ' + (k + 1) + (k >= inc ? ' · +$' + fee : '')); }).join('') +
      '<button type="button" class="rb-rs add">+ Add supporting color' + (sup.length >= inc ? ' <small>+$' + fee + '</small>' : '') + '</button>' +
      '<span class="rb-rs-tip">Tap a slot, then tap a color below</span>';
    [].forEach.call(rndBar.querySelectorAll('.rb-rs'), function (b) { b.onclick = function (e) {
      var x = e.target.closest('[data-x]'); if (x) { sup.splice(+x.dataset.x, 1); rndSlot = 'main'; call('renderSupportingRows'); updateAll(); return; }
      if (b.classList.contains('add')) { sup.push(S.mainIdx === 1 ? 0 : 1); rndSlot = sup.length - 1; call('renderSupportingRows'); updateAll(); return; }
      rndSlot = b.dataset.k === 'main' || b.dataset.k === 'scale' ? b.dataset.k : +b.dataset.k; renderRandom(); }; });
    var cur2 = rndSlot === 'scale' ? bcScaleIdx() : rndSlot === 'main' ? S.mainIdx : sup[rndSlot], groups = [['', 'Colors'], ['metallic', 'Metallic'], ['uv-metallic', 'Ultra-UV Metallic · +$10']];
    // the thread colors in the designer's own groups and order (Black & White, Greys, Blues ... each lightest to darkest); the metallics after
    var TT = null, dgs = null; try { TT = (dw() || {}).WL_THREADS; dgs = TT && TT.groups([]); } catch (e) { dgs = null; }
    if (dgs && dgs.length) groups = dgs.map(function (g) { var met = /metallic/i.test(g[0]), uv = /ultra-uv/i.test(g[0]);
        return [g[1].map(function (x) { var hx = String(x[1]).toLowerCase(), k = -1;
          W.forEach(function (c, i) { if (k < 0 && !!c.metallic === met && (!met || (c.group === 'uv-metallic') === uv) && String(c.hex).toLowerCase() === hx) k = i; });
          if (k < 0 && !met) { W.push({ name: (TT.fullName ? TT.fullName(x[1]) : x[0]) || x[0], hex: x[1], group: '' }); k = W.length - 1; }   // a designer color the page list lacks
          return k; }).filter(function (k) { return k >= 0; }), uv ? 'Ultra-UV Metallic · +$10' : met ? 'Metallic' : g[0]]; }).filter(function (g) { return g[0].length && (rndSlot !== 'scale' || /Metallic/.test(g[1])); });   // the scales: metallics only   // (Builder's Choice has no metallic twist)
    rndPal.innerHTML = groups.map(function (g) { var items = Array.isArray(g[0]) ? g[0].map(function (i) { return [W[i], i]; }) : W.map(function (c, i) { return [c, i]; }).filter(function (x) { return (x[0].group || '') === g[0]; }).sort(function (a, b) { return lumOf(b[0].hex) - lumOf(a[0].hex); }); if (!items.length) return '';   /* lightest to darkest */
      return '<div class="rb-rp-h">' + g[1] + '</div><div class="rb-rp">' + items.map(function (x) { return '<button type="button" class="' + (x[1] === cur2 ? 'on' : '') + '" data-i="' + x[1] + '" title="' + shown(x[0].name) + '" style="background:' + x[0].hex + '"></button>'; }).join('') + '</div>'; }).join('');
    [].forEach.call(rndPal.querySelectorAll('.rb-rp button'), function (b) { b.onclick = function () { var i = +b.dataset.i; if (rndSlot === 'scale') { S.bcScale = i; renderRandom(); updateAll(); return; } if (rndSlot === 'main') S.mainIdx = i; else sup[rndSlot] = i; call('renderSupportingRows'); updateAll(); }; });
  }
  // wrap length: starts at the rod type's length (9 in here); each extra inch is +$10
  // wrap length: included length per wrap (cross wraps 8 in, the rest this rod type's length); longer costs per inch (cross wraps +$20, the rest +$10); shorter is allowed and doesn't lower the price
  function isCrossWrap() { var pr = presetOf(S.wrapId); return !!(pr && pr.k === 'cross'); }
  function BASE_LEN() { return isCrossWrap() ? 8 : 9; }   // diamond, chevron and dragon scale start at 9 in included, cross wraps at 8 in; abalone 9 in (and only goes shorter)
  function LEN_RATE() { return isCrossWrap() ? 20 : 15; }   // +$15 each added inch (cross wraps +$20)
  function MAX_LEN() { return S.wrapId === 'abalone' ? 9 : BASE_LEN() + 12; }
  var MIN_LEN = 3, lenBox;   // lenBox: the wrap length box (in the designer, or beside the abalone colors)
  function wrapLen() { return Math.min(MAX_LEN(), Math.max(MIN_LEN, +S.wrapLen || BASE_LEN())); }
  // the Trim Band wrap: its band length in quarter inches; 2 in included, +$10 each extra inch ($2.50 a quarter inch)
  function tbLenQ() { var d = S.customDesign, t = d && d.setup && d.setup.trims; return Math.max(1, Math.round(((t && +t.mm) || 50.8) / 6.35)); }
  // the Trim Band wrap, counted per side (each one is mirrored on the other side): 2 saw blades and 4 fades included, +$5 each extra
  var TB_SAW = 2, TB_FADE = 4, TB_EACH = 5;
  function tbCount(t) { var o = { saw: 0, fade: 0 }; if (!t) return o; var b = t.bands || [], e = t.ends || [];
    b.concat(e).forEach(function (x) { if (x.saw) o.saw++; else if (x.fade) o.fade++; });
    if (t.noFill && b.length > 1 && e.length && b[b.length - 1].fade && e[e.length - 1].fade) o.fade--;   // main color off: the center's last fade and the end bands' last fade meet as one fade
    return o; }
  function tbParts() { var d = S.customDesign; return tbCount(d && d.setup && d.setup.trims); }
  function tbFeeOf(o) { return (Math.max(0, o.saw - TB_SAW) + Math.max(0, o.fade - TB_FADE)) * TB_EACH; }
  function tbPartFee() { if (S.wrapId !== 'trim-band' || S.wrapMode === 'random') return 0; return tbFeeOf(tbParts()); }
  // in the Trim Band wrap's designer: the add buttons show +$5 once the included ones are used, and a line shows the count and the charge
  function tbFeeHook(w) { try { if (!w || w.__sfswTbFee) return; var d = w.document; w.__sfswTbFee = true;
    var paint = function () { var tw = d.getElementById('trimWrap'); if (!tw) return; var on = S.wrapId === 'trim-band' && d.documentElement.classList.contains('sfswtb'), t = null;
      var cp = null; try { cp = w.wlCapture(); t = cp.trims; } catch (e) {} var o = tbCount(t);
      // the Trim Length follows the design: once the threads reach the next quarter inch past the length set, it goes up to it (and is charged)
      if (on && t && w.WLTrim) try { var need = Math.floor(w.WLTrim.width(t, +cp.tsize || 0.21) / 6.35 + 0.02),   /* a quarter inch counts once the band reaches it (2.02 in stays 2 in; 2.25 in is 2.25) */ q = Math.max(1, Math.round((t.mm || 20) / 6.35)), tl = d.getElementById('tlmm');
        if (need > q && tl && need <= 36) { tl.value = (need / 4).toFixed(2); tl.dispatchEvent(new w.Event('change')); return; } } catch (e) {}
      [['saw', 'saw blade', o.saw >= TB_SAW], ['fade', 'fade', o.fade >= TB_FADE]].forEach(function (k) { var b = tw.querySelector('.addbtn[data-k="' + k[0] + '"]'); if (!b) return;
        var txt = '+ Add ' + k[1] + (on && k[2] ? '  +$' + TB_EACH : ''); if (b.textContent !== txt) b.textContent = txt; b.classList.toggle('sfswPaid', !!(on && k[2])); });
      var row = tw.querySelector('.addbtn[data-k="saw"]'); row = row && row.parentNode; if (!row) return; var ln = tw.querySelector('.sfswTbFee');
      if (!on) { if (ln) ln.remove(); return; }
      if (!ln) { ln = d.createElement('div'); ln.className = 'sfswTbFee'; row.parentNode.insertBefore(ln, row.nextSibling); }
      var f = tbFeeOf(o), h = 'Saw blades: <b>' + o.saw + '</b> each side (' + TB_SAW + ' included) · Fades: <b>' + o.fade + '</b> each side (' + TB_FADE + ' included)' + (f ? ' · <b class="sfswTbAdd">+$' + f + '</b>' : ' · <b>no extra charge</b>');
      if (ln.innerHTML !== h) ln.innerHTML = h;
      var bt = tw.querySelector('.sfswBubT'); if (!bt) { bt = d.createElement('div'); bt.className = 'sfswBubT'; ln.parentNode.insertBefore(bt, ln.nextSibling); } bubFill(d, bt); };
    var st = d.createElement('style'); st.textContent = '.sfswTbFee{font-size:13.5px;margin:8px 0 10px;opacity:.9}.sfswTbFee .sfswTbAdd{color:#e0b13a}.addbtn.sfswPaid{border-color:#c9941a!important;color:#e0b13a!important}'; d.head.appendChild(st);
    var mo = new w.MutationObserver(function () { clearTimeout(w.__sfswTbT); w.__sfswTbT = setTimeout(paint, 30); });
    mo.observe(d.body, { childList: true, subtree: true }); d.addEventListener('input', function () { setTimeout(paint, 60); }, true); d.addEventListener('change', function () { setTimeout(paint, 60); }, true);
    w.__sfswTbPaint = paint; window.__sfswTbPaintNow = function () { try { if (dz && dz.contentWindow === w) paint(); } catch (e) {} }; paint(); } catch (e) {} }
  // the cross wraps' Pattern Size: +$5 each 10% up to 50%, then +$10 each 10% after (100% = +$75)
  function sizeFeeOf(pct) { var n = Math.floor((+pct || 0) / 10 + 1e-9); return 5 * Math.min(n, 5) + 10 * Math.max(0, n - 5); }
  function crossSizeFee() { if (!isCrossWrap() || S.wrapMode !== 'build') return 0; var d = S.customDesign; return sizeFeeOf(d && d.setup && d.setup.sizePct); }
  function crossSizeHook(w) { try { if (!w || w.__sfswSz) return; var d = w.document, sp = d.getElementById('sizePct'), out = d.getElementById('sizeOut'); if (!sp || !out) return; w.__sfswSz = true;
    sp.step = '5'; sp.value = String(Math.round((+sp.value || 0) / 5) * 5);   // 5% at a time
    var tag = d.createElement('b'); tag.id = 'sfswSizeFee'; tag.style.cssText = 'margin-left:10px;color:#e0b13a;font-weight:700;min-width:4ch'; out.parentNode.insertBefore(tag, out.nextSibling);
    var note = d.getElementById('sizeNote'); if (note) note.insertAdjacentHTML('beforeend', ' <span style="color:#e0b13a;font-weight:600">· +$5 each 10% up to 50%, +$10 each 10% after</span>');
    var paint = function () { var f = sizeFeeOf(sp.value); tag.textContent = f ? '+$' + f : 'Included'; };
    sp.addEventListener('input', paint); sp.addEventListener('change', paint); w.__sfswSzPaint = paint; paint(); } catch (e) {} }
  function tbLenFee() { return S.wrapId === 'trim-band' ? Math.max(0, tbLenQ() - 8) * 2.5 : 0; }
  function lenFee() { return CFG.wrap && S.wrapId !== 'trim-band' ? Math.max(0, wrapLen() - BASE_LEN()) * LEN_RATE() : 0; }   // the Trim Band wrap has no length to pick
  function setWrapLen(n) {
    S.wrapLen = Math.max(MIN_LEN, Math.min(MAX_LEN(), n)); renderLen();
    var w = dw(); if (w && w.wlCapture && S.wrapMode !== 'random') { try { var c = w.wlCapture(); c.unit = 'in'; c.len = wrapLen().toFixed(2); w.wlApply(c); } catch (e) {} clearTimeout(readT); readT = setTimeout(readDesign, 300); }
    updateAll();
  }
  function renderLen() { var b = lenBox; if (!b) return; var f = lenFee(), ab = S.wrapId === 'abalone';
    b.querySelector('b').textContent = wrapLen() + ' in'; b.querySelector('.rb-len-fee').textContent = f ? '+$' + f : 'Included'; b.querySelector('[data-d="-1"]').disabled = wrapLen() <= MIN_LEN; var lab = b.querySelector('.rb-len-l small'); if (lab) lab.textContent = ab ? '9 in max · shorter is fine (same price)' : BASE_LEN() + ' in included · +$' + LEN_RATE() + ' each added inch · shorter is fine (same price)';
    var off = S.wrapId === 'trim-band'; b.classList.toggle('rb-len-off', off); b.title = off ? 'Wrap length is set for the Trim Band wrap. Pick another wrap to change it.' : '';
    [].forEach.call(b.querySelectorAll('button'), function (x) { if (off) x.disabled = true; else if (x.dataset.d === '1') x.disabled = wrapLen() >= MAX_LEN(); }); }
  // Trim bands: on/off, width and thread color, written straight into the wrap design
  var tbEl;   // (set by tbBox while the steps are built, earlier in the file)
  function tbBox() { tbEl = el('div', 'cfg-section rb-tb'); tbEl.innerHTML = '<div class="rb-tb-body"></div>'; setTimeout(renderTB, 0); return tbEl; }
  function abTrim() { return S.abTrim || (S.abTrim = { on: true, mm: 10, c: '#1e1617' }); }   // abalone's own trim bands (default 862 Twilight Black)
  function tbCap() { if (S.wrapId === 'abalone') return { trims: abTrim() }; var w = dw(); try { return w && w.wlCapture ? w.wlCapture() : null; } catch (e) { return null; } }
  function tbSet(fn) { if (S.wrapId === 'abalone') { fn(abTrim()); updateAll(); setTimeout(renderTB, 60); return; } var w = dw(), c = tbCap(); if (!c || !c.trims) return; fn(c.trims); try { w.wlApply(c); } catch (e) {} clearTimeout(readT); readT = setTimeout(readDesign, 200); setTimeout(renderTB, 260); }
  // the Trim Bands tab: the designer's own trim band settings, in a second designer that shows only them;
  // what's set there goes onto the wrap (only the trims; the wrap itself stays put)
  var tf = null, tfReady = null, tfT = null, tfSync = false;
  function tfFit() { try { var d = tf.contentDocument, w = d.querySelector('.wrap'); var b = w.getBoundingClientRect().bottom;
    [].forEach.call(d.querySelectorAll('.cpop'), function (pp) { if (pp.offsetParent) b = Math.max(b, pp.getBoundingClientRect().bottom + 12); });
    tf.style.height = Math.ceil(b + 8) + 'px'; } catch (e) {} }
  function tfPull() {   // the main wrap's trims into the trims designer
    var w = dw(), fw = tf && tf.contentWindow; if (!w || !w.wlCapture || !fw || !fw.wlApply) return;
    try { tfSync = true; fw.wlApply(clean(w.wlCapture())); } catch (e) {} setTimeout(function () { tfSync = false; tfFit(); try { trimPresetSync(tf.contentDocument, fw); } catch (e) {} }, 60);
  }
  function tfPush() {   // the trims designer's trims onto the main wrap
    if (tfSync) return; var w = dw(), fw = tf && tf.contentWindow; if (!w || !w.wlApply || !fw || !fw.wlCapture) return;
    clearTimeout(tfT); tfT = setTimeout(function () { try { var c = w.wlCapture(), t = fw.wlCapture().trims; if (!t || JSON.stringify(t) === JSON.stringify(c.trims)) return;
      c.trims = JSON.parse(JSON.stringify(t)); w.wlApply(c); clearTimeout(readT); readT = setTimeout(readDesign, 150); } catch (e) {} }, 180);
  }
  function tbFrame(body) {
    if (!tf) {
      tf = el('iframe'); tf.id = 'sfsw-trims'; tf.title = 'Trim band settings'; tf.setAttribute('scrolling', 'no'); tf.style.cssText = 'display:block;width:100%;height:420px;border:0;background:transparent';
      tfReady = new Promise(function (res) { tf.addEventListener('load', function () { var tries = 0, t = setInterval(function () { var fw = tf.contentWindow;
        if ((fw && fw.wlCapture && fw.wlApply) || ++tries > 80) { clearInterval(t); try { var dd = tf.contentDocument; dd.documentElement.classList.remove('sfsws');
          ['input', 'change', 'click'].forEach(function (ev) { dd.addEventListener(ev, function () { setTimeout(tfPush, 0); }, true); });
          new fw.MutationObserver(function () { setTimeout(tfFit, 0); }).observe(dd.body, { childList: true, subtree: true, attributes: true });
          trimPresetBox(dd, fw, function () { setTimeout(tfPush, 0); }); } catch (e) {}
          res(); } }, 100); }); });
      tf.src = BASE + 'taper.html';
    }
    if (tf.parentNode !== body) { body.innerHTML = ''; body.appendChild(tf); }
    tfReady.then(function () { tfPull(); setTimeout(tfFit, 200); });
  }
  addEventListener('message', function (e) { if (tf && e.source === tf.contentWindow && e.data && e.data.wlH) tfFit(); });
  function renderTB() {
    if (!tbEl || !tbEl.offsetParent) return;   // only once the Trim Bands tab is open (its designer loads then, not with the page)
    if (!tbEl) return; var body = tbEl.querySelector('.rb-tb-body'), c = tbCap(), w = dw();
    if (S.wrapMode === 'random' && S.wrapId !== 'abalone') { body.innerHTML = '<p class="rb-tb-note">Random wraps get trim bands in your main color. Pick an example or Customize on the Wrap step to choose them here.</p>'; return; }
    if (!c || !c.trims) { body.innerHTML = '<p class="rb-tb-note">Loading…</p>'; setTimeout(renderTB, 600); return; }
    if (S.wrapId !== 'abalone') return tbFrame(body);
    var T = c.trims, groups = []; try { groups = w.WL_THREADS.BRANDS.sfsw.groups; } catch (e) {}
    var nm = '—'; groups.forEach(function (g) { g[1].forEach(function (x) { if (String(x[1]).toLowerCase() === String(T.c).toLowerCase()) nm = x[0]; }); });
    body.innerHTML = '<div class="rb-tb-row"><div class="rb-seg"><button type="button" data-on="1" aria-pressed="' + !!T.on + '">Trim bands</button><button type="button" data-on="0" aria-pressed="' + !T.on + '">No trim bands</button></div>' +
      (T.on ? '<div class="rb-len rb-tb-w"><span class="rb-len-l">Width at each end</span><button type="button" data-w="-1">−</button><b>' + T.mm + ' mm</b><button type="button" data-w="1">+</button></div>' : '') + '</div>' +
      (T.on ? '<div class="rb-tb-now">Trim color: <b>' + nm + '</b></div>' + groups.map(function (g) { return '<div class="rb-rp-h">' + g[0] + '</div><div class="rb-rp">' + g[1].map(function (x) {
        return '<button type="button" data-c="' + x[1] + '" title="' + x[0] + '" class="' + (String(x[1]).toLowerCase() === String(T.c).toLowerCase() ? 'on' : '') + '" style="background:' + x[1] + '"></button>'; }).join('') + '</div>'; }).join('') : '');
    [].forEach.call(body.querySelectorAll('[data-on]'), function (b) { b.onclick = function () { var on = b.dataset.on === '1'; tbSet(function (t) { t.on = on; }); }; });
    [].forEach.call(body.querySelectorAll('[data-w]'), function (b) { b.onclick = function () { var d = +b.dataset.w; tbSet(function (t) { t.mm = Math.max(3, Math.min(40, (+t.mm || 20) + d)); }); }; });
    [].forEach.call(body.querySelectorAll('[data-c]'), function (b) { b.onclick = function () { var col = b.dataset.c; tbSet(function (t) { t.c = col; }); }; });
  }
  // Customize starts from a plain 3-color wrap of the picked style, with the threads set so the diamonds
  // take up as much of the wrap as the open space between them
  function genericDesign() { var pr = presetOf(S.wrapId); if (!pr || pr.k !== 'taper' || !/diamond|chevron/.test(pr.p)) return; presetFill(); var L = presetsFor(), k = S.wrapId === 'chev-4' ? Math.min(recPick[S.wrapId] || 0, L.length - 1) : 0; presetPick(k); return presetApply(L[k], true); }   // the customizer opens on Preset 1 (on Chevron 4 Axis, whose presets are its examples: the preset of the example picked)

  // the pattern between brings up to 2 new colors free; colors it shares with the main wrap are free anyway
  function innerFree() { var d = designOn(), c = d && d.setup; if (!c || !c.inner || !c.inner.on || S.wrapMode !== 'build') return 0;
    var lc = function (x) { return String(x || '').toLowerCase(); }, main = {}; (c.stripes || []).forEach(function (x) { main[lc(x.c)] = 1; }); if (c.center && c.center.on) main[lc(c.center.c)] = 1;
    var nw = {}; (c.inner.stripes || []).forEach(function (x) { if (!main[lc(x.c)]) nw[lc(x.c)] = 1; }); return Math.min(2, Object.keys(nw).length); }
  window.SFSW_designColors = function () { var d = designOn(); return d && d.colors ? d.colors.length - innerFree() : null; };
  function setMode(m, quiet) {
    var was = S.wrapMode; S.wrapMode = m; try { syncSkips(); } catch (e) {}   // Builder's Choice hides the Trim Bands step
    if (m === 'build' && was !== 'build') { lastPreset = null; presetFill(); genericDesign(); if (S.wrapId === 'trim-band') try { var tps = dz.contentDocument.getElementById('sfswTrimPreset'); if (tps) tps.value = String(Math.min(recPick['trim-band'] || 0, 2)); } catch (e) {}   /* Trim Band Example 1-3 = Preset 1-3 */ if (typeof setMore === 'function') { setMore(); setTimeout(fitDz, 60); } }
    if (m === 'random' && was !== 'random') { S.supportIdxs = (S.supportIdxs || []).slice(0, 3); call('renderSupportingRows'); }   // Builder's Choice starts at main + 3 supporting
    renderModes(); updTop(); if (quiet) return;
    if (was === 'random' && m !== 'random') { clearTimeout(readT); readT = setTimeout(readDesign, 50); }
    updateAll();
  }
  async function toDesigner(id, restore, prevCols) {
    dzBusy = true; clearTimeout(busyT); busyT = setTimeout(function () { dzBusy = false; }, 6000);   // (safety: never hold the rod for long)
    if (!dz) return; var n = ++applyN; dzHold = Date.now();   // while the designer switches (pattern, then axis lines), a read in between doesn't re-pick the wrap
    var pr = presetOf(id);
    dzBox.style.display = pr ? '' : 'none';
    if (!pr) return;
    renderModes(); var REC = S.wrapMode === 'example' ? recOf(pr, id) : null;
    var prev = prevCols || designCols(), first = !prev, switched = false;
    switched = !!(lastKind && lastKind !== (restore ? restore.sfsw : pr.k));
    var w = await loadKind(restore ? restore.sfsw : pr.k); if (!w || n !== applyN) return; tbFeeHook(w); crossSizeHook(w); if (w.__sfswSzPaint) setTimeout(w.__sfswSzPaint, 200);
    var WS0 = (window.SFSW_BUILDER || {}).wrap, fit = null; if (!WS0) try { if (rod && rod.fit) fit = await rod.fit(); } catch (e) {}   // this rod type sets the wrap's size itself: no need to wait for the 3D rod
    var cap = restore ? JSON.parse(JSON.stringify(restore.setup)) : w.wlCapture();
    if (restore && restore.setup && restore.setup.unit === 'in' && +restore.setup.len) S.wrapLen = +restore.setup.len;
    if (fit) { cap.unit = fit.unit; cap.len = fit.len; cap.dB = fit.dB; cap.dM = fit.dM; cap.dT = fit.dT; }
    var WS = (window.SFSW_BUILDER || {}).wrap;   // this rod type's wrap: length (in) and butt / tip diameters (mm)
    if (WS && !restore) { cap.unit = 'in'; cap.len = (+wrapLen()).toFixed(2); cap.dB = (+WS.dB).toFixed(1); cap.dT = (+WS.dT).toFixed(1); cap.dM = ((+WS.dB + +WS.dT) / 2).toFixed(1); }
    if (!restore && dzKind === 'cross') { noCustom(w); cap.reps = null; }   // repetitions: auto, to fill the wrap
    if (!restore && REC && REC.stripes) { var hx0 = threadHex(w);   // the wrap's own design goes in first, so nothing else ever shows
      cap.stripes = REC.stripes.map(function (x) { return { c: hx0(x[0]), t: x[1] }; }); if (cap.trims) { cap.trims.c = hx0(REC.trim || REC.stripes[0][0]); cap.trims.bands = []; cap.trims.noFill = false; cap.trims.ends = []; } if (REC.tb) cap.trims = tbOf(REC.tb, hx0); if (REC.dragon && cap.dragon) { cap.dragon.metal = hx0(REC.dragon.metal); cap.dragon.line = hx0(REC.dragon.line); if (REC.dragon.over) cap.dragon.over = Object.assign({}, cap.dragon.over, REC.dragon.over); } if (REC.sax) cap.axes = REC.sax; var ri0 = recInner(REC, hx0); if (ri0) cap.inner = ri0; else if (cap.inner) cap.inner.on = false; if (REC.chevTo) cap.chevTo = REC.chevTo; if (REC.angle || REC.dragon) cap.angle = REC.angle || '45'; }
    if (!restore && pr.p !== 'trim' && cap.trims && !(REC && REC.tb)) { cap.trims.mm = 20; cap.trims.bands = []; cap.trims.noFill = false; cap.trims.ends = []; }
    else if (!restore && !prev && dzKind === 'taper') { cap.stripes = JSON.parse(JSON.stringify(START.stripes)); if (cap.trims) { cap.trims.c = START.trim; cap.trims.bands = []; cap.trims.noFill = false; cap.trims.ends = []; } }
    if (!restore) snap(w, cap);
    var same = !restore && !switched && !first && REC && pr.k === 'taper' && cap.pattern === pr.p && +cap.axes === +pr.a && pr.p !== 'dragon';   // same wrap, another example: nothing else to set up
    if (same) { cap.nOverride = null; cap.chevTo = (REC && REC.chevTo) || null; if (cap.inner && !REC.inner) cap.inner.on = false; }
    try { w.wlApply(cap); } catch (e) {}
    lastKind = dzKind;
    if (same) { clearTimeout(readT); readT = setTimeout(function () { dzHold = 0; readDesign(); }, 20); return; }
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
        if (sel) { var want = (REC && REC.pat) || pr.pat || ([].find.call(sel.options, function (o) { return !/snowflake/i.test(o.value); }) || {}).value;
          if (want && sel.value !== want && [].some.call(sel.options, function (o) { return o.value === want; })) { sel.value = want; sel.dispatchEvent(new Event('change', { bubbles: true })); } }
        press(w, '#axes [data-v="' + pr.a + '"]');
      }
      // the customer's colors carry over to the new wrap (a cross wrap's pattern brings its own recipe colors; a first visit starts on SFSW colors)
      await new Promise(function (r) { setTimeout(r, 120); });
      if (n !== applyN) return;
      var cols = prev || START.stripes.map(function (x) { return x.c; });
      var c2 = w.wlCapture();
      if (REC && REC.stripes) {   // this wrap's own recipe (the design in its photo)
        var hx = threadHex(w), R = REC;
        c2.stripes = R.stripes.map(function (x) { return { c: hx(x[0]), t: x[1] }; });
        if (c2.trims) { c2.trims.c = hx(R.trim || R.stripes[0][0]); c2.trims.bands = []; c2.trims.noFill = false; c2.trims.ends = []; }
        if (R.tb) c2.trims = tbOf(R.tb, hx);
        if (R.dragon && c2.dragon) { c2.dragon.metal = hx(R.dragon.metal); c2.dragon.line = hx(R.dragon.line); if (R.dragon.over) c2.dragon.over = Object.assign({}, c2.dragon.over, R.dragon.over); }
        var ri = recInner(R, hx); if (ri) c2.inner = ri; else if (c2.inner) c2.inner.on = false;
        if (R.chevTo) c2.chevTo = R.chevTo;   // which way the chevrons point
        if (R.angle || R.dragon) c2.angle = R.angle || '45';   // an example's thread angle (dragon scale examples go back to 45 unless set)
      } else if (dzKind === 'cross' || switched || first) { (c2.stripes || []).forEach(function (x, i) { x.c = cols[i % cols.length]; }); if (c2.trims) { c2.trims.c = cols[0]; c2.trims.bands = []; c2.trims.noFill = false; c2.trims.ends = []; } }
      if (pr.p !== 'trim' && c2.trims && !(R && R.tb)) { c2.trims.mm = 20; c2.trims.bands = []; c2.trims.noFill = false; c2.trims.ends = []; }   // the Trim Band's wide band doesn't carry over
      if (pr.k === 'taper' && pr.p !== 'trim') { c2.pattern = pr.p; c2.axes = pr.a; if (pr.p === 'dragon' && c2.dragon) { c2.dragon.over = Object.assign({}, c2.dragon.over, (R && R.dragon && R.dragon.over) || {}, { on: !!pr.over }); } }   // each wrap starts on its own pattern and axis count (a hidden axis button can miss the press)
      if (pr.p === 'dragon' && S.dragonAx && !pr.over) { c2.axes = S.dragonAx; if (S.dragonAx === 32) c2.angle = '45'; }
      if (R && R.sax) c2.axes = R.sax;   // the scales' own axis lines under a wrap over them   // the dragon scale axes they picked stay
      try { w.wlApply(snap(w, c2)); } catch (e) {}
    }
    clearTimeout(readT); readT = setTimeout(function () { if (n === applyN) dzHold = 0; readDesign(); }, 120);
  }
  if (dz) {
    var _pick = window.pickWrap, _render = window.renderWraps;
    window.pickWrap = function (id) { var prev = designCols(); _pick(id); setTimeout(function () { toDesigner(id, null, prev); }, 40); };
    // the wrap the design is priced as stays lit in the list
    if (typeof _render === 'function') window.renderWraps = function () { var r = _render.apply(this, arguments);
      if (S.customDesign && optList) [].forEach.call(optList.querySelectorAll('.option-item'), function (o) { o.classList.toggle('selected', (o.getAttribute('onclick') || '').indexOf("'" + rowId(S.wrapId) + "'") > 0); });
      dressWraps(); return r; };
    try { window.renderWraps(); } catch (e) {}   // the list may have been drawn before this hook was in place: draw it again through it
  }
  // each wrap gets a small photo (tap for the full photos), split into Included and Upgrades
  function wrapPhotos(w) { if (!w) return []; if (w.photo) return [w.photo]; var a = []; if (w.photoNums) return w.photoNums.map(function (i) { return '../preview/rod-wraps/' + (w.photoSlug || w.id) + '-' + i + '.png'; }); for (var i = 1; i <= (w.photoCount || 0); i++) a.push('../preview/rod-wraps/' + (w.photoSlug || w.id) + '-' + i + '.png'); return a; }
  // wrap families: one row in the list ("Diamond Wrap"), with the axis count picked inside it; the row stays put while the axis changes
  var FAMILIES = [{ name: 'Diamond Wrap', ids: ['diam-2', 'diam-4', 'closed-4', 'axis-16'], ax: [2, 4, 8, 16] },
                  { name: 'Chevron Wrap', ids: ['chev-2', 'chev-4', 'chev-8', 'chev-16'], ax: [2, 4, 8, 16] },
                  { name: 'Dragon Scale', ids: ['dragon', '2axis-dragon'], labels: ['Scales Only', '2 Axis Wrap Over'] }];   // the wrap over the scales is a switch in the Dragon Scale row
  function famOf(id) { for (var i = 0; i < FAMILIES.length; i++) if (FAMILIES[i].ids.indexOf(id) >= 0) return FAMILIES[i]; return null; }
  function rowId(id) { var f = famOf(id); return f ? f.ids[0] : id; }   // the list row a wrap shows in
  function dressFamilies() {
    [].forEach.call(optList.querySelectorAll('.option-item'), function (o) {
      var m = (o.getAttribute('onclick') || '').match(/pickWrap\('([^']+)'\)/); if (!m) return; var f = famOf(m[1]); if (!f) return;
      if (m[1] !== f.ids[0]) { o.style.display = 'none'; return; }
      var nm = o.querySelector('.option-item-name'); if (nm) nm.textContent = f.name;
      o.classList.toggle('selected', f.ids.indexOf(S.wrapId) >= 0);
      var pe = o.querySelector('.option-item-price'), on = f.ids.indexOf(S.wrapId) >= 0 ? wrapById(S.wrapId) : null; if (pe && on) pe.textContent = on.adder ? '+$' + on.adder : 'Included';   // the row shows the picked one's price
    });
  }
  function dressWraps() {
    if (!optList) return; [].forEach.call(optList.querySelectorAll('.option-item'), function (o) { o.__rbd = true; }); var upg = false;
    [].forEach.call(optList.querySelectorAll('.option-item'), function (o) {
      var m = (o.getAttribute('onclick') || '').match(/pickWrap\('([^']+)'\)/); if (!m) return; var w = wrapById(m[1]); if (!w) return;
      // one list (no Included / Upgrades headings); wraps that cost extra show their price
      return;   // photos show in the slot above the list
      var ph = wrapPhotos(w); if (!ph.length || o.querySelector('.rb-wth')) return;
      var th = el('span', 'rb-wth', ph.length > 1 ? '<b>' + ph.length + '</b>' : ''); th.style.backgroundImage = 'url("' + ph[0] + '")'; th.title = 'See photos';
      th.onclick = function (e) { e.stopPropagation(); lightbox(w); }; o.insertBefore(th, o.firstChild); });
    dressFamilies(); exButtons();
  }
  // the picked wrap's examples (Example 1, 2, 3 … one per photo) sit in its own card; the photo slot above the list shows the one picked
  var modeWrap = null;
  function exButtons() {
    if (optList && S.wrapMode === 'build' && modeWrap && modeWrap !== S.wrapId && !dzBusy) {   // another wrap picked while the designer was open: close it and go to that wrap
      S.wrapMode = 'example'; if (dzBox) dzBox.classList.add('rb-dz-off');
      setTimeout(function () { var c = optList.querySelector('.option-item.selected'); if (c) { var y = c.getBoundingClientRect().top + scrollY - navH() - (top ? top.offsetHeight : 0) - 16; scrollTo({ top: y, behavior: 'smooth' }); } }, 60); }
    if (S.wrapMode === 'random' && modeWrap && modeWrap !== S.wrapId) { S.wrapMode = 'example'; setTimeout(function () { renderModes(); updTop(); updateAll(); }, 0); }   // another wrap picked: leave Builder's Choice, show that wrap's example
    modeWrap = S.wrapId;
    if (!optList) return; var id = S.wrapId, w = wrapNamed(id), pr = presetOf(id), recs = (pr && pr.recs) || [], ph = wrapPhotos(w), n = Math.max(ph.length, recs.length), cur = recPick[id] || 0;
    if (lenBox && dzBox && lenBox.closest('.rb-exs')) { lenBox.classList.remove('rb-len-ab'); dzBox.insertBefore(lenBox, dzBox.firstChild); }   // the length box goes back into the designer
    [].forEach.call(optList.querySelectorAll('.rb-exs'), function (x) { x.remove(); });
    var card = [].find.call(optList.querySelectorAll('.option-item'), function (o) { return (o.getAttribute('onclick') || '').indexOf("'" + rowId(id) + "'") > 0; });
    if (card) {
      var box = el('div', 'rb-exs'); box.addEventListener('click', function (e) { e.stopPropagation(); });
      var fam = famOf(id); if (fam) { var ax = el('div', 'rb-fax');   // 2 / 4 / 8 / 16 axis: each shows its own examples
        fam.ids.forEach(function (fid, k) { var fw = wrapById(fid), b = el('button', fid === id ? 'on' : '', (fam.labels ? fam.labels[k] : fam.ax[k] + ' Axis') + (fw && fw.adder ? ' <small>+$' + fw.adder + '</small>' : ''));   /* each axis count's own upcharge */ b.type = 'button';
          b.onclick = function () { if (fid !== S.wrapId) window.pickWrap(fid); }; ax.appendChild(b); });
        box.appendChild(ax); box.appendChild(el('div', 'rb-fbr')); }
      if (pr && pr.p === 'dragon' && !pr.over) { var dax = el('div', 'rb-fax'), curA = (designOn() && designOn().setup && +designOn().setup.axes) || S.dragonAx || 8;   // dragon scales: 8 / 16 / 32 axis
        [8, 16, 32].forEach(function (a) { var b = el('button', a === curA ? 'on' : '', a + ' Axis' + (DRAG_AX[a] ? ' <small>+$' + DRAG_AX[a] + '</small>' : '')); b.type = 'button'; b.onclick = function () { setDragonAx(a); }; dax.appendChild(b); });
        box.appendChild(dax); box.appendChild(el('div', 'rb-fbr')); }
      for (var i = 0; i < (id === 'abalone' ? 0 : n); i++) { var b = el('button', i === cur && S.wrapMode === 'example' ? 'on' : '', 'Example ' + (i + 1)); b.type = 'button'; b.dataset.i = i;
        b.onclick = function () { var k = +this.dataset.i; recPick[id] = k; var was = S.wrapMode;
          if (recs[k] && (recs[k].stripes || recs[k].pat || (recs.some(function (r) { return r && r.pat; }) && pr.k === 'cross'))) { setMode('example', true); toDesigner(id, null, null); } else { setMode('example', was === 'example'); exButtons(); } }; box.appendChild(b); }
      if (id === 'abalone' && w && w.colors) {   // abalone: pick the shell color here (no thread colors)
        w.colors.forEach(function (c, k) { var b = el('button', (S.abaloneColorIdx || 0) === k ? 'on' : '', c); b.type = 'button';
          b.onclick = function () { call('pickAbaloneColor', String(k)); setTimeout(exButtons, 30); }; box.appendChild(b); });
        if (lenBox) { lenBox.classList.add('rb-len-ab'); box.appendChild(lenBox); renderLen(); }   // abalone has no designer: its length sits to the right of the shell colors
      }
      if (pr) [['build', 'Customize'], ['random', 'Builder\u2019s Choice']].filter(function (x) { return !(x[0] === 'random' && id === 'dragon'); }).forEach(function (x) { var b = el('button', 'rb-exm' + (S.wrapMode === x[0] ? ' on' : ''), x[1]); b.type = 'button';
        b.onclick = function () { setMode(S.wrapMode === x[0] ? 'example' : x[0]); exButtons(); }; box.appendChild(b); });
      (card.querySelector('.option-item-body') || card).appendChild(box);
    }
    placeModes(card); syncSkips(); renderLen(); try { dz.contentDocument.documentElement.classList.toggle('sfswtb', S.wrapId === 'trim-band'); } catch (e) {}
    if (wphoto) { var src = ph[Math.min(cur, ph.length - 1)]; wphoto.hidden = !src; wphoto.classList.toggle('rb-wph-full', id === 'abalone'); if (src) { wphoto.style.backgroundImage = 'url("' + src + '")'; wphoto.onclick = function () { lightbox(w, Math.min(cur, ph.length - 1)); }; } updTop(); }
  }
  function lightbox(w, start) {
    var ph = wrapPhotos(w), i = Math.min(start || 0, Math.max(0, ph.length - 1)), box = el('div', 'rb-lb', '<button class="rb-lbx" aria-label="Close">×</button><img alt=""><div class="rb-lbt"></div>' +
      (ph.length > 1 ? '<button class="rb-lbp" aria-label="Previous photo">‹</button><button class="rb-lbn" aria-label="Next photo">›</button>' : ''));
    var img = box.querySelector('img'), cap = box.querySelector('.rb-lbt');
    var show = function () { img.src = ph[i]; cap.innerHTML = w.name + (ph.length > 1 ? '<span>' + (i + 1) + ' / ' + ph.length + '</span>' : ''); };
    var close = function () { box.remove(); removeEventListener('keydown', key); };
    var key = function (e) { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') { i = (i + 1) % ph.length; show(); } if (e.key === 'ArrowLeft') { i = (i - 1 + ph.length) % ph.length; show(); } };
    box.onclick = function (e) { var t = e.target; if (t === box || t.classList.contains('rb-lbx')) close();
      else if (t.classList.contains('rb-lbn')) { i = (i + 1) % ph.length; show(); } else if (t.classList.contains('rb-lbp')) { i = (i - 1 + ph.length) % ph.length; show(); } };
    addEventListener('keydown', key); document.body.appendChild(box); show();
  }
  // the photos at the top of Rod Wrap are always the real photos of the wrap picked; the customer's own design shows on the 3D rod and in the designer
  var _preview = window.renderWrapPreview;
  if (dz && typeof _preview === 'function') window.renderWrapPreview = function () {
    var d = S.customDesign; S.customDesign = null;
    try { return _preview.apply(this, arguments); } finally { S.customDesign = d; } };
  var dzNow = dzBox && dzBox.querySelector('.rb-dz-now');
  // the page's own swatches: every Pro-Wrap metallic (included) and every Fuji metallic (Ultra-UV, +$10)
  (function () { var W = val('WRAP_COLORS'); if (!W || W.__sfsw) return; W.__sfsw = 1;
    var PM = [["9860 Metallic Silver","#bfbfbf"], ["9870 Metallic Gunmetal","#716d71"], ["9160 Metallic Pale Gold","#e3d096"], ["9130 Metallic Gold","#d4b460"], ["9100 Metallic Yellow Gold","#d6be39"], ["9120 Metallic Goldenrod","#e4bd2f"], ["9440 Metallic Turquoise","#1e7d8e"], ["9410 Metallic Aqua","#2599c0"], ["9470 Metallic Bluefin","#193f87"], ["9460 Metallic Deep Blue","#2936ae"], ["9510 Metallic Lime","#8cbb65"], ["9520 Metallic Green","#1da34d"], ["9530 Metallic Forest Green","#1d5252"], ["9620 Metallic Mauve","#c47786"], ["9610 Metallic Fuchsia","#ae1f65"], ["9600 Metallic Purple","#b32cab"], ["9630 Metallic Lavender","#a663a9"], ["9710 Metallic Copper","#bb5522"], ["9720 Metallic Red Copper","#b6431a"], ["9300 Metallic Red","#a62927"], ["9880 Metallic Pearl","#e5d5cd"]], FM = [["903 Metallic Silver","#bfbcb5"],["902 Metallic Pale Gold","#b49453"],["911 Metallic True Gold","#caaa40"],["901 Metallic Gold","#efbf5c"],["910 Metallic Aqua","#33b8aa"],["908 Metallic Ice Blue","#0f8fbd"],["912 Metallic Royal Blue","#0c35a3"],["914 Metallic Lime Green","#9dca65"],["904 Metallic Green","#006232"],["906 Metallic Purple","#6848c2"],["905 Metallic Copper","#fbbf92"],["909 Metallic Red","#b40f1e"]];
    for (var i = W.length - 1; i >= 0; i--) if (W[i].group === 'metallic' || W[i].group === 'uv-metallic') W.splice(i, 1);
    PM.forEach(function (x) { W.push({ name: x[0], hex: x[1], group: 'metallic', metallic: true }); });
    FM.forEach(function (x) { W.push({ name: x[0], hex: x[1], group: 'uv-metallic', metallic: true, adder: 10 }); });
    if (S.mainIdx >= W.length) S.mainIdx = 0; S.supportIdxs = (S.supportIdxs || []).filter(function (i) { return i < W.length; }); })();
  function designerAfterUpdate() {
    var ab = !presetOf(S.wrapId);   // Abalone: no designer and no thread colors (its shell color is picked in its card)
    if (colorSec) colorSec.style.display = (!ab && !dz) ? '' : 'none';
    if (S.wrapMode === 'random') updTop();
    if (modeEl) modeEl.style.display = !ab ? '' : 'none';
    if (dzNow) { var w = wrapById(S.wrapId); dzNow.textContent = w ? 'Priced as ' + w.name + ' · ' + (w.adder ? '+$' + w.adder : 'Included') : ''; }
    var d = designOn();
    if (d) {   // the summary's colors line: the real threads from the design
      var names = d.colors.map(function (c) { return c.name; }), fee = (call('supportExtraFee') || 0) + metFee();
      [].forEach.call(document.querySelectorAll('#summary .summary-line'), function (l) { var a = l.querySelector('.sl-label'), v = l.querySelector('.sl-val');
        if (a && v && a.textContent === 'Colors') { var ex = call('extraSupportCount') || 0, uvs = d.colors.filter(function (c) { return c.uv; }).length, tws = d.colors.filter(function (c) { return c.twist; }).length, why = [];
          if (ex) why.push('+$' + ex * 10 + ' for ' + ex + ' extra color' + (ex > 1 ? 's' : '') + ' (4 included)'); if (uvs) why.push('+$' + uvs * 10 + ' for ' + uvs + ' Ultra-UV metallic' + (uvs > 1 ? 's' : '')); if (tws) why.push('+$' + tws * 10 + ' for ' + tws + ' Metallic Twist' + (tws > 1 ? 's' : ''));
          v.textContent = names.join(' / ') + (fee ? '  +$' + fee : '');   /* the charges, spelled out under the colors */
          if (why.length) { var sm = document.createElement('small'); sm.style.cssText = 'display:block;margin-top:4px;color:#e0b13a;font-weight:600'; sm.textContent = why.join(' · '); v.appendChild(sm); } } });
      var cc = $('chosen-wrap-color'); if (cc) cc.textContent = names.join(' / ');
      var cw = $('chosen-rod-wrap'), wn = wrapById(S.wrapId); if (cw && wn) cw.textContent = wn.name;
    }
  }
  function designOn() { return S.wrapMode !== 'random' && presetOf(S.wrapId) && S.customDesign && S.customDesign.colors && S.customDesign.colors.length ? S.customDesign : null; }
  var metFee = function () { var d = designOn(); if (d) return d.colors.filter(function (c) { return c.uv || c.twist; }).length * 10;   // Ultra-UV (Fuji) metallics and Metallic Twists +$10 each, Pro-Wrap metallics included
    var W = val('WRAP_COLORS') || []; return [S.mainIdx].concat(S.supportIdxs || []).reduce(function (a, i) { return a + (W[i] && W[i].group === 'uv-metallic' ? 10 : 0); }, 0); };
  // Color filler (+$20): the designer's filler that covers the open space inside the diamonds
  var FILL_FEE = 20;
  var INNER_FEE = 50;
  function innerOn() { var d = designOn(), c = d && d.setup; return !!(S.wrapMode === 'build' && c && ((c.inner && c.inner.on && (c.inner.stripes || []).length) || (d.sfsw === 'cross' && c.between && c.between.on))); }
  function innerFee() { return isCrossWrap() ? 100 : INNER_FEE; }   // a cross wrap's pattern between is +$100
  function fillFee() { return isCrossWrap() && innerOn() ? 0 : FILL_FEE; }   // on a cross wrap with a pattern between, Color filler is included
  function fillerOn() { var d = designOn(), c = d && d.setup; return !!(S.wrapMode === 'build' && c && c.arms === 'cover' && (c.pattern === 'diamond' || d.sfsw === 'cross')); }
  window.calcUVMetallicFee = function () { return metFee() + lenFee() + (underOn() ? UNDER_FEE : 0) + (fillerOn() ? fillFee() : 0) + (innerOn() ? innerFee() : 0) + dragonFee() + tbLenFee() + tbPartFee() + crossSizeFee() + bcScaleFee(); };   // (the wrap length rides along here)
  var _order = window.buildOrderItem;
  if (typeof _order === 'function') window.buildOrderItem = function () {
    var it = _order.apply(this, arguments), d = designOn();
    if (it.lines && bcDragon() && S.wrapMode === 'random') { var scW = (val('WRAP_COLORS') || [])[bcScaleIdx()]; if (scW) it.lines.push({ label: 'Dragon Scales (Builder\u2019s Choice)', value: scW.name + (bcScaleFee() ? '  +$' + bcScaleFee() : '') }); }
    if (it.lines && crossSizeFee()) it.lines.push({ label: 'Cross Wrap Pattern Size', value: (+S.customDesign.setup.sizePct || 0) + '%  +$' + crossSizeFee() });
    if (it.lines && S.wrapId === 'trim-band' && S.wrapMode !== 'random') { var tp = tbParts(); it.lines.push({ label: 'Saw Blades / Fades', value: tp.saw + ' / ' + tp.fade + ' each side' + (tbPartFee() ? '  +$' + tbPartFee() : '') }); }
    if (it.lines && S.wrapId === 'trim-band') it.lines.push({ label: 'Trim Band Length', value: (tbLenQ() / 4) + ' in' + (tbLenFee() ? '  +$' + tbLenFee().toFixed(2).replace(/\.00$/, '') : '') });
    if (CFG.wrap && it.lines && S.wrapId !== 'trim-band' && wrapLen() !== BASE_LEN()) it.lines.push({ label: 'Wrap Length', value: wrapLen() + ' in' + (lenFee() ? '  +$' + lenFee() : ' (shorter than standard)') });
    if (dragonFee() && it.lines) it.lines.push({ label: 'Dragon Scale', value: designOn().setup.axes + ' axis  +$' + dragonFee() });
    if (innerOn() && it.lines) { var ic = designOn().setup.inner || { pattern: 'cross' }; it.lines.push({ label: 'Pattern Between', value: (ic.pattern === 'cross' ? 'Cross' : ic.pattern === 'chevron' ? 'Chevron' : 'Diamond') + (ic.fillOn && ic.pattern !== 'chevron' ? ' with filler over it' : '') + '  +$' + innerFee() + ' (up to 2 new colors included)' }); }
    if (fillerOn() && it.lines) { var fn; try { fn = (dw().WL_THREADS.fullName || dw().WL_THREADS.name)(designOn().setup.fillC); } catch (e) {} it.lines.push({ label: 'Color Filler', value: (fn || designOn().setup.fillC || '') + (fillFee() ? '  +$' + fillFee() : '  (included with the pattern between)') }); }
    if (underOn() && it.lines) { var un; try { un = (dw().WL_THREADS.fullName || dw().WL_THREADS.name)(S.under.c); } catch (e) {} it.lines.push({ label: 'Underwrap', value: (un || S.under.c) + '  +$' + UNDER_FEE }); }
    if (!d) return it;
    var fee = call('supportExtraFee') || 0, extra = call('extraSupportCount') || 0, mets = d.colors.filter(function (c) { return c.uv; }).length, twists = d.colors.filter(function (c) { return c.twist; }).length;
    var notes = []; if (fee) notes.push('+$' + fee + ' for ' + extra + ' extra color' + (extra > 1 ? 's' : '')); if (mets) notes.push('+$' + mets * 10 + ' for ' + mets + ' Ultra-UV metallic' + (mets > 1 ? 's' : '')); if (twists) notes.push('+$' + twists * 10 + ' for ' + twists + ' Metallic Twist' + (twists > 1 ? 's' : ''));
    (it.lines || []).forEach(function (l) { if (l.label === 'Colors') l.value = 'Colors (from the wrap design): ' + d.colors.map(function (c, i) { return (i ? '' : 'Main: ') + c.name; }).join(', ') + (notes.length ? '  (' + notes.join(', ') + ')' : ''); });
    (it.buildStrip || []).forEach(function (b) { if (b.label === 'Colors') { b.name = d.colors.map(function (c) { return c.name; }).join(' / ');
      b.colors = d.colors.map(function (c, i) { return { label: i ? (i === 1 ? 'Supporting' : 'Supporting ' + i) : 'Main', hex: c.hex, name: c.name }; }); } });
    return it;
  };
  // start: the design from the cart (Edit), or the wrap already picked
  // the colors section loads once the 3D rod has its wrap, so the rod gets the computer to itself first (at most 10 s)
  if (dz) (function () { var t0 = Date.now(), go = function () {
      if (S.customDesign && S.customDesign.setup && S.customDesign.sfsw) toDesigner(S.wrapId, S.customDesign); else toDesigner(S.wrapId); };
    (function wait() { var f = stage && stage.querySelector('iframe'), inn = false; try { inn = f && f.contentWindow.__sfswHoldMain === false; } catch (e) {}
      if (inn || !f || Date.now() - t0 > 10000) go(); else setTimeout(wait, 150); })(); })();


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
  // put one ring of color m (w in long) right in the middle of the grip; if the middle ring is already EVA, just recolor it
  function rgCenter(r, m, w) {
    var L = rgLen(r), c = L / 2, a = 0;
    for (var i = 0; i < r.length; i++) { var b = a + r[i].t; if (c >= a - 1e-6 && c <= b + 1e-6 && rgIsEva(r[i].m) && Math.abs(r[i].t - w) < 1e-6) { r[i] = { m: m, t: r[i].t }; return r; } a = b; }
    var lo = Math.max(0, c - w / 2), hi = Math.min(L, c + w / 2), out = [], put = false; a = 0;
    r.forEach(function (x) { var b = a + x.t;
      if (b <= lo + 1e-6 || a >= hi - 1e-6) { if (a >= hi - 1e-6 && !put) { out.push({ m: m, t: hi - lo }); put = true; } out.push(x); }
      else { if (a < lo - 1e-6) out.push({ m: x.m, t: +(lo - a).toFixed(3) }); if (!put) { out.push({ m: m, t: +(hi - lo).toFixed(3) }); put = true; } if (b > hi + 1e-6) out.push({ m: x.m, t: +(b - hi).toFixed(3) }); }
      a = b; });
    if (!put) out.push({ m: m, t: hi - lo });
    return out;
  }
  // the pieces a change goes to: on split grips, every lit piece (tap a piece to light it or turn it off); otherwise the one picked
  var rgOnList = function () { return rgKeys().length === 3 && rgUi.on && rgUi.on.length ? rgUi.on : [rgUi.piece]; };
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
      rgUi = { piece: null, m: m0, t: 0.5, tab: kind, on: rgKeys().length === 3 ? rgKeys().map(function (k) { return k[0]; }) : null };   // split grips: all 3 pieces lit, so they match
    }
    if (!rgUi.m) { rgUi.m = kind === 'eva' ? 'eva:black' : 'burl'; rgUi.tab = kind; }
    if (!rgKeys().some(function (k) { return k[0] === rgUi.piece; })) rgUi.piece = rgKeys()[0][0];
    return S.gripRings;
  }
  function rgBuild() {
    rgEl = el('div', 'rb-rg');
    rgEl.innerHTML = '<div class="rb-rg-lbl rb-rg-pl">Grip to design</div><div class="rb-rg-top"><div class="rb-seg rb-big" data-k="piece"></div><div class="rb-rg-sz">Ring size <div class="rb-seg" data-k="size"><button type="button" data-v="0.25">0.25 in</button><button type="button" data-v="0.5">0.5 in</button></div></div>' +
      '<div class="rb-rg-stripbox"><div class="rb-rg-lbl"><b class="rb-rg-now"></b> · <span class="rb-rg-hint"></span></div><div class="rb-strip"></div>' +
      '<div class="rb-rg-row"><button type="button" class="rb-mini" data-a="add">Add ring</button><button type="button" class="rb-mini" data-a="del">Remove last ring</button><span class="rb-rg-len"></span></div></div></div>' +
'<div class="rb-rg-lbl"><span class="rb-rg-kind"></span>: <b class="rb-rg-name"></b></div><div class="rb-rg-tabs"><div class="rb-seg" data-k="tab"><button type="button" data-v="cork">Cork <span class="rb-tp">+$2.50 per 0.5 in added</span></button><button type="button" data-v="eva">EVA <span class="rb-tp">+$10 per color</span></button></div><span class="rb-rg-price"></span></div>' +
      '<div class="rb-chips"></div>';
    var rgSz = rgEl.querySelector('.rb-rg-sz'), rgTabs = rgEl.querySelector('.rb-rg-tabs'); if (rgSz && rgTabs) { rgSz.classList.add('rb-rg-sz2'); rgTabs.appendChild(rgSz); }   // Ring size sits to the right of the Cork/EVA row
    rgEl.addEventListener('click', function (e) {
      e.stopPropagation();
      var b = e.target.closest('button'); if (!b) return;
      var seg = b.closest('.rb-seg'), G = rgState(); if (!G) return;
      var cur = function () { return (G.g[rgUi.piece] || []).map(function (r) { return { m: r.m, t: r.t }; }); };
      var set = function (r) { rgOnList().forEach(function (k) { G.g[k] = JSON.parse(JSON.stringify(r)); }); changed(); };
      if (seg) { var k = seg.dataset.k, v = b.dataset.v;
        if (k === 'piece') { rgUi.sel = null;
          if (rgKeys().length === 3) { var on = (rgUi.on || []).slice(), at = on.indexOf(v);   // light a piece up, or turn it off (one always stays lit)
            if (at >= 0) { if (on.length > 1) on.splice(at, 1); } else on.push(v);
            rgUi.on = rgKeys().map(function (x) { return x[0]; }).filter(function (x) { return on.indexOf(x) >= 0; }); rgUi.piece = at >= 0 ? rgUi.on[0] : v; }
          else rgUi.piece = v; } else if (k === 'tab') rgUi.tab = v; else if (k === 'size') rgUi.t = +v;
        return rgRender(); }
      if (b.dataset.i != null) { var ti = +b.dataset.i; rgUi.sel = rgUi.sel === ti ? null : ti; return rgRender(); }   // pick a ring (tap again: back to the whole grip)
      if (b.dataset.m) { rgUi.m = b.dataset.m;
        if (rgUi.sel == null && RG_KIND[S.gripId] === 'cork') {   // custom cork grip, no ring picked: an EVA color goes in the center ring; a cork color fills the cork rings (EVA rings stay)
          if (rgIsEva(rgUi.m)) return set(rgCenter(cur(), rgUi.m, rgUi.t));
          return set(cur().map(function (x) { return { m: rgIsEva(x.m) ? x.m : rgUi.m, t: x.t }; })); }
        if (rgUi.sel == null) return set(cur().map(function (x) { return { m: rgUi.m, t: x.t }; }));   // no ring picked: the whole grip takes the color
        // a ring picked: just that ring takes the color (and the ring size), keeping the grip's length
        var r = cur(), i = Math.min(rgUi.sel, r.length - 1), old = r[i], t = rgUi.t;
        if (t < old.t) r.splice(i, 1, { m: rgUi.m, t: t }, { m: old.m, t: old.t - t });
        else if (t > old.t && r[i + 1]) { r[i] = { m: rgUi.m, t: t }; var nx = r[i + 1]; if (nx.t > t - old.t) nx.t -= t - old.t; else r.splice(i + 1, 1); }
        else r[i] = { m: rgUi.m, t: old.t };
        return set(r); }
      var a = b.dataset.a;
      if (a === 'add') { var r2 = cur(); if (rgLen(r2) + rgUi.t <= Math.min.apply(null, rgOnList().map(rgMax)) + 1e-6) { r2.push({ m: rgUi.m, t: rgUi.t }); set(r2); } }
      if (a === 'del') { var r3 = cur(); if (r3.length > 1) { r3.pop(); if (rgUi.sel != null && rgUi.sel >= r3.length) rgUi.sel = null; set(r3); } }
    });
    function changed() { rgRender(); call('renderGripPreview'); updateAll(); }
  }
  function rgPaint(host, rings, maxW, h) {   // a strip of rings, lit like a round grip (the rod's own textures when 3D is up)
    var len = rgLen(rings) || 1, ppi = Math.max(18, Math.min(160, (maxW - 2) / len));
    var wrap = el('div', 'rb-rings' + (rgReal ? '' : ' flat')); wrap.style.width = Math.round(len * ppi) + 'px'; if (h) wrap.style.height = h + 'px';
    if (rgReal && rod && rod.paintRings) { var cv = document.createElement('canvas'); wrap.appendChild(cv); try { rod.paintRings(cv, rings, ppi); } catch (e) {} }
    rings.forEach(function (r, i) { var b = el('button', null, ''); b.type = 'button'; b.dataset.i = i; b.title = rgName(r.m) + ', ' + r.t + ' in';
      b.style.width = (r.t * ppi) + 'px'; if (rgUi.sel === i) b.className = 'on'; if (!rgReal) b.style.backgroundImage = 'url("' + rgChip(r.m) + '")'; wrap.appendChild(b); });
    host.appendChild(wrap);
  }
  function rgRender() {
    if (!rgEl || !rgOn()) return; var G = rgState(); if (!G) return;
    var seg = function (k) { return rgEl.querySelector('.rb-seg[data-k="' + k + '"]'); };
    if (rgKeys().length === 3 && !rgUi.on) rgUi.on = rgKeys().map(function (k) { return k[0]; });
    if (rgKeys().length === 3 && rgUi.on.indexOf(rgUi.piece) < 0) rgUi.piece = rgUi.on[0];
    seg('piece').innerHTML = rgKeys().map(function (k) { return '<button type="button" data-v="' + k[0] + '" aria-pressed="' + (rgOnList().indexOf(k[0]) >= 0) + '">' + k[1] + '</button>'; }).join('');
    var evaOnly = RG_KIND[S.gripId] === 'eva';   // custom EVA grips are EVA rings only; custom cork grips can mix in EVA
    if (evaOnly) { rgUi.tab = 'eva'; if (!rgIsEva(rgUi.m)) rgUi.m = 'eva:black'; }
    seg('tab').style.display = evaOnly ? 'none' : '';
    rgEl.querySelector('.rb-rg-price').innerHTML = evaOnly ? '<b>+$10</b> for each additional color'
      : (rgUi.tab === 'eva' ? '<b>+$10</b> for each EVA color in the grip' : '<b>+$2.50</b> for every 0.5 in added past 2.5 in' + (S.gripRings && S.gripRings.g.full ? ' (fore grip)' : ''));
    [].forEach.call(seg('tab').children, function (b) { b.setAttribute('aria-pressed', b.dataset.v === rgUi.tab); });
    [].forEach.call(seg('size').children, function (b) { b.setAttribute('aria-pressed', +b.dataset.v === rgUi.t); });
    rgEl.querySelector('.rb-rg-kind').textContent = rgIsEva(rgUi.m) ? 'EVA' : 'Cork';
    rgEl.querySelector('.rb-rg-name').textContent = rgIsEva(rgUi.m) ? rgName(rgUi.m).slice(4) : rgName(rgUi.m);
    var list = rgUi.tab === 'eva' ? rgList.eva.map(function (x) { return 'eva:' + x[0]; }) : rgList.cork.map(function (x) { return x[0]; });
    rgEl.querySelector('.rb-chips').innerHTML = list.map(function (id) { return '<button type="button" data-m="' + id + '" aria-pressed="' + (id === rgUi.m) + '"><img src="' + rgChip(id) + '" alt="" loading="lazy"><span>' + (rgIsEva(id) ? rgName(id).slice(4) : rgName(id)) + '</span></button>'; }).join('');
    var rings = G.g[rgUi.piece] || [], strip = rgEl.querySelector('.rb-strip'); strip.innerHTML = '';
    rgPaint(strip, rings, strip.clientWidth || 600);
    var onL = rgOnList(), nm = function (k) { return (rgKeys().find(function (x) { return x[0] === k; }) || ['', 'Grip'])[1]; };
    var name = onL.length === 3 ? 'All 3 pieces' : onL.map(nm).join(' + ');
    rgEl.querySelector('.rb-rg-pl').innerHTML = rgKeys().length === 3 ? 'Grips to design <span style="text-transform:none;letter-spacing:0;font-weight:400">· lit pieces all get the same design · tap one to turn it off or back on</span>' : 'Grip to design';
    rgEl.querySelector('.rb-rg-now').textContent = name + ' · ' + rgLen(rings).toFixed(2) + ' in';
    rgEl.querySelector('.rb-rg-hint').textContent = rgUi.sel == null ? (RG_KIND[S.gripId] === 'cork' ? 'a cork color fills the grip · an EVA color goes in the center · tap a ring to color just that one' : 'a color fills the whole grip · tap a ring to color just that one') : 'ring ' + (rgUi.sel + 1) + ' picked · tap a color for it · tap the ring again for the whole grip';
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
  var _blanks = window.renderBlankCards, blOpen = {}, blShow = false;
  window.SFSW_blPick = function (id) { if (id === S.blankId && blShow) { blShow = false; call('renderBlankCards'); return; } blShow = true; if (id === S.blankId) call('renderBlankCards'); else call('pickBlank', id); };
  window.SFSW_blMore = function (id) { blOpen[id] = !blOpen[id]; call('renderBlankCards'); };
  if (typeof _blanks === 'function' && val('BLANKS')) window.renderBlankCards = function () {
    var host = $('blank-cards'); if (!host) return _blanks.apply(this, arguments);
    var B = val('BLANKS') || [], esc = function (t) { return String(t == null ? '' : t); };
    var price = function (b) { return '$' + b.price; };
    var cards = B.map(function (b) {
      var sel = b.id === S.blankId, v = sel ? b.variants[S.variantIdx] : null;
      var tight = (b.madeInUSA ? 1 : 0) + (b.name.length > 16 ? 1 : 0) + (b.name.length > 30 ? 1 : 0);   // fewer description lines when the name or badge takes room
      return '<div role="button" tabindex="0" class="rb-bl rb-t' + tight + (sel ? ' selected' : '') + (blOpen[b.id] ? ' open' : '') + '" data-id="' + b.id + '" onclick="SFSW_blPick(\'' + b.id + '\')">' +
        '<span class="rb-bl-name">' + esc(b.name) + '</span>' +
        (b.madeInUSA ? '<span class="rb-bl-usa">★ Made in USA</span>' : '') +
        (b.desc ? '<span class="rb-bl-desc">' + esc(b.desc) + '</span><button type="button" class="rb-bl-more" onclick="event.stopPropagation();SFSW_blMore(\'' + b.id + '\')">' + (blOpen[b.id] ? 'Show less' : 'Read more') + '</button>' : '') +
        '<span class="rb-bl-foot"><span class="rb-bl-len">' + (v ? esc(v.length) + ' · ' + esc(v.lineWt) : b.variants.length + ' length' + (b.variants.length > 1 ? 's' : '')) + '</span>' +
        '<span class="rb-bl-price">' + price(b) + '</span></span></div>';
    }).join('');
    var sb = B.find(function (b) { return b.id === S.blankId; }), rows = '';
    if (sb && blShow) rows = '<div class="rb-bl-var"><div class="rb-bl-var-h">' + esc(sb.name) + ' · pick the length and power</div>' +
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
    placeSeatOpts();
  };
  // the picked seat's colors (and soft-touch option) sit inside that seat's own card
  var seatOpts = null;
  function placeSeatOpts() {
    var card = document.querySelector('#seat-options .option-item.selected'); if (!card) return;
    if (!seatOpts) { seatOpts = el('div', 'rb-seat-opts'); seatOpts.addEventListener('click', function (e) { e.stopPropagation(); });
      [$('seat-color-block'), $('seat-softtouch-wrap')].forEach(function (x) { if (x) seatOpts.appendChild(x); }); }
    var home = card.querySelector('.option-item-body') || card; if (seatOpts.parentNode !== home) home.appendChild(seatOpts);
  }
  // the picked seat's picture follows its color
  var _seatPrev = window.renderSeatPreview;
  if (typeof _seatPrev === 'function') window.renderSeatPreview = function () {
    var r = _seatPrev.apply(this, arguments);
    var t = document.querySelector('.rb-seat-thumb[data-seat="' + S.seatId + '"] img'), src = call('seatPhotoSrc');
    if (t && src && t.getAttribute('src') !== src) { t.parentNode.style.visibility = ''; t.src = src; }
    placeSeatOpts(); return r;
  };
  call('renderSeats');

  // ───────────────────────── Trim rings: tick where they go ─────────────────────────
  // Full grips: one on the fore grip (tap the ring). Split grips: the fore grip (1) and/or between the split grips (2).
  // Each spot holds one kind of ring; the count and price follow from the ticks.
  function isSplitGrip() { var g = call('getGrip'); return !!g && g.style !== 'full'; }
  function trimLoc() {
    if (!S.trimLoc) { S.trimLoc = { fore: null, split: null }; var q = S.trimRingQty || {};   // from a saved cart item
      Object.keys(q).forEach(function (k) { var n = q[k] || 0; if (n % 2 && !S.trimLoc.fore) S.trimLoc.fore = k; if (n >= 2 && !S.trimLoc.split) S.trimLoc.split = k; }); }
    if (!isSplitGrip()) S.trimLoc.split = null;
    return S.trimLoc;
  }
  function syncTrimQty() { var TL = trimLoc(), q = S.trimRingQty || (S.trimRingQty = {});
    (val('TRIM_RINGS') || []).forEach(function (t) { q[t.id] = (TL.fore === t.id ? 1 : 0) + (TL.split === t.id ? 2 : 0); }); }
  window.SFSW_trim = function (id, spot) { var TL = trimLoc(); TL[spot] = TL[spot] === id ? null : id; syncTrimQty(); call('renderAccessories'); updateAll(); };
  function renderTrims() {
    var host = $('acc-trim-options'), T = val('TRIM_RINGS'), D = val('TRIM_COLOR_DEFS') || {}; if (!host || !T) return;
    var TL = trimLoc(), split = isSplitGrip(); syncTrimQty();
    host.innerHTML = T.map(function (t) {
      var on = TL.fore === t.id || TL.split === t.id, n = (TL.fore === t.id ? 1 : 0) + (TL.split === t.id ? 2 : 0), col = (S.trimRingColor || {})[t.id];
      var sw = (t.colors || []).map(function (cn) { var c = D[cn] || { name: cn, hex: '#666' };
        return '<div class="trim-swatch ' + (col === c.name ? 'active' : '') + '" style="background:' + c.hex + '" title="' + c.name + '" onclick="event.stopPropagation();pickTrimColor(\'' + t.id + '\',\'' + c.name + '\')"></div>'; }).join('');
      var spots = split ? '<div class="rb-trim-spots">' +
          '<button type="button" class="' + (TL.fore === t.id ? 'on' : '') + '" onclick="event.stopPropagation();SFSW_trim(\'' + t.id + '\',\'fore\')"><i></i>Fore grip</button>' +
          '<button type="button" class="' + (TL.split === t.id ? 'on' : '') + '" onclick="event.stopPropagation();SFSW_trim(\'' + t.id + '\',\'split\')"><i></i>Split grips</button></div>' : '';
      return '<div class="option-item has-thumb rb-trim ' + (on ? 'selected' : '') + '"' + (split ? '' : ' onclick="SFSW_trim(\'' + t.id + '\',\'fore\')"') + '>' +
        (t.photo ? '<div class="acc-thumb" onclick="event.stopPropagation();openLightbox(\'' + t.photo + '\',\'' + t.name + '\')"><img src="' + t.photo + '" alt="' + t.name + '" loading="lazy"></div>' : '') +
        '<div class="option-item-body"><span class="option-item-name">' + t.name + '</span>' + (t.desc ? '<span class="option-item-desc">' + t.desc + '</span>' : '') +
        '<div class="rb-trim-opts" onclick="event.stopPropagation()">' + spots + (sw ? '<div class="trim-color-row">' + sw + '</div><div class="trim-color-name">Color: ' + (col || '—') + '</div>' : '') + '</div></div>' +
        '<span class="option-item-price">' + (n ? '+$' + n * t.adder : '+$' + t.adder + (split ? ' each' : '')) + '</span></div>';
    }).join('');
  }
  var _acc = window.renderAccessories;
  if (typeof _acc === 'function') window.renderAccessories = function () { var r = _acc.apply(this, arguments); renderTrims(); return r; };
  var _grips2 = window.renderGrips;   // full grips can't have the split rings
  if (typeof _grips2 === 'function') window.renderGrips = function () { var r = _grips2.apply(this, arguments); var had = S.trimLoc && S.trimLoc.split; trimLoc(); syncTrimQty(); renderTrims(); if (had && !S.trimLoc.split) updateAll(); return r; };
  renderTrims();

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
          : (cols.length === 1 ? '<div class="rb-gd-row"><span class="rb-gd-k">Frame color</span><span class="rb-gd-sw"><button type="button" class="on" style="background:' + cols[0].hex + '"></button></span><span class="rb-gd-v">' + cols[0].name + ' only' + '</span></div>' : '');
        var tipHtml = ups.length ? '<div class="rb-gd-row"><span class="rb-gd-k">Upgrade the tip</span><span class="rb-gd-tips">' + ups.slice().sort(function (a, b) { return (fee[a] || 0) - (fee[b] || 0); }).map(function (k) {
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
