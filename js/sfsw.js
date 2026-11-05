// ── ROD CONFIGURATOR ENGINE ──

// ── Zoom gestures are intentionally left enabled ──
// This file used to preventDefault() gesturestart/gesturechange/gestureend and
// swallow the second tap of any double-tap, to force the site to 100% scale.
// That was removed on purpose:
//
//   * Pinch-to-zoom is an accessibility feature. iOS deliberately ignores
//     `user-scalable=no` in the viewport meta, and cancelling the gesture
//     events was the only thing still defeating it. Customers reading spec
//     tables and inspecting build photos on a phone need to zoom.
//   * The touchend blocker also ate legitimate double-taps, including
//     double-tap-to-enlarge on the custom cork patterns.
//
// Double-tap-to-ZOOM (the gesture that was misfiring on fast swatch taps) is
// still suppressed — but by `touch-action: manipulation` in global.css, which
// blocks that one gesture without touching pinch. Don't reintroduce the JS
// blockers here; the CSS already covers the actual problem.

const THREAD_COLORS = [
  {name:'Midnight Blue', hex:'#1a3a6b'},
  {name:'Teal', hex:'#0e7c72'},
  {name:'Silver', hex:'#9aa0a8'},
  {name:'Crimson', hex:'#b02a24'},
  {name:'Black', hex:'#1c1c1e'},
  {name:'Gold', hex:'#c9941a'},
  {name:'White', hex:'#ddd9d0'},
  {name:'Lime', hex:'#4a8c1c'},
  {name:'Orange', hex:'#d4621a'},
  {name:'Purple', hex:'#5a3498'},
  {name:'Chartreuse', hex:'#a8b800'},
  {name:'Pink', hex:'#c0446a'},
];

const TRIM_COLORS = [
  {name:'Gold', hex:'#c9941a'},
  {name:'Silver', hex:'#9aa0a8'},
  {name:'Black', hex:'#1c1c1e'},
  {name:'Crimson', hex:'#b02a24'},
  {name:'White', hex:'#ddd9d0'},
  {name:'None', hex:'none'},
];

