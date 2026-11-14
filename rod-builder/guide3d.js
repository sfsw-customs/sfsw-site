// The 3D guides shared by the Rod Builder and the Guide Wrap Designer: the guide list, Fuji size charts,
// the guide models and the guide-wrap mesh. Units are inches; the rod runs along X with the guide's center at 0.
import * as THREE from 'three';
const IN = 25.4;
const SS = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const metal = (c, rough = 0.3) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.85, roughness: rough });
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const R_KL = ['Alconite','SiC','Titanium Torzite'];
export const GUIDES = {
  spinning: [
    {id:'klh',name:'Fuji KL-H',sub:'High frame',slug:'fuji-klh',colors:['Grey','Silver'],rings:R_KL,style:'single',model:'KL'},
    {id:'kl',name:'Fuji KL',sub:'Standard frame',slug:'fuji-k',colors:['Grey','Silver'],rings:['Alconite','SiC'],style:'single',low:true,model:'KL'},
    {id:'if',name:'ALPS IF',sub:'Stainless',slug:'alps-if',colors:['Black','Silver'],rings:['IF'],style:'single',model:'KL',iff:true},
    {id:'tihf',name:'AT TiForged',sub:'High frame titanium',slug:'ti-forged-high-frame',colors:['Black','Silver'],rings:['TiForged'],style:'single',model:'KL'},
    {id:'kw',name:'Fuji KW',sub:'Heavy / offshore',slug:'fuji-kw',colors:['Gunmetal','Silver'],rings:['Alconite','SiC','Titanium SiC','Titanium Torzite'],style:'double',model:'KW'},
    {id:'tidf',name:'AT TiForged',sub:'Double foot titanium',slug:'tiforged-double-foot',colors:['Black'],rings:['TiForged'],style:'double',model:'KW'}],
  baitcaster: [
    {id:'mc',name:'Fuji MC',sub:'Compact casting frame',slug:'fuji-mc',colors:['Shiny Dark Grey','Gunmetal','Silver','Gold'],rings:['Alconite','SiC','24K Gold & SiC'],style:'double',model:'MC'},
    {id:'mn',name:'Fuji MN',sub:'Casting frame',slug:'fuji-mn',colors:['Shiny Dark Grey','Gunmetal','Silver'],rings:['Alconite','SiC'],style:'double',model:'MN',mn:true},
    {id:'kw',name:'Fuji KW',sub:'Casting',slug:'fuji-kw',colors:['Gunmetal','Silver'],rings:['Alconite','SiC','Titanium SiC','Titanium Torzite'],style:'double',model:'KW'}],
  conventional: [
    {id:'xn',name:'ALPS XN',sub:'Conventional',slug:'alps-xn',colors:['Black','Silver'],rings:['XN','Titanium XN'],style:'double',model:'HB',mn:true,thin:true},
    {id:'mc',name:'Fuji MC',sub:'Conventional',slug:'fuji-mc',colors:['Shiny Dark Grey','Gunmetal','Silver','Gold'],rings:['Alconite','SiN','SiC','Ion Plated 24K Gold SiC'],style:'double',model:'MC'},
    {id:'mn',name:'Fuji MN',sub:'Conventional',slug:'fuji-mn',colors:['Shiny Dark Grey','Gunmetal','Silver'],rings:['Alconite','SiC'],style:'double',model:'MN',mn:true},
    {id:'turbo',name:'ALPS Turbo',sub:'Conventional',slug:'alps-turbo',colors:['Black'],rings:['Turbo'],style:'double',model:'HB',plate:true},
    {id:'hxn',name:'ALPS HXN',sub:'Heavy conventional',slug:'alps-hxn',colors:['Black','Silver'],rings:['HXN','Titanium HXN'],style:'double',model:'HB',heavy:true,mn:true,wide:true},
    {id:'hb',name:'Fuji HB',sub:'Heavy boat',slug:'fuji-hb',colors:['Silver','Gunmetal'],rings:['SiN','SiC'],style:'double',model:'HB',heavy:true,mn:true,wide:true},
    {id:'foul',name:'Foulproof',sub:'Roller-free foulproof',slug:'foulproof-guide',colors:['Silver'],rings:['Foulproof'],style:'double',model:'MN',heavy:true}]
};
export const isTi = r => /titanium|tiforged/i.test(r);
// Fuji size charts (mm): [size, height, butt foot, tip foot, overall length], same tables as the Guide Wrap Designer
export const CH = {
  KW:[[5,7.3,5,4.5,16.9],[5.5,7.6,5.1,4.7,17.7],[6,8.7,5.3,4.8,20],[7,10.3,5.6,5,20.9],[8,12.3,6,5.9,25.2],[10,15,7.2,6.6,29.3],[12,18.3,8.5,8,34.7],[16,24.5,10.5,9.5,42.5],[20,31,12.5,11.5,52],[25,39,15,13.5,63],[30,49,18,16,75]],
  MC:[[5.5,8.5,4.4,4.4,15.6],[6,9.3,4.6,4.6,16.8],[7,10.9,5,5,19],[8,13.4,5.7,5.7,22.2],[10,16.2,7.2,7.2,27.4],[12,19.4,8.6,8.6,32.2],[16,24.3,10.1,10.1,38.7],[20,32.5,12,12,49],[25,43.1,14,14,59.3]],
  HB:[[6,10,5.6,5,21],[7,11.6,6,5.2,23.4],[8,13.3,6.7,5.7,26.3],[10,16.8,8.1,7.8,33],[12,20.8,9.9,9.5,41.5],[16,26.4,12.1,10.7,51],[20,34,16,15.1,63],[25,47.8,20.5,18.8,80]],
  MN:[[6,9,6,4.5,17.5],[7,10,6.5,4.8,19],[8,11.5,7,5,20.9],[10,14.6,8.3,6.5,26.8],[12,17.3,9,7.9,28.5],[16,22,10,8.9,36],[20,30.2,11.3,10.5,46.2],[25,39.3,15,12.5,58.2],[30,49.8,18,15.5,68.9],[40,62.1,21,18.5,84]],
  KL:[[5.5,9.5,6.2,0,10.5],[6,10.3,6.6,0,11.4],[7,11.8,7.4,0,12.8],[8,13.5,8.4,0,14.6],[10,16.5,10.2,0,18],[12,19.7,12.2,0,23.6],[16,26.2,14,0,28.3],[20,33.5,16,0,35],[25,44,19,0,42.9],[30,60.5,20.5,0,53.8]]};