// ── WRAP_COLORS: Thread color palette ──
const WRAP_COLORS = [
  // White & Black
  {name:'White',        hex:'#f0ede5', photo:'../preview/thread/white-black-thread.png'},
  {name:'Black',        hex:'#1a1a1a', photo:'../preview/thread/white-black-thread.png'},
  // Grey
  {name:'Forged Steel', hex:'#8a8d92', photo:'../preview/thread/grey-thread.png'},
  {name:'Silver Smoke', hex:'#b0b4b8', photo:'../preview/thread/grey-thread.png'},
  {name:'Ghost Grey',   hex:'#6a6d72', photo:'../preview/thread/grey-thread.png'},
  {name:'Iron Ore',     hex:'#3a3d42', photo:'../preview/thread/grey-thread.png'},
  // Blue
  {name:'Teal',         hex:'#1aaba0', photo:'../preview/thread/blue-thread.png'},
  {name:'Maui Surf',    hex:'#2a90c8', photo:'../preview/thread/blue-thread.png'},
  {name:'Denim',        hex:'#2a5a8a', photo:'../preview/thread/blue-thread.png'},
  {name:'Navy',         hex:'#1a3a72', photo:'../preview/thread/blue-thread.png'},
  {name:'Cobalt',       hex:'#0a2a60', photo:'../preview/thread/blue-thread.png'},
  {name:'Blue Marlin',  hex:'#0a1828', photo:'../preview/thread/blue-thread.png'},
  // Green
  {name:'Cool Mint',    hex:'#a0d8a8', photo:'../preview/thread/green-thread.png'},
  {name:'Neon Green',   hex:'#50d840', photo:'../preview/thread/green-thread.png'},
  {name:'Kiwi',         hex:'#90c030', photo:'../preview/thread/green-thread.png'},
  {name:'Rainforest',   hex:'#2a8040', photo:'../preview/thread/green-thread.png'},
  {name:'Guacamole',    hex:'#708028', photo:'../preview/thread/green-thread.png'},
  {name:'Fern',         hex:'#3a6828', photo:'../preview/thread/green-thread.png'},
  {name:'Oak Leaf',     hex:'#2a4818', photo:'../preview/thread/green-thread.png'},
  {name:'Evergreen',    hex:'#102810', photo:'../preview/thread/green-thread.png'},
  // Yellow
  {name:'Neon Yellow',  hex:'#e8e820', photo:'../preview/thread/yellow-thread.png'},
  {name:'Yellowfin',    hex:'#d4c020', photo:'../preview/thread/yellow-thread.png'},
  {name:'Taxi-Cab',     hex:'#e8b000', photo:'../preview/thread/yellow-thread.png'},
  // Orange
  {name:'Goldfish',     hex:'#f0a040', photo:'../preview/thread/orange - thread.png'},
  {name:'Sunset',       hex:'#f07830', photo:'../preview/thread/orange - thread.png'},
  {name:'Burnt Orange', hex:'#d05820', photo:'../preview/thread/orange - thread.png'},
  {name:'Tangerine',    hex:'#c84818', photo:'../preview/thread/orange - thread.png'},
  {name:'Copper',       hex:'#a04010', photo:'../preview/thread/orange - thread.png'},
  // Pink
  {name:'Bubblegum',    hex:'#f0a0c0', photo:'../preview/thread/pink - thread.png'},
  {name:'Fuchsia',      hex:'#d83888', photo:'../preview/thread/pink - thread.png'},
  {name:'Neon Pink',    hex:'#ff2070', photo:'../preview/thread/pink - thread.png'},
  {name:'Rose',         hex:'#a01848', photo:'../preview/thread/pink - thread.png'},
  // Red
  {name:'Redfish',      hex:'#e84040', photo:'../preview/thread/red-thread.png'},
  {name:'Fire Red',     hex:'#c82020', photo:'../preview/thread/red-thread.png'},
  {name:'Mars Red',     hex:'#a81818', photo:'../preview/thread/red-thread.png'},
  {name:'Burgundy',     hex:'#781828', photo:'../preview/thread/red-thread.png'},
  {name:'Merlot',       hex:'#4a0e18', photo:'../preview/thread/red-thread.png'},
  // Purple
  {name:'Orchid',       hex:'#d070c0', photo:'../preview/thread/purple.png'},
  {name:'Lilac',        hex:'#b860c8', photo:'../preview/thread/purple.png'},
  {name:'Violet',       hex:'#7838c0', photo:'../preview/thread/purple.png'},
  {name:'Light Grape',  hex:'#5828a0', photo:'../preview/thread/purple.png'},
  {name:'Grape',        hex:'#381268', photo:'../preview/thread/purple.png'},
  // Metallic 1
  {name:'Teal',         hex:'#1aaba0', group:'metallic', metallic:true, photo:'../preview/thread/Metallic-1-thread.png'},
  {name:'Light Blue',   hex:'#6ab8e8', group:'metallic', metallic:true, photo:'../preview/thread/Metallic-1-thread.png'},
  {name:'Blue',         hex:'#2a5a8a', group:'metallic', metallic:true, photo:'../preview/thread/Metallic-1-thread.png'},
  {name:'Light Green',  hex:'#70c870', group:'metallic', metallic:true, photo:'../preview/thread/Metallic-1-thread.png'},
  {name:'Green',        hex:'#2a8040', group:'metallic', metallic:true, photo:'../preview/thread/Metallic-1-thread.png'},
  {name:'Dark Green',   hex:'#0f3820', group:'metallic', metallic:true, photo:'../preview/thread/Metallic-1-thread.png'},
  {name:'Light Pink',   hex:'#f0b0c8', group:'metallic', metallic:true, photo:'../preview/thread/Metallic-1-thread.png'},
  {name:'Pink',         hex:'#d83888', group:'metallic', metallic:true, photo:'../preview/thread/Metallic-1-thread.png'},
  {name:'Lavender',     hex:'#c090e0', group:'metallic', metallic:true, photo:'../preview/thread/Metallic-1-thread.png'},
  {name:'Purple',       hex:'#7838c0', group:'metallic', metallic:true, photo:'../preview/thread/Metallic-1-thread.png'},
  // Metallic 2
  {name:'Silver',       hex:'#c0c4c8', group:'metallic', metallic:true, photo:'../preview/thread/Metallic-2-thread.png'},
  {name:'Gunmetal',     hex:'#4a5058', group:'metallic', metallic:true, photo:'../preview/thread/Metallic-2-thread.png'},
  {name:'Copper',       hex:'#b86030', group:'metallic', metallic:true, photo:'../preview/thread/Metallic-2-thread.png'},
  {name:'Red',          hex:'#c82020', group:'metallic', metallic:true, photo:'../preview/thread/Metallic-2-thread.png'},
  {name:'Light Gold',   hex:'#d4b040', group:'metallic', metallic:true, photo:'../preview/thread/Metallic-2-thread.png'},
  {name:'Gold',         hex:'#c9941a', group:'metallic', metallic:true, photo:'../preview/thread/Metallic-2-thread.png'},
  {name:'Yellow Gold',  hex:'#e8c820', group:'metallic', metallic:true, photo:'../preview/thread/Metallic-2-thread.png'},
  // UV Resistant Metallic (+$10 each)
  {name:'Teal',         hex:'#1aaba0', group:'uv-metallic', metallic:true, adder:10, photo:'../preview/thread/UV-Resistant-Metallic-thread.png'},
  {name:'Light Blue',   hex:'#6ab8e8', group:'uv-metallic', metallic:true, adder:10, photo:'../preview/thread/UV-Resistant-Metallic-thread.png'},
  {name:'Blue',         hex:'#2a5a8a', group:'uv-metallic', metallic:true, adder:10, photo:'../preview/thread/UV-Resistant-Metallic-thread.png'},
  {name:'Light Green',  hex:'#70c870', group:'uv-metallic', metallic:true, adder:10, photo:'../preview/thread/UV-Resistant-Metallic-thread.png'},
  {name:'Green',        hex:'#2a8040', group:'uv-metallic', metallic:true, adder:10, photo:'../preview/thread/UV-Resistant-Metallic-thread.png'},
  {name:'Purple',       hex:'#7838c0', group:'uv-metallic', metallic:true, adder:10, photo:'../preview/thread/UV-Resistant-Metallic-thread.png'},
  {name:'Light Gold',   hex:'#d4b040', group:'uv-metallic', metallic:true, adder:10, photo:'../preview/thread/UV-Resistant-Metallic-thread.png'},
  {name:'Gold',         hex:'#c9941a', group:'uv-metallic', metallic:true, adder:10, photo:'../preview/thread/UV-Resistant-Metallic-thread.png'},
  {name:'Copper',       hex:'#b86030', group:'uv-metallic', metallic:true, adder:10, photo:'../preview/thread/UV-Resistant-Metallic-thread.png'},
  {name:'Red',          hex:'#c82020', group:'uv-metallic', metallic:true, adder:10, photo:'../preview/thread/UV-Resistant-Metallic-thread.png'},
];

function buildSwatches(containerId, colors, selectedIdx, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const hasPhotos = colors.some(c => c.photo);
  const hasGroups = colors.some(c => c.group);
  const row = container.closest('.wrap-color-row') || container.parentElement;

  // ── Photo preview + color name (injected above the container) ──
  if (row) {
    let previewWrap = row.querySelector('.thread-photo-preview-wrap');
    if (!previewWrap) {
      previewWrap = document.createElement('div');
      previewWrap.className = 'thread-photo-preview-wrap';
      const img = document.createElement('img');
      img.className = 'thread-photo-preview';
      previewWrap.appendChild(img);
      container.before(previewWrap);
    }
    let nameEl = row.querySelector('.thread-color-name');
    if (!nameEl) {
      nameEl = document.createElement('div');
      nameEl.className = 'thread-color-name';
      container.before(nameEl);
    }
    const sel = colors[selectedIdx];
    if (sel) { nameEl.textContent = sel.name; nameEl.style.display = 'block'; }
    if (hasPhotos && sel) {
      const preview = previewWrap.querySelector('.thread-photo-preview');
      if (sel.photo) { preview.src = sel.photo; preview.alt = sel.name; previewWrap.style.display = 'flex'; }
      else { previewWrap.style.display = 'none'; }
    }
  }

  // ── Swatch factory ──
  function makeSwatch(col, globalIdx) {
    const d = document.createElement('div');
    d.className = 'swatch' + (globalIdx === selectedIdx ? ' active' : '') + (col.metallic ? ' metallic' : '');
    d.title = col.name;
    d.style.touchAction = 'manipulation';
    if (col.hex === 'none') { d.setAttribute('data-none', ''); }
    else if (col.metallic) { d.style.background = `linear-gradient(135deg, ${col.hex} 0%, #ffffff44 40%, ${col.hex} 55%, #00000033 100%), ${col.hex}`; }
    else { d.style.background = col.hex; }
    d.addEventListener('click', () => {
      const r = container.closest('.wrap-color-row') || container.parentElement;
      if (r) {
        const ne = r.querySelector('.thread-color-name');
        if (ne) ne.textContent = col.name;
        if (hasPhotos) {
          const pw = r.querySelector('.thread-photo-preview-wrap');
          const pv = pw && pw.querySelector('.thread-photo-preview');
          if (pw && pv) {
            if (col.photo) { pv.src = col.photo; pv.alt = col.name; pw.style.display = 'flex'; }
            else { pw.style.display = 'none'; }
          }
        }
      }
      // Defer the heavier state update + full re-render to the next frame.
      // onSelect() typically triggers a full rebuild of this entire swatch
      // grid (all groups, all nodes) — if that runs synchronously inside
      // this click handler, the swatch the user just tapped gets destroyed
      // and replaced by a new DOM node before the browser has finished
      // processing the tap. On iOS that mid-gesture DOM swap is what was
      // causing taps to misfire as a double-tap-zoom and the page to jump.
      requestAnimationFrame(() => onSelect(globalIdx));
    });
    return d;
  }

  container.innerHTML = '';

  if (!hasGroups) {
    // Flat rendering (trim colors, etc.)
    colors.forEach((col, i) => container.appendChild(makeSwatch(col, i)));
    return;
  }

  // ── Sectioned rendering for WRAP_COLORS ──
  [
    { key: null,          label: null,                    priceLabel: null },
    { key: 'metallic',    label: 'Metallic',              priceLabel: null },
    { key: 'uv-metallic', label: 'Ultra-UV Resistant Metallic', priceLabel: '+$10' },
  ].forEach(({ key, label, priceLabel }) => {
    const subset = colors
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => key === null ? !c.group : c.group === key);
    if (!subset.length) return;

    if (label) {
      const lbl = document.createElement('div');
      lbl.className = 'wrap-color-section-label';
      lbl.innerHTML = label + (priceLabel ? ` <span class="wrap-color-section-price">${priceLabel}</span>` : '');
      container.appendChild(lbl);
    }

    const grid = document.createElement('div');
    grid.className = 'swatch-grid';
    subset.forEach(({ c, i }) => grid.appendChild(makeSwatch(c, i)));
    container.appendChild(grid);
  });
}

// UV metallic price adder — call in each page's calcTotal
function calcUVMetallicFee(colors, mainIdx, supportIdxs) {
  return [mainIdx, ...(supportIdxs || [])].reduce((sum, idx) =>
    sum + (idx >= 0 && colors[idx] && colors[idx].group === 'uv-metallic' ? 10 : 0), 0);
}

// Display name for a thread color in spec summaries — flags Metallic / UV Resistant Metallic
function colorSpecLabel(color) {
  if (!color) return '';
  if (color.group === 'uv-metallic') return `UV Resistant Metallic (${color.name})`;
  if (color.group === 'metallic') return `Metallic (${color.name})`;
  return color.name;
}