// Fuji KL-H (high frame) stripping guides, and the Fuji KT runners that finish a KL or KL-H train (sizes 10 and under): [size, height, foot, 0, overall]
CH.KLH = [[8,26.8,13.5,0,24],[10,30.2,16,0,28.6],[12,31.8,17,0,29],[16,43.3,18,0,35.4],[20,50.8,20,0,37.5],[25,55.9,22,0,43.4]];
CH.KT = [[5,6.5,6.1,0,9.6],[5.5,7.3,6.6,0,10.6],[6,8.2,7,0,11.3],[7,9.2,7.4,0,12.2],[8,11.1,9,0,15.1],[10,14.5,10,0,17.7]];
// the chart row for one guide in a rod's train: KL and KL-H runners (10 and under) are Fuji KTs
// ALPS IF (from ALPS: item length and height, in mm); the foot is taken as half the length until there's a chart for it
CH.IF = [[8,13.2,3.3,0,6.6],[10,16.3,3.7,0,7.4],[12,21.3,5.3,0,10.7],[16,29.0,6.6,0,13.2],[20,36.1,7.8,0,15.7],[25,47.8,9.2,0,18.5],[30,63.2,11.6,0,23.1]];
export const chartFor = (g, size) => g.id === 'if' ? chart('IF', size) : (g.id === 'kl' || g.id === 'klh') && size <= 10 ? chart('KT', size) : g.id === 'klh' ? chart('KLH', size) : chart(g.model, size);
export const chart = (model, size) => CH[model].reduce((a, b) => Math.abs(b[0] - size) < Math.abs(a[0] - size) ? b : a);
// opts.ti: titanium frame (a little duller); opts.dims: [height, butt foot, tip foot, overall] in mm, to use exact chart rows
export function guideModel(g, size, colHex, ringHex, opts = {}) {
  const grp = new THREE.Group(), [Hm, L1c, L2c, Ltc] = opts.dims || chartFor(g, size).slice(1), s = 1 / IN;
  const LK = g.id === 'foul' ? 2 : 1, L1 = L1c * LK, L2 = L2c * LK, Lt = Ltc * LK;   // the Foulproof is a long guide: twice the chart's spread
  const H = Hm * s * (g.low ? 0.86 : 1), od = size * s, id = od * 0.7, ringY = H - od / 2;
  const fm = metal(colHex, opts.ti ? 0.45 : 0.28), wire = Math.max(0.018, od * 0.07);
  const insert = new THREE.Mesh(new THREE.TorusGeometry((od + id) / 4, (od - id) / 4, 16, 48), new THREE.MeshStandardMaterial({ color: ringHex, metalness: 0.25, roughness: 0.15 }));
  const band = new THREE.Mesh(new THREE.TorusGeometry(od / 2 + wire * 0.35, wire * 0.55, 10, 48), fm);
  [insert, band].forEach(m => { m.rotation.y = Math.PI / 2; m.position.set(0, ringY, 0); grp.add(m); });
  // a flat strap along a path (like the MC's stamped frame): wide across, thin through, its flat face turned outward
  // from the guide's center line
  const strap = (pts, w, t, yc, sd) => { const cv = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), n = 60, pos = [], idx = [];
    for (let i = 0; i <= n; i++) { const u = i / n, P = cv.getPointAt(u), T = cv.getTangentAt(u);
      let O = new THREE.Vector3(0, 0.35 * (P.y - yc), P.z + sd * 0.04); O.addScaledVector(T, -O.dot(T)).normalize();
      const W = new THREE.Vector3().crossVectors(T, O).normalize();
      [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([a, c]) => { const q = P.clone().addScaledVector(W, a * w / 2).addScaledVector(O, c * t / 2); pos.push(q.x, q.y, q.z); }); }
    for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) { const a = i * 4 + k, b2 = i * 4 + (k + 1) % 4, c = a + 4, d = b2 + 4; idx.push(a, c, b2, b2, c, d); }
    idx.push(0, 1, 2, 0, 2, 3); const e = n * 4; idx.push(e, e + 2, e + 1, e, e + 3, e + 2);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, fm); grp.add(m); return m; };
  const tube = (pts, r = wire * 0.5) => grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 64, r, 10), fm));
  const spans = [];   // where each foot lies along the rod, so the guide wrap can cover it
  // a foot: flat on the blank, filed thin toward its toe (the end away from the guide's center) so the thread ramps over it
  const foot = (x0, x1) => { const lo = Math.min(x0, x1), hi = Math.max(x0, x1), toe = Math.abs(lo) > Math.abs(hi) ? lo : hi; spans.push([lo, hi, toe]);
    const g = new THREE.BoxGeometry(hi - lo, 0.016, Math.max(0.045, od * 0.12), 12, 1, 1), pa = g.attributes.position, cx = (lo + hi) / 2;
    for (let i = 0; i < pa.count; i++) if (pa.getY(i) > 0) { const t = Math.min(1, Math.max(0.08, Math.abs(pa.getX(i) + cx - toe) / 0.09)); pa.setY(i, -0.008 + 0.016 * t); }
    g.computeVertexNormals(); const m = new THREE.Mesh(g, fm); m.position.set(cx, 0.008, 0); grp.add(m); };
  const low = ringY - od / 2, side = a => [Math.sin(a) * od * 0.5, ringY - Math.cos(a) * od * 0.5];   // a point on the ring, a radians off the bottom
  // the frame splits into an A from each foot: one wire up each side of the ring (as in the KW video)
  const legs = (hx, lean) => [-1, 1].forEach(sd => { const [zz, yy] = side(0.75); tube([[hx, 0.02, sd * 0.012], [hx + (lean - hx) * 0.45, yy * 0.5, sd * zz * 0.55], [lean, yy, sd * zz]]); });
  if (g.plate) {
    // ALPS Turbo, from Brett's photos: a stamped plate in the ring's plane holds the ring (wide around it with a flat top,
    // narrowing into a neck down to the front foot); from the top of the plate two flat ribbons leave together, spread
    // wide around the outside (the oval seen from the butt) and meet again at the back foot
    const a = -Lt * s / 2, b = Lt * s / 2, h0 = a + L1 * s, h1 = b - L2 * s; foot(a, h0); foot(h1, b);
    const cx = h1 + 0.005, cy = ringY, R1 = od * 0.5 + Math.max(0.03, od * 0.13), top = cy + R1 * 0.95, nw = Math.max(0.035, od * 0.14), pd = Math.max(0.02, od * 0.045);
    const sh = new THREE.Shape();
    // outline in (z, y): neck at the foot, flaring up into the round shoulders, flat across the top
    sh.moveTo(-nw / 2, 0.01); sh.lineTo(nw / 2, 0.01);
    sh.bezierCurveTo(nw / 2, cy - R1 * 1.2, R1 * 0.9, cy - R1 * 0.9, R1, cy - R1 * 0.1);
    sh.bezierCurveTo(R1 * 1.04, cy + R1 * 0.55, R1 * 0.8, top, R1 * 0.45, top);
    sh.lineTo(-R1 * 0.45, top);
    sh.bezierCurveTo(-R1 * 0.8, top, -R1 * 1.04, cy + R1 * 0.55, -R1, cy - R1 * 0.1);
    sh.bezierCurveTo(-R1 * 0.9, cy - R1 * 0.9, -nw / 2, cy - R1 * 1.2, -nw / 2, 0.01);
    const hole = new THREE.Path(); hole.absarc(0, cy, od / 2 + 0.002, 0, Math.PI * 2, true); sh.holes.push(hole);
    const pg = new THREE.ExtrudeGeometry(sh, { depth: pd, bevelEnabled: true, bevelThickness: pd * 0.25, bevelSize: pd * 0.25, bevelSegments: 2, curveSegments: 32 });
    pg.translate(0, 0, -pd / 2); const plate = new THREE.Mesh(pg, fm); plate.rotation.y = Math.PI / 2; plate.position.x = cx; grp.add(plate);
    insert.position.set(cx, cy, 0); insert.rotation.set(0, Math.PI / 2, 0); grp.remove(band);
    // the back ribbons
    const sw = Math.max(0.045, od * 0.16), stt = Math.max(0.013, od * 0.038), ze = R1 * 0.35, zb = R1 * 1.25;
    [-1, 1].forEach(sd => { const pts = [];
      for (let i = 0; i <= 14; i++) { const t = i / 14, u = 1 - t;
        const z = sd * (u < 0.55 ? 0.018 + (zb - 0.018) * Math.sin(Math.PI / 2 * u / 0.55) : zb + (ze - zb) * SS(0.55, 1, u));
        pts.push([cx - pd + (h0 - 0.01 - cx + pd) * t, top + (0.012 - top) * t + 0.12 * top * Math.sin(Math.PI * t), z]); }
      strap(pts, sw, stt, top * 0.5, sd); });
    grp.userData = { feet: [a, b] };
  } else if (g.iff) {
    // ALPS IF, from the photos: one flat frame in the ring's plane. A short stem off the foot (with an oval slot) splits
    // into two curved arms that wrap into a band around the ring, leaving an open space under the ring.
    // shape options (window.__ifOpt lets a preview try variations)
    // Brett picked A3: legs bowed out like a bulb around a rounded opening, long slot in the stem, thin band
    const O = Object.assign({ aL: 1.24, aR: -0.24, d: 0.1, stem: 0.24, neck: 0.36, oc: [-0.75, 0.66], ocR: [0.75, 0.66], ic: [-0.64, 0.48], icR: [0.64, 0.48], slot: 1.25, band: 0.08 }, window.__ifOpt || {});
    const f0 = -L1 * s, lean = 0.42, Hc = H * 1.05 - od / 2, fw = Math.max(0.03, od * O.band), Ro = od / 2 + fw, ws = Math.max(0.05, od * 0.2), vs = Hc * O.stem;
    foot(f0, 0);
    const P2 = a => [Ro * Math.cos(a * Math.PI), Hc + Ro * Math.sin(a * Math.PI)];
    const sh = new THREE.Shape(), pl = P2(O.aL), pr = P2(O.aR);
    // outer edge: up the stem, out along the left arm, over the top of the ring band, down the right arm
    sh.moveTo(-ws / 2, 0); sh.lineTo(-ws / 2, vs);
    sh.quadraticCurveTo(O.oc[0] * Ro, vs + (pl[1] - vs) * O.oc[1], pl[0], pl[1]);
    sh.absarc(0, Hc, Ro, O.aL * Math.PI, O.aR * Math.PI + 2 * Math.PI, true);
    sh.quadraticCurveTo(O.ocR[0] * Ro, vs + (pr[1] - vs) * O.ocR[1], ws / 2, vs);
    sh.lineTo(ws / 2, 0); sh.closePath();
    const hole = new THREE.Path(); hole.absarc(0, Hc, od / 2 - 0.004, 0, Math.PI * 2, true); sh.holes.push(hole);
    // the opening under the ring: from the neck, up the inside of each arm, along the bottom of the band
    const yN = Hc * O.neck, il = P2(O.aL + O.d), ir = P2(O.aR - O.d);
    if (il[1] > yN + 0.03) { const o = new THREE.Path(); o.moveTo(0, yN);
      o.quadraticCurveTo(O.ic[0] * Ro, yN + (il[1] - yN) * O.ic[1], il[0], il[1]);
      o.absarc(0, Hc, Ro - 0.0005, (O.aL + O.d) * Math.PI, (O.aR - O.d) * Math.PI + 2 * Math.PI, false);
      o.quadraticCurveTo(O.icR[0] * Ro, yN + (ir[1] - yN) * O.icR[1], 0, yN); sh.holes.push(o); }
    // long slot in the stem, like a tuning fork at the foot
    const slot = new THREE.Path(); slot.absellipse(0, vs * O.slot * 0.55, ws * 0.2, vs * O.slot * 0.42, 0, Math.PI * 2, true); sh.holes.push(slot);
    const depth = Math.max(0.035, od * 0.07), geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 32 });
    geo.translate(0, 0, -depth / 2);
    const plate = new THREE.Mesh(geo, fm); plate.rotation.set(0, Math.PI / 2, 0); plate.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), -lean); plate.position.set(0, 0.01, 0); grp.add(plate);
    insert.position.set(Hc * Math.sin(lean), 0.01 + Hc * Math.cos(lean), 0); insert.quaternion.copy(plate.quaternion); grp.remove(band);
    grp.userData = { feet: [f0, 0] };
  } else if (g.style === 'single') {
    // single foot, from the photos: the foot points to the butt; from its heel one leg rises toward the tip at a low
    // angle and opens into a teardrop frame that holds the ring, tilted well toward the tip
        // KL and KL-H lean at the same angle; the KL-H frame is just stretched longer along that same line
    const stretch = g.low ? 1 : 1.3, f0 = -L1 * s, heel = 0, tilt = 0.62, r = od / 2 + wire * 0.35;
    foot(f0, heel);
    const cx = H * 0.5 * stretch, cy = ringY * 0.86 * stretch;
    [insert, band].forEach(m => { m.position.set(cx, cy, 0); m.rotation.set(0, Math.PI / 2, 0); m.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), -tilt); });
    const bx = cx - r * Math.sin(tilt), by = cy - r * Math.cos(tilt);
    [-1, 1].forEach(sd => tube([[heel - 0.02, 0.02, sd * 0.006], [heel + (bx - heel) * 0.5, by * 0.45, sd * r * 0.25], [bx + (cx - bx) * 0.3, by + (cy - by) * 0.4, sd * r * 0.8], [cx, cy, sd * r]]));
    grp.userData = { feet: [f0, heel] };
  } else if (g.id === 'foul') {
    // Foulproof (wire guide), from Brett's photos: one continuous round wire, no separate ring. It runs up from the back
    // foot to the left side of the eye, coils around to form it, and drops straight down to the front foot.
    const a = -Lt * s / 2, b = Lt * s / 2, h0 = a + L1 * s, h1 = b - L2 * s, fw = Math.max(0.022, od * 0.075), r = od / 2 + fw / 2;
    foot(a, h0); foot(h1, b); grp.remove(insert); grp.remove(band);
    // the arm from the back foot runs to the left side of the eye (the foot stays centered), then coils from there
    const t0 = -0.95, t1 = 3 * Math.PI, turns = (t1 - t0) / (Math.PI * 2), pitch = fw * 1.0, cx0 = h1 - pitch * turns / 2, cy = ringY, pts = [];
    const ys = cy + r * Math.cos(t0), zs = r * Math.sin(t0);
    pts.push([h0 - 0.01, 0.02, 0], [h0 + (cx0 - h0) * 0.35, ys * 0.38, zs * 0.4], [h0 + (cx0 - h0) * 0.7, ys * 0.76, zs * 0.8], [cx0 - r * 0.12, ys * 0.98, zs * 1.02]);
    for (let i = 0; i <= 44; i++) { const t = t0 + i / 44 * (t1 - t0); pts.push([cx0 + pitch * (t - t0) / (Math.PI * 2), cy + r * Math.cos(t), r * Math.sin(t)]); }
    const xe = cx0 + pitch * turns; pts.push([xe + 0.004, (cy - r) * 0.5, 0], [h1 + 0.006, 0.02, 0]);
    grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 240, fw, 12), fm));
    grp.userData = { feet: [a, b] };
  } else if (g.mn) {
    // Fuji MN, ALPS HXN, Fuji HB and ALPS XN (same frame; HXN and HB in wider straps, XN in thinner wire), from Brett's photos (side, end-on and top-down). Same A family as the MC, but:
    //  - front: one narrow strap straight up from the short front foot to the bottom of the ring
    //  - back: two straps leave the ring at its widest sides, bow outward a little, and come together in a V down at
    //    the long back foot (seen end-on, a teardrop around the ring; from above, a V from the ring's sides to that foot)
    const a = -Lt * s / 2, b = Lt * s / 2, h0 = a + L1 * s, h1 = b - L2 * s, tilt = 0.04, r = od / 2 + wire * 0.35;
    foot(a, h0); foot(h1, b);
    const cx = h1 + 0.005, cy = ringY, Ht = cy + r, sw = Math.max(0.04, od * 0.14) * (g.thin ? 0.6 : g.wide ? 1.45 : 1), stt = Math.max(0.013, od * 0.038) * (g.thin ? 1.3 : 1);   // XN: narrower, rounder wire
    [insert, band].forEach(m => { m.position.set(cx, cy, 0); m.rotation.set(0, Math.PI / 2, 0); m.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), -tilt); });
    const on = (ang, sd) => [cx - r * Math.cos(ang) * Math.sin(tilt), cy - r * Math.cos(ang) * Math.cos(tilt), sd * r * Math.sin(ang)];
    // front strap: a single post, a little wider at the foot
    const e0 = on(0, 1); strap([[h1 + 0.01, 0.012, 0], [h1 + (e0[0] - h1) * 0.5, e0[1] * 0.5, 0], [e0[0], e0[1], 0]], sw * 0.9, stt, cy, 1);
    // back straps: from the ring's sides back and down to the long foot's heel
    [-1, 1].forEach(sd => { const e = on(2.2, sd), pts = [e];
      for (let i = 1; i <= 12; i++) { const t = i / 12, u = 1 - t, ze = Math.abs(e[2]), zb = 1.0 * r, zf = 0.018;
        // widest up by the ring, tapering evenly down to the foot
        const z = sd * (u < 0.75 ? zf + (zb - zf) * Math.sin(Math.PI / 2 * u / 0.75) : zb + (ze - zb) * SS(0.75, 1, u));
        pts.push([e[0] + (h0 - 0.01 - e[0]) * t, e[1] + (0.012 - e[1]) * t + 0.05 * Ht * Math.sin(Math.PI * t), z]); }
      strap(pts, sw, stt, cy * 0.6, sd); });
    grp.userData = { feet: [a, b] };
  } else if (g.model === 'MC') {
    // Fuji MC, from Brett's color-coded photo, his mock-up and the Fuji drawing. Flat stamped straps throughout.
    //  - the ring stands upright over the front foot
    //  - front legs: two short straps from the front foot's heel up to the ring's lower sides (one post from the side)
    //  - back legs: from near the top of the ring they sweep back and out, bowing well outside the ring, then come
    //    together down at the back foot's heel (the wide teardrop from the butt; the slope from the side)
    const a = -Lt * s / 2, b = Lt * s / 2, h0 = a + L1 * s, h1 = b - L2 * s, tilt = 0.03, r = od / 2 + wire * 0.35;
    foot(a, h0); foot(h1, b);
    const cx = h1 + 0.005, cy = ringY, Ht = cy + r, sw = Math.max(0.045, od * 0.16), stt = Math.max(0.014, od * 0.04);
    [insert, band].forEach(m => { m.position.set(cx, cy, 0); m.rotation.set(0, Math.PI / 2, 0); m.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), -tilt); });
    const on = (ang, sd) => [cx - r * Math.cos(ang) * Math.sin(tilt), cy - r * Math.cos(ang) * Math.cos(tilt), sd * r * Math.sin(ang)];
    // front legs
    // they split right at the foot in a rounded V and flare out to the ring
    [-1, 1].forEach(sd => { const e = on(0.75, sd); strap([[h1 + 0.01, 0.012, sd * 0.02], [h1 + (e[0] - h1) * 0.15, e[1] * 0.12, sd * Math.abs(e[2]) * 0.38], [h1 + (e[0] - h1) * 0.5, e[1] * 0.48, sd * Math.abs(e[2]) * 0.8], e], sw * 0.8, stt, cy, sd); });
    // back legs
    [-1, 1].forEach(sd => { const e = on(2.6, sd), pts = [e];
      for (let i = 1; i <= 12; i++) { const t = i / 12;
        // open right from the foot: a rounded V that flares wide fast, then eases in to where they meet the ring
        const u = 1 - t, zf = 0.02, zb = 1.0 * r, ze = Math.abs(e[2]);
        const z = sd * (u < 0.4 ? zf + (zb - zf) * Math.sin(Math.PI / 2 * u / 0.4) : zb + (ze - zb) * SS(0.4, 1, u));
        pts.push([e[0] + (h0 - 0.01 - e[0]) * t, e[1] + (0.012 - e[1]) * t + 0.08 * Ht * Math.sin(Math.PI * t), z]); }
      strap(pts, sw, stt, cy * 0.6, sd); });
    grp.userData = { feet: [a, b] };
  } else {
    // double foot, from the KW photos: the ring leans toward the tip and sits over the tip foot; a long sloped loop
    // runs from the butt foot up both sides of the ring, and a short wire from the tip foot leans back to the ring's bottom
    const a = -Lt * s / 2, b = Lt * s / 2, h0 = a + L1 * s, h1 = b - L2 * s, tilt = 0.32, r = od / 2 + wire * 0.35;
    foot(a, h0); foot(h1, b);
    const cx = h1 * 0.55, cy = ringY;
    [insert, band].forEach(m => { m.position.set(cx, cy, 0); m.rotation.set(0, Math.PI / 2, 0); m.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), -tilt); });
    // flat stamped straps (from Brett's KW photos), not round wire
    const ksw = Math.max(0.035, od * 0.13), kst = Math.max(0.012, od * 0.035);
    [-1, 1].forEach(sd => strap([[h0 - 0.02, 0.012, sd * 0.01], [h0 + (cx - h0) * 0.35, cy * 0.42, sd * r * 0.45], [h0 + (cx - h0) * 0.75, cy * 0.85, sd * r * 0.9], [cx, cy, sd * r]], ksw, kst, cy * 0.6, sd));
    const bx = cx - r * Math.sin(tilt), by = cy - r * Math.cos(tilt);
    [-1, 1].forEach(sd => strap([[h1 + 0.02, 0.012, sd * 0.008], [h1 - (h1 - bx) * 0.25, by * 0.5, sd * 0.02], [bx, by, sd * 0.012]], ksw * 0.7, kst, cy, sd));
    grp.userData = { feet: [a, b] };
  }
  grp.userData.spans = spans;
  return grp;
}
export function guideWrapMesh(info, px, flip, spans = [], blankR = () => 0.25) {
  // saw blades (t[2] = [second thread color, phase shift of the dashes, mirrored]):
  // two threads twisted around each other show as slanted dashes of the two colors, about 26 twists around the rod
  const saw = info.cols.some(t => t && t[2]), Hh = saw ? 512 : 4, TEETH = 26;
  const n = info.cols.length, c = document.createElement('canvas'); c.width = n; c.height = Hh; const x = c.getContext('2d'), im = x.createImageData(n, Hh);
  info.cols.forEach((t, i) => { const idx = flip ? n - 1 - i : i; for (let y = 0; y < Hh; y++) { const o = (y * n + idx) * 4; if (!t) { im.data[o + 3] = 0; continue; }
    let col = t[0];
    if (t[2]) { const [c2, k, mir] = t[2], f = ((y / Hh * TEETH + (flip && !mir ? -k : k)) % 1 + 1) % 1; if (f >= 0.5) col = c2; }
    const rgb = hexRGB(col), m = 0.8 + 0.2 * Math.sin(Math.PI * t[1]); im.data[o] = rgb[0] * m; im.data[o + 1] = rgb[1] * m; im.data[o + 2] = rgb[2] * m; im.data[o + 3] = 255; } });
  x.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  const mat = new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.1, alphaTest: 0.5, side: THREE.DoubleSide });
  // the thread rises over each foot from its toe and stops rising at its heel, where the guide's leg comes up.
  // Over the foot it rises on the foot's side of the blank, ramping up from the toe like the Guide Wrap Designer.
  const x0 = px + info.zMin / IN, x1 = px + info.zMax / IN, lift = 0.02, ramp = 0.09;
  const sp = spans.map(([a, b, toe]) => ({ A: px + a, B: px + b, T: px + toe }));
  const ranges = [[x0, x1]];   // one continuous wrap, underwrap included; the thread only rises over the feet
  const inFeet = x => info.single || info.G == null ? 1 : Math.min(1, Math.max(0, (Math.abs(x - px) * IN - info.G) / 0.8));
  const bump = x => { let h = 0; for (const f of sp) if (x >= Math.min(f.A, f.B) - 0.004 && x <= Math.max(f.A, f.B) + 0.004) h = Math.max(h, Math.min(1, Math.abs(x - f.T) / ramp + 0.25)); h *= inFeet(x); return h * h * (3 - 2 * h); };
  const grpW = new THREE.Group();
  ranges.forEach(([ra, rb]) => { if (rb - ra < 0.01) return;
    const cols = Math.max(2, Math.ceil((rb - ra) / 0.012)), seg = 64, pos = [], uv = [], idx = [];
    for (let i = 0; i <= cols; i++) { const x = ra + (rb - ra) * i / cols, rr = blankR(x) + 0.012, bh = bump(x) * lift;
      for (let j = 0; j <= seg; j++) { const th = j / seg * Math.PI * 2, c = Math.cos(th), r = rr + bh * Math.pow(Math.max(0, c), 0.35);
        pos.push(x, r * c, r * Math.sin(th)); uv.push((x - x0) / (x1 - x0), j / seg); } }
    for (let i = 0; i < cols; i++) for (let j = 0; j < seg; j++) { const a = i * (seg + 1) + j, b = a + seg + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    grpW.add(new THREE.Mesh(g, mat)); });
  return grpW;
}