function drawRod(svgId, config) {
  const svg = document.getElementById(svgId);
  if (!svg) return;

  const {
    rodType = 'spinning',
    power = 'ML',
    action = 'Fast',
    handleMat = 'cork',
    threadColor = '#1a3a6b',
    trimColor = '#c9941a',
    guideStyle = 'standard',
    length = "7'0\""
  } = config;

  const powerTaper = {UL:0.88,L:0.82,ML:0.76,M:0.70,MH:0.64,H:0.58}[power] || 0.72;
  const guideCount = {UL:6,L:6,ML:7,M:8,MH:8,H:9}[power] || 7;
  const bendAmt = {'X-Fast':7, Fast:14, 'Mod-Fast':22, Moderate:30}[action] || 14;

  const hColors = {cork:'#b8996a', eva:'#2a2a2a', hypalon:'#222', 'cork-tape':'#a88558'};
  const hCol = hColors[handleMat] || '#b8996a';
  const hAccent = handleMat === 'cork' || handleMat === 'cork-tape' ? '#c8a87a' : '#333';

  const W = 640, H = 120;
  const rodMidY = 62;
  const rodStart = 30;
  const rodEnd = 620;

  const isFly = rodType === 'fly';
  const handleLen = isFly ? 130 : 90;
  const butt = rodStart;
  const grip1End = butt + handleLen;
  const seatLen = isFly ? 24 : 30;
  const seatX = grip1End;
  const grip2Start = seatX + seatLen;
  const grip2Len = isFly ? 60 : 32;
  const grip2End = grip2Start + grip2Len;
  const blankStart = grip2End + 6;
  const blankEnd = rodEnd;
  const blankLen = blankEnd - blankStart;

  const blankY = (x) => {
    const t = (x - blankStart) / blankLen;
    return rodMidY - bendAmt * Math.pow(t, 2.2);
  };

  const blankThick = (x) => {
    const t = (x - blankStart) / blankLen;
    return Math.max(0.6, 4.5 - t * 4.5 * powerTaper);
  };

  // Build blank path
  let pathD = `M ${blankStart} ${rodMidY}`;
  for (let i = 1; i <= 60; i++) {
    const x = blankStart + (i / 60) * blankLen;
    pathD += ` L ${x.toFixed(1)} ${blankY(x).toFixed(1)}`;
  }

  const guides = [];
  for (let i = 0; i < guideCount; i++) {
    const t = (i + 1) / (guideCount + 1.5);
    const gx = blankStart + t * blankLen;
    const gy = blankY(gx);
    const gh = Math.max(3, 11 - i * 1.1);
    guides.push({x: gx, y: gy, h: gh});
  }

  let out = `<defs>
    <marker id="a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>`;

  // Butt cap
  out += `<ellipse cx="${butt+4}" cy="${rodMidY}" rx="6" ry="9" fill="${hCol}"/>`;
  out += `<ellipse cx="${butt+4}" cy="${rodMidY}" rx="4" ry="7" fill="${hAccent}" opacity="0.5"/>`;

  // Grip 1
  out += `<rect x="${butt+8}" y="${rodMidY-7}" width="${handleLen-10}" height="14" rx="5" fill="${hCol}"/>`;
  // Cork texture lines
  if (handleMat === 'cork' || handleMat === 'cork-tape') {
    for (let cx = butt+18; cx < grip1End - 10; cx += 14) {
      out += `<line x1="${cx}" y1="${rodMidY-6}" x2="${cx}" y2="${rodMidY+6}" stroke="#c8b080" stroke-width="0.5" opacity="0.4"/>`;
    }
  }

  // Reel seat
  out += `<rect x="${seatX}" y="${rodMidY-8}" width="${seatLen}" height="16" rx="3" fill="#3a3a3a"/>`;
  out += `<rect x="${seatX+5}" y="${rodMidY-10}" width="${seatLen-10}" height="20" rx="2" fill="#2a2a2a"/>`;
  out += `<rect x="${seatX+7}" y="${rodMidY-9}" width="${seatLen-14}" height="18" rx="2" fill="#222"/>`;

  // Grip 2
  out += `<rect x="${grip2Start}" y="${rodMidY-5}" width="${grip2Len}" height="10" rx="4" fill="${hCol}" opacity="0.9"/>`;

  // Blank shadow layer
  out += `<path d="${pathD}" fill="none" stroke="#0a0e12" stroke-width="${blankThick(blankStart) + 2}" stroke-linecap="round" opacity="0.6"/>`;

  // Blank main body - gradient effect using two paths
  out += `<path d="${pathD}" fill="none" stroke="#2c3a44" stroke-width="${blankThick(blankStart)}" stroke-linecap="round"/>`;
  out += `<path d="${pathD}" fill="none" stroke="#3d5060" stroke-width="${blankThick(blankStart) * 0.4}" stroke-linecap="round" stroke-dasharray="none"/>`;

  // Thread wraps
  guides.forEach(g => {
    const bY = blankY(g.x);
    const tw = blankThick(g.x);
    out += `<rect x="${g.x - 2}" y="${bY - tw - 1}" width="4" height="${tw * 2 + 2}" rx="1" fill="${threadColor}"/>`;
    if (trimColor !== 'none') {
      out += `<rect x="${g.x - 3.5}" y="${bY - tw - 2}" width="2" height="${tw * 2 + 4}" rx="1" fill="${trimColor}" opacity="0.85"/>`;
    }
  });

  // Guides
  guides.forEach((g, i) => {
    const bY = blankY(g.x);
    const tw = blankThick(g.x);
    const ringR = g.h * 0.62;

    // Guide foot
    out += `<line x1="${g.x}" y1="${bY - tw}" x2="${g.x}" y2="${bY - g.h}" stroke="${threadColor}" stroke-width="1.2"/>`;
    // Guide ring
    out += `<circle cx="${g.x}" cy="${bY - g.h - ringR}" r="${ringR}" fill="none" stroke="${threadColor}" stroke-width="1.4"/>`;
    // Insert ring (lighter inner)
    out += `<circle cx="${g.x}" cy="${bY - g.h - ringR}" r="${ringR * 0.6}" fill="none" stroke="#8aaab8" stroke-width="0.8" opacity="0.6"/>`;
  });

  // Tip top
  const tipX = blankEnd;
  const tipY2 = blankY(tipX);
  out += `<line x1="${tipX - 4}" y1="${tipY2}" x2="${tipX}" y2="${tipY2 - 4}" stroke="${threadColor}" stroke-width="1"/>`;
  out += `<circle cx="${tipX}" cy="${tipY2 - 4}" r="2.5" fill="none" stroke="${threadColor}" stroke-width="1.2"/>`;

  // Labels
  const labelY = H - 6;
  out += `<text x="${butt + handleLen/2}" y="${labelY}" text-anchor="middle" font-size="9" fill="#4a6070" font-family="Barlow,sans-serif">Handle</text>`;
  out += `<text x="${(blankStart + blankEnd)/2}" y="${labelY}" text-anchor="middle" font-size="9" fill="#4a6070" font-family="Barlow,sans-serif">Blank · ${guideCount} guides</text>`;

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = out;
}

// ── NAV BUILDER ──
function buildNav(activePage) {
  const rodLinks = [
    {href:'../pages/finesse.html',            label:'Finesse'},
    {href:'../pages/inshore-spinning.html',   label:'Inshore Spinning'},
    {href:'../pages/heavy-inshore.html',       label:'Heavy Inshore Spinning'},
    {href:'../pages/saltwater-baitcaster.html',label:'Saltwater Baitcaster'},
    {href:'../pages/offshore-spinning.html',  label:'Offshore Spinning'},
    {href:'../pages/bottom-conventional.html',label:'Bottom Fishing - Conventional'},
    {href:'../pages/live-bait-conventional.html',label:'Live Bait / Kingfish - Conventional'},
    {href:'../pages/pier-conventional.html',   label:'Pier Conventional'},
    {href:'../pages/pier-spinning.html', label:'Pier Spinning - 8\'8 - 9\'0"'},
    {href:'../pages/trolling.html',            label:'Trolling'},
    {href:'../pages/high-speed-trolling.html', label:'High Speed Trolling'},
  ];
  const isRodPage = rodLinks.some(r => r.label === activePage);

  const stockLinks = [
    {href:'../pages/stock-inshore-spinning.html',      label:'Inshore Spinning'},
    {href:'../pages/stock-heavy-inshore-spinning.html', label:'Heavy Inshore Spinning'},
    {href:'../pages/stock-saltwater-baitcaster.html',  label:'Saltwater Baitcaster'},
    {href:'../pages/stock-boat-conventional.html',     label:'Boat Conventional'},
    {href:'../pages/stock-pier-conventional.html',     label:'Pier Conventional'},
  ];
  const isStockPage = stockLinks.some(r => r.label === activePage);

  // Top promo banner — hides itself automatically after NAV_PROMO_UNTIL.
  const NAV_PROMO_UNTIL = '2026-11-30T23:59:59';
  const navPromo = Date.now() <= new Date(NAV_PROMO_UNTIL).getTime()
    ? `<div class="promo-banner"><strong>50% OFF</strong> Rod Wraps + <strong>FREE</strong> Snowflake &amp; 2 Axis Cross Wraps — use code <span class="promo-code">50WRAPS</span> at checkout — November only</div>`
    : '';
  const html = `${navPromo}
  <nav class="nav">
    <a href="../index.html" class="nav-logo">
      <span class="nav-logo-main">SFSW</span>
      <span class="nav-logo-sub">South Florida Saltwater</span>
    </a>
    <ul class="nav-links">
      <li><a href="../index.html" ${activePage==='Home'?'class="active"':''}>Home</a></li>
      <li><a href="../pages/builds.html" ${activePage==='Builds'?'class="active"':''}>Builds</a></li>
      <li class="nav-dropdown">
        <a href="#" onclick="toggleNavDropdown(event)" class="${isStockPage?'active':''}" style="display:flex;align-items:center;gap:4px">
          Rods <span style="font-size:10px;opacity:.6">▾</span>
        </a>
        <ul class="nav-dropdown-menu">
          ${stockLinks.map(r=>`<li><a href="${r.href}" class="${r.label===activePage?'active-rod':''}">${r.label}</a></li>`).join('')}
        </ul>
      </li>
      <li class="nav-dropdown">
        <a href="#" onclick="toggleNavDropdown(event)" class="${isRodPage?'active':''}" style="display:flex;align-items:center;gap:4px">
          Customs <span style="font-size:10px;opacity:.6">▾</span>
        </a>
        <ul class="nav-dropdown-menu">
          ${rodLinks.map(r=>`<li><a href="${r.href}" class="${r.label===activePage?'active-rod':''}">${r.label}</a></li>`).join('')}
        </ul>
      </li>
      <li><a href="../pages/process.html" ${activePage==='The Process'?'class="active"':''}>The Process</a></li>
      <li><a href="../pages/contact.html" ${activePage==='Contact'?'class="active"':''}>Contact</a></li>
    </ul>
    <a onclick="window.location.href=window.location.pathname.includes('/pages/')?'checkout.html':'pages/checkout.html'" style="position:relative;display:flex;align-items:center;cursor:pointer;color:#8a9ab0;text-decoration:none;padding:4px 8px;margin-right:4px;transition:color .15s;" onmouseover="this.style.color='#c9941a'" onmouseout="this.style.color='#8a9ab0'" title="Cart">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      <span id="cart-badge" style="display:none;position:absolute;top:-4px;right:0;background:#c9941a;color:#0d0f11;font-size:10px;font-weight:700;min-width:16px;height:16px;border-radius:8px;align-items:center;justify-content:center;padding:0 3px;line-height:1">0</span>
    </a>
    <button class="nav-mobile-toggle" onclick="toggleMobileNav()">☰</button>
  </nav>
  <div id="mobile-nav" style="display:none;position:fixed;inset:0;background:rgba(10,14,18,.97);z-index:200;flex-direction:column;align-items:center;justify-content:center;gap:1.25rem;overflow-y:auto;padding:2rem">
    <button onclick="toggleMobileNav()" style="position:fixed;top:1.5rem;right:2rem;background:none;border:none;color:#e8e4dc;font-size:24px;cursor:pointer;">✕</button>
    <a href="../index.html" onclick="toggleMobileNav()" style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#e8e4dc;text-decoration:none">Home</a>
    <a href="../pages/builds.html" onclick="toggleMobileNav()" style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#e8e4dc;text-decoration:none">Builds</a>
    <button onclick="toggleMobileDropdown(event,'mobile-stock-list','mobile-stock-chevron')" id="mobile-stock-toggle" style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:8px;font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#c9941a;padding:4px 0">
      Rods <span id="mobile-stock-chevron" style="font-size:14px;transition:transform .2s">▾</span>
    </button>
    <div id="mobile-stock-list" style="display:none;flex-direction:column;align-items:center;gap:1.25rem">
      ${stockLinks.map(r=>`<a href="${r.href}" onclick="toggleMobileNav()" style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#e8e4dc;text-decoration:none">${r.label}</a>`).join('')}
    </div>
    <button onclick="toggleMobileDropdown(event,'mobile-rods-list','mobile-rods-chevron')" id="mobile-rods-toggle" style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:8px;font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#c9941a;padding:4px 0">
      Customs <span id="mobile-rods-chevron" style="font-size:14px;transition:transform .2s">▾</span>
    </button>
    <div id="mobile-rods-list" style="display:none;flex-direction:column;align-items:center;gap:1.25rem">
      ${rodLinks.map(r=>`<a href="${r.href}" onclick="toggleMobileNav()" style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#e8e4dc;text-decoration:none">${r.label}</a>`).join('')}
    </div>
    <div style="border-top:1px solid rgba(255,255,255,.08);width:80%;margin:.5rem 0"></div>
    <a href="../pages/process.html" onclick="toggleMobileNav()" style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#e8e4dc;text-decoration:none">The Process</a>
    <a href="../pages/contact.html" onclick="toggleMobileNav()" style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#e8e4dc;text-decoration:none">Contact</a>
    <div style="border-top:1px solid rgba(255,255,255,.08);width:80%;margin:.5rem 0"></div>
    <a onclick="toggleMobileNav();window.location.href=window.location.pathname.includes('/pages/')?'checkout.html':'pages/checkout.html'" style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#c9941a;text-decoration:none;cursor:pointer;display:flex;align-items:center;gap:8px">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      Cart <span id="cart-badge-mobile" style="background:#c9941a;color:#0d0f11;font-size:11px;font-weight:700;padding:1px 6px;border-radius:8px;display:none">0</span>
    </a>
  </div>
  `;
  setTimeout(updateCartBadge, 0);
  return html;
}

function toggleNavDropdown(e) {
  e.preventDefault();
  e.stopPropagation();
  const dd = e.currentTarget.closest('.nav-dropdown');
  if (dd) dd.classList.toggle('open');
}

// Close dropdown when clicking anywhere outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.nav-dropdown')) {
    document.querySelectorAll('.nav-dropdown.open').forEach(d => d.classList.remove('open'));
  }
});

function toggleMobileNav() {
  const mn = document.getElementById('mobile-nav');
  if (mn) mn.style.display = mn.style.display === 'none' ? 'flex' : 'none';
}

function toggleMobileDropdown(e, listId, chevronId) {
  if (e) e.preventDefault();
  const list = document.getElementById(listId);
  const chevron = document.getElementById(chevronId);
  if (!list) return;
  const isOpen = list.style.display === 'flex';
  list.style.display = isOpen ? 'none' : 'flex';
  if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

function buildFooter() {
  return `<footer class="footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:20px;letter-spacing:0.1em;color:#e8e4dc;">SFSW</div>
        <p>Handcrafted custom fishing rods engineered for the unique demands of South Florida's saltwater fishery</p>
        <div style="margin-top:1.25rem;font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#c9941a;">Boca Raton, Florida</div>
        <div style="margin-top:1rem;display:flex;gap:14px;align-items:center;">
          <a href="https://www.instagram.com/sfsaltwater/" target="_blank" rel="noopener" aria-label="Instagram" style="color:#8a9ab0;transition:color .15s;display:inline-flex;" onmouseover="this.style.color='#c9941a'" onmouseout="this.style.color='#8a9ab0'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
          </a>
          <a href="https://www.tiktok.com/@sfsaltwater" target="_blank" rel="noopener" aria-label="TikTok" style="color:#8a9ab0;transition:color .15s;display:inline-flex;" onmouseover="this.style.color='#c9941a'" onmouseout="this.style.color='#8a9ab0'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>
          </a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Customs</h4>
        <ul>
          <li><a href="finesse.html">Finesse</a></li>
          <li><a href="inshore-spinning.html">Inshore Spinning</a></li>
          <li><a href="heavy-inshore.html">Heavy Inshore Spinning</a></li>
          <li><a href="saltwater-baitcaster.html">Saltwater Baitcaster</a></li>
          <li><a href="offshore-spinning.html">Offshore Spinning</a></li>
          <li><a href="bottom-conventional.html">Bottom Fishing - Conventional</a></li>
          <li><a href="live-bait-conventional.html">Live Bait / Kingfish - Conv.</a></li>
          <li><a href="pier-conventional.html">Pier Conventional</a></li>
          <li><a href="pier-spinning.html">Pier Spinning - 8'8 - 9'0"</a></li>
          <li><a href="trolling.html">Trolling</a></li>
          <li><a href="high-speed-trolling.html">High Speed Trolling</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Info</h4>
        <ul>
          <li><a href="process.html">Build Process</a></li>
          <li><a href="warranty.html">Warranty</a></li>
          <li><a href="terms.html">Terms &amp; Conditions</a></li>
          <li><a href="privacy.html">Privacy Policy</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Contact</h4>
        <ul>
          <li><a href="contact.html">Contact Us</a></li>
          <li><a href="sms:+15618130004">(561) 813-0004</a></li>
          <li><a href="mailto:sfloridasw@gmail.com">sfloridasw@gmail.com</a></li>
          <li style="color:#4a5a6a;font-size:13px;margin-top:0.5rem;">Current Lead Time: 3–5 weeks</li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2025 South Florida Saltwater. All rights reserved.</span>
    </div>
  </footer>`;
}

// ── CART HELPERS ──
function getCart() {
  return JSON.parse(localStorage.getItem('sfswCart') || '[]');
}

function addToCart(item) {
  const cart = getCart();
  cart.push(Object.assign({ id: Date.now() }, item));
  localStorage.setItem('sfswCart', JSON.stringify(cart));
}

function removeFromCart(id) {
  const cart = getCart().filter(item => item.id !== id);
  localStorage.setItem('sfswCart', JSON.stringify(cart));
}

function updateCartBadge() {
  const count = getCart().length;
  ['cart-badge', 'cart-badge-mobile'].forEach(badgeId => {
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  });
}

// ── CONFIGURATOR BASE CLASS ──
class RodConfigurator {
  constructor(options) {
    this.svgId = options.svgId || 'rod-svg';
    this.summaryId = options.summaryId || 'summary';
    this.priceId = options.priceId || 'price-display';
    this.basePrice = options.basePrice || 249;
    this.rodType = options.rodType || 'spinning';
    this.selectedThread = 0;
    this.selectedTrim = 0;
    this.addonPrices = options.addonPrices || {};
  }

  getFieldVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  getFieldText(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    const opt = el.selectedOptions && el.selectedOptions[0];
    return opt ? opt.text.split(' — ')[0] : el.value;
  }

  getAddonPrice(id) {
    const el = document.getElementById(id);
    if (!el || !el.selectedOptions || !el.selectedOptions[0]) return 0;
    const dp = el.selectedOptions[0].dataset.price;
    return dp ? parseInt(dp) : 0;
  }

  calcPrice() {
    let p = this.basePrice;
    Object.keys(this.addonPrices).forEach(id => {
      p += this.getAddonPrice(id);
    });
    return p;
  }

  buildThreadSwatches() {
    buildSwatches('thread-swatches', THREAD_COLORS, this.selectedThread, (i) => {
      this.selectedThread = i;
      this.update();
    });
  }

  buildTrimSwatches() {
    buildSwatches('trim-swatches', TRIM_COLORS, this.selectedTrim, (i) => {
      this.selectedTrim = i;
      this.update();
    });
  }

  renderRod() {
    drawRod(this.svgId, {
      rodType: this.rodType,
      power: this.getFieldVal('sel-power'),
      action: this.getFieldVal('sel-action'),
      handleMat: this.getFieldVal('sel-handle'),
      threadColor: THREAD_COLORS[this.selectedThread].hex,
      trimColor: TRIM_COLORS[this.selectedTrim].hex,
      length: this.getFieldVal('sel-length'),
    });
  }

  renderSummary(rows) {
    const price = this.calcPrice();
    const summaryEl = document.getElementById(this.summaryId);
    const priceEl = document.getElementById(this.priceId);

    if (summaryEl) {
      summaryEl.innerHTML = rows.map(([l, v]) =>
        `<div class="summary-line"><span class="sl-label">${l}</span><span class="sl-val">${v}</span></div>`
      ).join('');
    }

    if (priceEl) {
      priceEl.textContent = '$' + price.toLocaleString();
    }
  }

  update() {
    this.buildThreadSwatches();
    this.buildTrimSwatches();
    this.renderRod();
  }

  initStripeCheckout(btnId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const price = this.calcPrice();
      alert(`Order submitted!\n\nWe'll follow up within 24 hours to confirm your build details and collect payment.\n\nEstimated total: $${price}\nCurrent Lead Time: 3–5 weeks\n\nThank you for choosing SFSW!`);
    });
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   SWIPE NAVIGATION FOR PHOTO CAROUSELS
   Lets a horizontal finger swipe do what the ‹ › buttons already do.

   Rather than reimplement paging per carousel, a swipe just clicks the
   carousel's existing prev/next button. All the state, animation, dot and
   counter logic keeps living in one place, so this can't drift out of sync
   with the buttons.

   Listeners are delegated off `document` because the configurator rebuilds
   its photo panels with innerHTML constantly — anything bound directly to a
   container would be discarded on the next render.
   ────────────────────────────────────────────────────────────────────────── */
(function initSwipeNav() {
  const TARGETS = [
    // Homepage build slideshow
    { container: '#build-slideshow', prev: '#build-slideshow-prev', next: '#build-slideshow-next' },
    // Builds page photo carousels
    { container: '.carousel',        prev: '.carousel-btn.prev',    next: '.carousel-btn.next'    },
    // Configurator rod-wrap and split-wrap photo viewers
    { container: '.wrap-photo-wrap', prev: '.wrap-nav-prev',        next: '.wrap-nav-next'        },
  ];

  const MIN_DISTANCE  = 45;   // px of travel before it counts as a swipe
  const OFF_AXIS_MAX  = 0.6;  // |dy| must stay under 60% of |dx|, else it's a scroll
  const MAX_DURATION  = 800;  // ms; slower than this is a drag, not a swipe
  const CLICK_GRACE   = 500;  // ms to suppress the tap that trails a swipe

  let startX = 0, startY = 0, startT = 0;
  let pending = null;
  let lastSwipeAt = 0;

  function findTarget(el) {
    if (!el || !el.closest) return null;
    for (const t of TARGETS) {
      const container = el.closest(t.container);
      if (container) return { container, conf: t };
    }
    return null;
  }

  document.addEventListener('touchstart', e => {
    pending = null;
    if (e.touches.length !== 1) return;          // pinch/zoom — leave it alone
    const hit = findTarget(e.target);
    if (!hit) return;
    pending = hit;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startT = Date.now();
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const hit = pending;
    pending = null;
    if (!hit || !hit.container.isConnected) return;

    const touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (Date.now() - startT > MAX_DURATION) return;
    if (Math.abs(dx) < MIN_DISTANCE) return;
    if (Math.abs(dy) > Math.abs(dx) * OFF_AXIS_MAX) return;   // vertical scroll

    const btn = hit.container.querySelector(dx < 0 ? hit.conf.next : hit.conf.prev);
    if (!btn || btn.disabled || btn.classList.contains('hidden')) return;

    lastSwipeAt = Date.now();
    btn.click();
  }, { passive: true });

  // A swipe across a build card would otherwise register as a tap and fire the
  // card's onclick (which navigates to the build detail page). Swallow the real
  // click that trails a swipe. Our own btn.click() above is synthetic, so
  // isTrusted is false and it passes through untouched.
  document.addEventListener('click', e => {
    if (!e.isTrusted) return;
    if (Date.now() - lastSwipeAt > CLICK_GRACE) return;
    if (!findTarget(e.target)) return;
    e.stopPropagation();
    e.preventDefault();
  }, true);
})();

/* ──────────────────────────────────────────────────────────────────────────
   PROMO BANNER
   Injected at the top of every page that loads this file, so promos live in
   one place instead of being pasted into 37 HTML files.

   To change or retire the promo: edit PROMO_BANNER below. Bumping `id` makes
   the banner reappear for people who previously dismissed the old one.
   ────────────────────────────────────────────────────────────────────────── */
const PROMO_BANNER = {
  id: 'sept-2026-wraps-and-2rod',           // change this to re-show after a dismissal
  until: '2026-09-01T23:59:59',             // hides itself automatically after this
  html: 'Until 09/01/2026: $50 off Upgraded Wraps (Code: <strong>SFRW50</strong>), '
      + '$100 off if you purchase 2 Rods (Code: <strong>SFSW2100</strong>)'
};

(function initPromoBanner() {
  function show() {
    if (!PROMO_BANNER || !document.body) return;

    // Expired promos never render, so a stale offer can't linger if it's forgotten.
    const until = new Date(PROMO_BANNER.until);
    if (!isNaN(until) && Date.now() > until.getTime()) return;

    const key = 'sfsw-promo-dismissed-' + PROMO_BANNER.id;
    try { if (localStorage.getItem(key) === '1') return; } catch (e) { /* private mode */ }

    if (document.querySelector('.promo-banner')) return;   // guard against double-init

    const bar = document.createElement('div');
    bar.className = 'promo-banner';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Current promotions');
    bar.innerHTML = PROMO_BANNER.html +
      '<button type="button" class="promo-banner-close" aria-label="Dismiss promotion">&times;</button>';

    bar.querySelector('.promo-banner-close').addEventListener('click', () => {
      bar.remove();
      try { localStorage.setItem(key, '1'); } catch (e) { /* private mode: dismiss for this page only */ }
    });

    document.body.insertBefore(bar, document.body.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', show);
  } else {
    show();
  }
})();

// ── Site analytics (see js/analytics.js) ──
(function loadAnalytics() {
  try {
    var me = document.currentScript && document.currentScript.src;
    var s = document.createElement('script');
    s.src = me ? me.replace(/sfsw\.js(\?.*)?$/, 'analytics.js') : '/js/analytics.js';
    s.async = true;
    document.head.appendChild(s);
  } catch (e) {}
})();
