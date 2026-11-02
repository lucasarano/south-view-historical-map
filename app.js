import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/CSS2DRenderer.js';
import { loadContent, splitSources } from './content.js';

// Everything shown comes from the content sheet (content.js, docs/MAINTENANCE.md)
const { nodes, links, settings, START_YEAR, END_YEAR } = await loadContent();
const T0 = START_YEAR - 4, T1 = END_YEAR + 2;   // the time rail runs a little past the first and last years
// Text from the content sheet is shown as text, never as HTML
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Web addresses in already-escaped text become links
const withLinks = html => html.replace(/\b(?:https?:\/\/|www\.)[^\s<]+/g, u => {
  const url = u.replace(/[.,;)]+$/, '');
  return `<a href="${url.startsWith('http') ? url : 'https://' + url}" target="_blank" rel="noopener">${url}</a>${u.slice(url.length)}`;
});
// One list item per source; *stars* mark titles
const sourceList = s => `<ol class="sources">${splitSources(s).map(t =>
  `<li>${withLinks(esc(t).replace(/\*([^*]+)\*/g, '<i>$1</i>'))}</li>`).join('')}</ol>`;

/* ---------- Constants ---------- */
const DEPTH = 3.6;                                   // world units per year (time lives on the z axis only)
const Z = year => (year - START_YEAR) * DEPTH;       // later years sit further forward, nearer the viewer
const YEAR_AT = z => START_YEAR + z / DEPTH;
const WHITE = 0xF2F2F0, ROSE = 0xD43C67;
const C_WHITE = new THREE.Color(WHITE), C_ROSE = new THREE.Color(ROSE);
const R = 3;                                         // node radius
const SIZE = { person: R, event: R * 1.3, place: R * 1.2 };   // outer radius per shape
const SEL_SCALE = 1.7;                               // the selected shape grows to frame its photo
const VIEW = new THREE.Vector3(20, 12, 115);         // camera sits slightly in the future, looking back in time
const FADE_NEAR = 8, FADE_FAR = 22;                  // years: fully visible → gone
const IN_VIEW = (FADE_NEAR + FADE_FAR) / 2;          // years either side of the focus that count as in view: half faded at the edge
const TYPE = { person: 'Person', event: 'Event', place: 'Place' };
const SEG = 48;                                      // ribbon segments
const mobileQ = matchMedia('(max-width: 760px)');
const isMobile = () => mobileQ.matches;
const VIEW_2D = new THREE.Vector3(0, 0, 120);        // the flat graph is seen straight on
const viewVec = () => (reduced ? VIEW_2D : VIEW).clone().multiplyScalar(isMobile() ? 1.9 : 1);   // phones need a wider shot
// 2D layout: x is time (left = earlier), y comes from the data, nudged apart so no two shapes overlap
const XS = 5, X2 = year => (year - 1950) * XS, YEAR_AT_X = x => 1950 + x / XS;

const params = new URLSearchParams(location.search);
let selected = params.get('select') || (nodes.find(n => n.type === 'event') || nodes[0]).id;
let radius = Math.min(3, Math.max(1, +(params.get('radius') || 2)));
const STEPS_HOW = 'Numbers show how many steps away each connection is. Pink lines trace the path from here.';
const skipIntro = params.get('intro') === '0';
let detail = params.get('detail') === '1';
let mode = 'focus';                                   // 'focus': one story at a time · 'explore': roam freely through time
const exploring = () => mode === 'explore';
const still = params.get('still') === '1';          // screenshot mode: skip easing, show the settled state
// Reduced motion: no animation at all, and the map lies flat as a 2D graph (time runs left to right instead of in depth)
let reduced = false;
const calm = () => still || reduced;
const lr = k => (calm() ? 1 : k);

/* ---------- Graph ---------- */
const byId = new Map(nodes.map(n => [n.id, n]));
if (!byId.has(selected)) selected = (nodes.find(n => n.type === 'event') || nodes[0]).id;
const adj = new Map(nodes.map(n => [n.id, []]));
for (const l of links) {
  adj.get(l.a).push({ id: l.b, rel: l.rel, verify: !!l.verify, out: true });
  adj.get(l.b).push({ id: l.a, rel: l.rel, verify: !!l.verify, out: false });
}
function hopsFrom(id) {
  const d = new Map([[id, 0]]), q = [id];
  while (q.length) { const c = q.shift(); for (const e of adj.get(c)) if (!d.has(e.id)) { d.set(e.id, d.get(c) + 1); q.push(e.id); } }
  return d;
}

/* ---------- Renderer ---------- */
const stage = document.getElementById('stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const FOG = new THREE.FogExp2(0x000000, 0.0036);   // the flat 2D graph has no depth, so no fog
scene.fog = FOG;

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.5, 3000);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
stage.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'labels';
labelRenderer.domElement.style.pointerEvents = 'none';
stage.appendChild(labelRenderer.domElement);

const overlay = document.createElement('div');
overlay.className = 'overlay';
stage.appendChild(overlay);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.045;
controls.enablePan = false;
controls.enableZoom = false;                         // the wheel moves through time instead
controls.rotateSpeed = 0.3;
// Fixed axis: the view always looks down the time axis; dragging only tilts a little
controls.minAzimuthAngle = -0.18; controls.maxAzimuthAngle = 0.52;
controls.minPolarAngle = 1.28; controls.maxPolarAngle = 1.7;

/* ---------- Starfield ---------- */
function stars(count, size, opacity) {
  const g = new THREE.BufferGeometry(), p = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    p[i * 3] = (Math.random() - 0.5) * 1400;
    p[i * 3 + 1] = (Math.random() - 0.5) * 900;
    p[i * 3 + 2] = Math.random() * 1400 - 600;
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: WHITE, size, sizeAttenuation: false, transparent: true, opacity, depthWrite: false, fog: false }));
  scene.add(pts);
  return pts;
}
const dust = stars(2600, 1, 0.35);
const bright = stars(260, 1.8, 0.55);

/* ---------- Shapes ---------- */
function poly(rad, sides, rot) {
  return Array.from({ length: sides }, (_, i) => { const a = rot + (i / sides) * Math.PI * 2; return new THREE.Vector2(Math.cos(a) * rad, Math.sin(a) * rad); });
}
function ringShape(outer, inner, sides, rot) {
  const s = new THREE.Shape(poly(outer, sides, rot));
  s.holes.push(new THREE.Path(poly(inner, sides, rot).reverse()));
  return s;
}
// Shape geometry with UVs mapped 0..1 across its bounds, so a photo can fill it
function filled(shape, r) {
  const g = new THREE.ShapeGeometry(shape, 24);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * r) + 0.5, p.getY(i) / (2 * r) + 0.5);
  return g;
}
const OUTLINE = {
  person: new THREE.RingGeometry(R - 0.16, R, 96),
  event: new THREE.ShapeGeometry(ringShape(SIZE.event, SIZE.event - 0.23, 4, Math.PI / 4)),
  place: new THREE.ShapeGeometry(ringShape(SIZE.place, SIZE.place - 0.22, 4, Math.PI / 4)),
};
const FILL = {
  person: new THREE.CircleGeometry(R - 0.1, 64),
  event: new THREE.ShapeGeometry(new THREE.Shape(poly(SIZE.event - 0.05, 4, Math.PI / 4))),
  place: new THREE.ShapeGeometry(new THREE.Shape(poly(SIZE.place - 0.05, 4, Math.PI / 4))),
};
const PHOTO = {
  person: new THREE.CircleGeometry(R - 0.12, 64),
  event: filled(new THREE.Shape(poly(SIZE.event - 0.12, 4, Math.PI / 4)), SIZE.event - 0.12),
  place: filled(new THREE.Shape(poly(SIZE.place - 0.12, 4, Math.PI / 4)), SIZE.place - 0.12),
};
const HALO = new THREE.RingGeometry(R * 1.85 - 0.09, R * 1.85, 128);

/* ---------- Pictures: only public ones from the content sheet; everything else shows a symbol ---------- */
const mediaFor = n => (n.picture ? [n.picture] : []);
// Every title carries its date. People show their lifespan when known; everything else shows its year (its place on the time axis).
const dateOf = n => n.dates || String(n.year);
const titleOf = n => `${esc(n.name)}<span class="dt">${esc(dateOf(n))}</span>`;
// The extra detail under a title, unless it only restates the date ("1893", "Opened 1952")
const subOf = () => '';
const initialsOf = n => n.name.replace(/^(Dr\.|Rev\.)\s+/, '').split(/\s+/).filter(w => /^[A-Z]/.test(w)).map(w => w[0]).slice(0, 2).join('');
const imgCache = new Map();
function loadImg(src) {
  // crossOrigin lets a picture hosted elsewhere (Wikimedia, the Library of Congress) be drawn into the scene
  if (!imgCache.has(src)) imgCache.set(src, new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }));
  return imgCache.get(src);
}
function drawCover(x, im, w, h) {
  const sc = Math.max(w / im.width, h / im.height), dw = im.width * sc, dh = im.height * sc;
  x.filter = 'grayscale(1) contrast(1.05) brightness(.9)';
  x.drawImage(im, (w - dw) / 2, (h - dh) * (dh > h ? 0.15 : 0.5), dw, dh);   // a tall picture keeps its top, where a portrait's face is
  x.filter = 'none';
}
const texCache = new Map();
function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; }
// Square texture shown inside the node itself
function drawSymbol(x, type, cx, cy, size) {
  x.strokeStyle = '#8c8c88'; x.fillStyle = '#8c8c88'; x.lineWidth = size * 0.06; x.lineCap = 'round';
  x.beginPath();
  if (type === 'person') {
    x.arc(cx, cy - size * 0.22, size * 0.17, 0, Math.PI * 2);                 // head
    x.moveTo(cx - size * 0.32, cy + size * 0.42);
    x.quadraticCurveTo(cx - size * 0.32, cy + size * 0.02, cx, cy + size * 0.02);   // shoulders
    x.quadraticCurveTo(cx + size * 0.32, cy + size * 0.02, cx + size * 0.32, cy + size * 0.42);
  } else {
    const r = size * 0.24;                                                     // a square, like the event's own shape
    x.rect(cx - r, cy - r, r * 2, r * 2);
    x.moveTo(cx + size * 0.07, cy); x.arc(cx, cy, size * 0.07, 0, Math.PI * 2);
  }
  x.stroke();
}
async function nodeTexture(n) {
  const key = 'node:' + n.id;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#121212'; x.fillRect(0, 0, 512, 512);
  const im = n.picture ? await loadImg(n.picture) : null;
  if (im) drawCover(x, im, 512, 512); else drawSymbol(x, n.type, 256, 256, 340);
  const t = canvasTex(c); texCache.set(key, t); return t;
}
// Captioned panel shown around the node
async function shotTexture(src, n) {
  const id = 'shot:' + src;
  if (texCache.has(id)) return texCache.get(id);
  await document.fonts.ready;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 800;   // twice the drawing size, so edges stay crisp
  const x = c.getContext('2d');
  x.scale(2, 2);
  const IH = 340, rr = 10;
  x.save(); x.beginPath(); x.roundRect(2, 2, 508, IH - 4, rr); x.clip();
  x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, 512, IH);
  const im = await loadImg(src);
  if (im) drawCover(x, im, 512, IH);
  x.restore();
  x.strokeStyle = 'rgba(255,255,255,.22)'; x.lineWidth = 2;
  x.beginPath(); x.roundRect(2, 2, 508, IH - 4, rr); x.stroke();
  // The credit is on the card in full; the panel carries its first words
  let cap = (n.credit || '').split('. ')[0];
  x.fillStyle = '#6a6a66'; x.font = 'italic 22px Libron, Georgia, serif'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  while (cap && x.measureText(cap).width > 500) cap = cap.slice(0, -2).trimEnd() + '…';
  x.fillText(cap, 4, 386);
  const t = canvasTex(c); texCache.set(id, t); return t;
}

/* ---------- Nodes ---------- */
const items = new Map();
const pickables = [];
nodes.forEach((n, i) => {
  const p3 = new THREE.Vector3(n.x, n.y, Z(n.year)), p2 = new THREE.Vector3(X2(n.year), n.y, 0), pos = p3;
  const group = new THREE.Group();
  group.position.copy(pos);
  // Opaque black fill: anything behind a shape is hidden by it
  const fill = new THREE.Mesh(FILL[n.type], new THREE.MeshBasicMaterial({ color: 0x000000 }));
  fill.userData.id = n.id;
  const photo = new THREE.Mesh(PHOTO[n.type], new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  photo.position.z = 0.01;
  photo.visible = false;
  const line = new THREE.Mesh(OUTLINE[n.type], new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, depthWrite: false }));
  line.position.z = 0.02;
  const halo = new THREE.Mesh(HALO, new THREE.MeshBasicMaterial({ color: ROSE, transparent: true, opacity: 0, depthWrite: false }));
  group.add(fill, photo, line, halo);
  scene.add(group);
  pickables.push(fill);

  const el = document.createElement('div');
  el.className = 'lbl';
  el.innerHTML = `<div class="in"><div class="n">${titleOf(n)}</div>${subOf(n) ? `<div class="w">${subOf(n)}</div>` : ''}</div>`;
  el.addEventListener('click', () => select(n.id));
  const lbl = new CSS2DObject(el);
  lbl.position.copy(pos);
  scene.add(lbl);

  // sx/sy/sr: where the shape is drawn (it breathes). lx/ly/lr: its resting spot, which the overlay layout uses so it holds still.
  items.set(n.id, { n, pos, p3, p2, group, fill, photo, line, halo, lbl, el, inner: el.firstChild, lw: 0, lh: 0, alpha: 0, phase: i * 0.7, sx: 0, sy: 0, sr: 0, lx: 0, ly: 0, lr: 0, bs: 1, vis: false, visT: -1e9, op: 0 });
});

document.fonts?.ready.then(() => { for (const it of items.values()) it.lw = 0; });   // label widths change when the web font arrives

// Spread the 2D spots apart vertically (x stays the year, so time is never distorted)
{
  const list = [...items.values()], GAP = 11;
  for (let pass = 0; pass < 200; pass++) {
    let moved = false;
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i].p2, b = list[j].p2;
      if (Math.abs(a.x - b.x) >= GAP) continue;
      const dy = b.y - a.y, push = GAP - Math.abs(dy);
      if (push > 0) { const sg = dy >= 0 ? 1 : -1; a.y -= sg * push / 2; b.y += sg * push / 2; moved = true; }
    }
    if (!moved) break;
  }
}

/* ---------- Time axis: time only ever runs along z. A faint rail with a mark every decade makes that visible. ---------- */
const AXIS = { x: -72, y: -46 };
const AXIS_2D_Y = Math.min(...[...items.values()].map(it => it.p2.y)) - 16;   // in 2D the rail runs along the bottom
const railMat = new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.16, depthWrite: false });
const rail3 = (() => {
  const pts = [new THREE.Vector3(AXIS.x, AXIS.y, Z(T0)), new THREE.Vector3(AXIS.x, AXIS.y, Z(T1))];
  for (let y = START_YEAR; y <= END_YEAR; y += 10) pts.push(new THREE.Vector3(AXIS.x - 2.5, AXIS.y, Z(y)), new THREE.Vector3(AXIS.x + 2.5, AXIS.y, Z(y)));
  return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), railMat);
})();
const rail2 = (() => {
  const pts = [new THREE.Vector3(X2(T0), AXIS_2D_Y, 0), new THREE.Vector3(X2(T1), AXIS_2D_Y, 0)];
  for (let y = START_YEAR; y <= END_YEAR; y += 10) pts.push(new THREE.Vector3(X2(y), AXIS_2D_Y - 1.5, 0), new THREE.Vector3(X2(y), AXIS_2D_Y + 1.5, 0));
  return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), railMat.clone());
})();
rail2.material.opacity = 0.3;
rail2.visible = false;
scene.add(rail3, rail2);
const ticks = [];
for (let y = START_YEAR; y <= END_YEAR; y += 10) {
  const el = document.createElement('div');
  el.className = 'tick';
  el.textContent = y;
  const obj = new CSS2DObject(el);
  obj.position.set(AXIS.x - 9, AXIS.y, Z(y));
  scene.add(obj);
  ticks.push({ el, year: y, obj, pos: obj.position, w: 0, h: 0, vis: false, visT: -1e9, op: 0 });
}
const yearEl = document.getElementById('year');
// The top bar, the hint line and the year readout: labels stay out from under them
let chrome = null;
function chromeRects() {
  if (!chrome) chrome = ['.top', '#hint', '#explore-hint', '#year', '#legend-btn', '#fix-open', ...(legendEl.classList.contains('open') ? ['#legend-panel'] : [])].map(sel => document.querySelector(sel))
    .filter(el => el && getComputedStyle(el).display !== 'none')
    .map(el => { const r = el.getBoundingClientRect(); return { x1: r.left - 6, x2: r.right + 6, y1: r.top - 4, y2: r.bottom + 4 }; });
  return chrome;
}
addEventListener('resize', () => { chrome = null; });
let shownYear = null;

/* ---------- Connections: curved ribbons, wide at the source, thin at the target ---------- */
const ribbonMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });
// The selected node's own connections ignore the fog, so a link to something decades away still reads clearly
const ribbonMatStrong = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
const headMat = () => new THREE.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0, depthWrite: false });
const linkObjs = links.map((l, i) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEG + 1) * 2 * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array((SEG + 1) * 2 * 4), 4));
  const idx = [];
  for (let k = 0; k < SEG; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setIndex(idx);
  const mesh = new THREE.Mesh(g, ribbonMat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  const hg = new THREE.BufferGeometry();
  hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 3), 3));
  const head = new THREE.Line(hg, headMat());
  head.frustumCulled = false;
  scene.add(head);
  const bend = (i % 2 ? 1 : -1) * 0.22;              // alternate the side each curve bows to
  return { ...l, mesh, head, bend, opacity: 0 };
});

const vA = new THREE.Vector3(), vC = new THREE.Vector3(), vT = new THREE.Vector3(), vS = new THREE.Vector3(), vV = new THREE.Vector3(), vP = new THREE.Vector3();
const ZAXIS = new THREE.Vector3(0, 0, 1), YAXIS = new THREE.Vector3(0, 1, 0);
function bez(a, c, b, u, out) {
  const k = 1 - u;
  return out.set(k * k * a.x + 2 * k * u * c.x + u * u * b.x, k * k * a.y + 2 * k * u * c.y + u * u * b.y, k * k * a.z + 2 * k * u * c.z + u * u * b.z);
}
function bezTan(a, c, b, u, out) {
  return out.set(2 * (1 - u) * (c.x - a.x) + 2 * u * (b.x - c.x), 2 * (1 - u) * (c.y - a.y) + 2 * u * (b.y - c.y), 2 * (1 - u) * (c.z - a.z) + 2 * u * (b.z - c.z)).normalize();
}
function updateRibbon(L, opacity, tint = 0) {
  const A = items.get(L.a), B = items.get(L.b);
  const a = A.group.position, b = B.group.position;
  const len = a.distanceTo(b) || 1;
  vV.subVectors(b, a);
  vP.crossVectors(vV, ZAXIS);
  if (vP.lengthSq() < 1e-4) vP.crossVectors(vV, YAXIS);
  vP.normalize();
  vC.addVectors(a, b).multiplyScalar(0.5).addScaledVector(vP, Math.min(len * L.bend, 22));
  const ra = SIZE[A.n.type] * A.group.scale.x, rb = SIZE[B.n.type] * B.group.scale.x;
  const u0 = Math.min(0.4, (ra * 1.05) / len), u1 = Math.max(0.6, 1 - (rb * 1.35) / len);
  const w0 = ra * (reduced ? 0.3 : 0.62);             // starts near the source's full width (slimmer in the flat 2D graph, where links run long)
  const pos = L.mesh.geometry.attributes.position.array, col = L.mesh.geometry.attributes.color.array;
  for (let k = 0; k <= SEG; k++) {
    const v = k / SEG, u = u0 + (u1 - u0) * v;
    bez(a, vC, b, u, vA);
    bezTan(a, vC, b, u, vT);
    vS.subVectors(camera.position, vA).normalize().cross(vT).normalize();
    const w = Math.max(L.strong ? 0.1 : 0.045, w0 * Math.pow(1 - v, 2.4));
    const dash = L.verify ? (Math.floor(v * 16) % 2 ? 0.08 : 1) : 1;
    const al = opacity * ((L.strong ? 0.3 : 0.12) + 0.68 * Math.pow(v, 0.7)) * dash;   // faint and wide at the source, crisp at the target
    for (let side = 0; side < 2; side++) {
      const j = k * 2 + side, sg = side ? 1 : -1;
      pos[j * 3] = vA.x + vS.x * w * sg; pos[j * 3 + 1] = vA.y + vS.y * w * sg; pos[j * 3 + 2] = vA.z + vS.z * w * sg;
      col[j * 4] = 0.95 + (0.83 - 0.95) * tint; col[j * 4 + 1] = 0.95 + (0.24 - 0.95) * tint; col[j * 4 + 2] = 0.95 + (0.4 - 0.95) * tint; col[j * 4 + 3] = al;
    }
  }
  L.mesh.geometry.attributes.position.needsUpdate = true;
  L.mesh.geometry.attributes.color.needsUpdate = true;
  // Small arrowhead at the target end
  bez(a, vC, b, u1, vA);
  bezTan(a, vC, b, u1, vT);
  vS.subVectors(camera.position, vA).normalize().cross(vT).normalize();
  const h = L.head.geometry.attributes.position.array, s = 1.1;
  h[0] = vA.x - vT.x * s * 1.3 + vS.x * s; h[1] = vA.y - vT.y * s * 1.3 + vS.y * s; h[2] = vA.z - vT.z * s * 1.3 + vS.z * s;
  h[3] = vA.x; h[4] = vA.y; h[5] = vA.z;
  h[6] = vA.x - vT.x * s * 1.3 - vS.x * s; h[7] = vA.y - vT.y * s * 1.3 - vS.y * s; h[8] = vA.z - vT.z * s * 1.3 - vS.z * s;
  L.head.geometry.attributes.position.needsUpdate = true;
  L.head.material.opacity = opacity;
  L.curve = { a, c: vC.clone(), b, u0, u1 };
}

/* One slow light per connection of the selected node, travelling source → target */
const glints = [];
function rebuildGlints() {
  for (const g of glints) scene.remove(g.mesh);
  glints.length = 0;
  linkObjs.forEach(L => {
    if (L.a !== selected && L.b !== selected) return;
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.32, 16), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0, depthWrite: false }));
    scene.add(mesh);
    glints.push({ mesh, L, offset: Math.random() });
  });
}

/* ---------- Selection state ---------- */
let hops = new Map();
const within = id => hops.has(id) && hops.get(id) <= radius;
let cardSide = 1;                                     // +1: card to the right of the node, -1: to the left (fixed per selection)

/* ---------- Camera: eased flights, time scrolling ---------- */
let flight = null;
const ease = t => t * t * t * (t * (6 * t - 15) + 10);      // smootherstep
let zoomGoal = null;                                 // distance from the focus; set on first frame
function flyTo(id, dur = 2200, fromFar = false) {
  if (calm()) { dur = 1; fromFar = false; }          // reduced motion: jump straight there
  const target = items.get(id).pos.clone();
  zoomGoal = null;                                     // every choice lands at the same distance; scroll-zooming lasts until the next one
  const toP = target.clone().add(viewVec());
  const fromP = fromFar ? toP.clone().add(new THREE.Vector3(30, 40, 420)) : camera.position.clone();
  flight = { t0: performance.now(), dur, fromT: fromFar ? target.clone().add(new THREE.Vector3(0, 0, 200)) : controls.target.clone(), toT: target, fromP, toP };
}
function zoomBy(f) {
  const base = viewVec().length();
  zoomGoal = Math.min(base * 2.3, Math.max(base * 0.35, (zoomGoal ?? base) * f));
}
/* Explore mode: the camera keeps its angle and glides to a goal. Scrolling moves it along the time (z) axis, dragging moves it sideways. */
const Z_MIN = Z(T0), Z_MAX = Z(T1), XY_MAX = 130;
let exploreGoal = null;
const EXPLORE_VIEW = new THREE.Vector3(0, 16, 125);  // fixed: Explore never tilts
const exploreView = () => (reduced ? VIEW_2D.clone().multiplyScalar(1.25) : EXPLORE_VIEW.clone()).multiplyScalar(isMobile() ? 1.7 : 1);
function moveExplore(dx, dy, dz) {
  if (!exploreGoal) exploreGoal = controls.target.clone();
  const [x0, x1] = reduced ? [X2(T0), X2(T1)] : [-XY_MAX, XY_MAX];   // in 2D, x is the time range
  exploreGoal.x = Math.max(x0, Math.min(x1, exploreGoal.x + dx));
  exploreGoal.y = Math.max(-XY_MAX, Math.min(XY_MAX, exploreGoal.y + dy));
  exploreGoal.z = reduced ? 0 : Math.max(Z_MIN, Math.min(Z_MAX, exploreGoal.z + dz));
}
// Pan by screen pixels, without ever changing the year in view
function panExplore(px, py) {
  const wpp = 2 * camera.position.distanceTo(controls.target) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / innerHeight;
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).setZ(0).normalize();
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).setZ(0).normalize();
  moveExplore(-(right.x * px - up.x * py) * wpp, -(right.y * px - up.y * py) * wpp, 0);
}
// Later in time is further forward (+z), or further right in the 2D graph
const travelYears = years => (reduced ? moveExplore(years * XS, 0, 0) : moveExplore(0, 0, years * DEPTH));
const focusYearNow = () => (reduced ? YEAR_AT_X(controls.target.x) : YEAR_AT(controls.target.z));
// Listen on the whole stage so scrolling works over labels and pills too (but let the expanded card scroll itself)
stage.addEventListener('wheel', e => {
  if (card.contains(e.target)) return;
  e.preventDefault();
  if (exploring()) travelYears(e.deltaY * 0.03);
  else zoomBy(Math.exp(e.deltaY * 0.0011));
}, { passive: false });

/* ---------- Overlay: info card + travel arrows ---------- */
const card = document.createElement('div');
card.className = 'card';
overlay.appendChild(card);
let arrows = [];
let obstacles = [];

// A small solid arrow: its filled head foreshortens when it leans into or out of the screen, so the 3D tilt reads
const ARROW_SVG = '<svg viewBox="0 0 12 12"><path d="M1.5 6h5.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M6 2.4 11.2 6 6 9.6z" fill="currentColor"/></svg>';
const glyph = type => `<i class="glyph ${type}"></i>`;

function ringsSummary() {
  const g = [[], [], []];
  for (const [id, h] of hops) if (h >= 1 && h <= 3) g[h - 1].push(byId.get(id));
  return g;
}
function renderCard() {
  const n = byId.get(selected);
  const g = ringsSummary();
  const reached = g.slice(0, radius).flat();
  const years = reached.concat(n).map(x => x.year);
  const legend = [0, 1, 2].map(i => `<li class="${i < radius ? '' : 'off'}"><i class="lg steps h${i + 1}">${i + 1}</i><span>${['1 step · direct', '2 steps away', '3 steps away'][i]}</span><em>${g[i].length}</em></li>`).join('');
  const me = n;
  const connList = (cls, title) => `<div class="sec ${cls}"><b class="h">${title}</b>${adj.get(selected).slice().sort((a, b) => byId.get(a.id).year - byId.get(b.id).year).map(e => {
    const o = byId.get(e.id);
    return `<button class="conn" data-id="${o.id}">${glyph(o.type)}<span><b>${titleOf(o)}</b><small>${e.out ? e.rel : 'via “' + e.rel + '”'} · ${o.year < me.year ? 'earlier' : o.year > me.year ? 'later' : 'same year'}${e.verify ? ' · to verify' : ''}</small></span></button>`;
  }).join('')}</div>`;
  const reach = reached.length
    ? `Reaches <em>${reached.length}</em> ${reached.length === 1 ? 'life or event' : 'lives and events'}, <em>${Math.min(...years)}–${Math.max(...years)}</em>.`
    : 'No documented connections yet.';

  card.classList.toggle('open', detail);
  // Collapsed: the opening of the notes' text and "Learn more". Open: the whole text, facts and connections.
  const paras = (n.text || '').split(/\n\s*\n/).filter(t => t.trim());
  const body = paras.length ? `<blockquote class="body${detail ? '' : ' clamp'}">${(detail ? paras : paras.slice(0, 1)).map(t => `<p>${esc(t)}</p>`).join('')}</blockquote>` : '';
  card.innerHTML = `
    <div class="grip" aria-hidden="true"></div>
    <div class="kind"><i></i>${TYPE[n.type]}<button class="more-cue" id="cue" aria-expanded="${detail}">${detail ? 'Less' : 'More'}</button></div>
    <button class="name" id="name" aria-expanded="${detail}" title="${detail ? 'Show less' : 'More about ' + n.name}">${titleOf(n)}</button>
    ${subOf(n) ? `<div class="when">${subOf(n)}</div>` : ''}
    ${body}
    ${!detail ? `<button class="learn" id="learn" aria-expanded="false">Learn more</button>` : ''}
    ${detail ? `<dl class="facts">
      <div><dt>${n.type === 'person' ? 'Lived' : 'When'}</dt><dd>${esc(n.dates)}</dd></div>
      ${n.rests ? `<div><dt>Rests at South-View</dt><dd>${esc(n.rests)}</dd></div>` : ''}
      <div class="wide src"><dt>Sources</dt><dd>${sourceList(n.source || 'Team notes')}</dd></div>
      ${n.credit ? `<div class="wide"><dt>Picture</dt><dd>${withLinks(esc(n.credit))}</dd></div>` : ''}
    </dl>
    ${connList('', 'Connections')}
    <div class="rip">
      <div class="rip-row"><b class="h">Ripple of influence</b><span class="seg">${[1, 2, 3].map(r => `<button data-r="${r}" class="${r === radius ? 'on' : ''}" aria-label="Ripple reaches ${r} step${r > 1 ? 's' : ''}">${r}</button>`).join('')}</span></div>
      <p class="how">${STEPS_HOW}</p>
      <ul class="legend">${legend}</ul>
      <p class="reach">${reach}</p>
    </div>
    <div class="links"><a href="${esc(settings['Learn more link'] || 'https://southviewcemetery.com/')}" target="_blank" rel="noopener">South-View's website ↗</a><button id="card-fix">Suggest a correction</button></div>
    ${n.missing.length ? '<p class="inc-sign">Information may be incomplete.</p>' : ''}`
    : `<div class="rip simple"><b class="h">Ripple of influence</b><p class="reach">${reach}</p></div>
    ${isMobile() ? connList('mob-conns', 'Travel to') : ''}`}`;
  card.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { radius = +b.dataset.r; renderCard(); syncUrl(); });
  card.querySelectorAll('.conn').forEach(b => b.onclick = () => select(b.dataset.id));
  card.querySelector('#card-fix')?.addEventListener('click', () => openFix(selected));
  card.querySelector('#name').onclick = card.querySelector('#cue').onclick = () => { detail = !detail; renderCard(); syncUrl(); };
  card.querySelector('#learn')?.addEventListener('click', () => { detail = true; renderCard(); syncUrl(); });
}
function fadeCardIn() {
  card.classList.remove('show');
  requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('show')));
}

/* ---------- Images around the node ----------
   Flat panels in the node's own time plane (constant z). Their spots are chosen once per selection,
   all at the same distance and evenly spread on the side away from the card, so nothing competes.
   They stay while you zoom or look around, until something else is selected.
   Each panel (and each node) can be dragged. */
const SHOT_W = 15, SHOT_H = SHOT_W * 400 / 512;
const shotGeo = new THREE.PlaneGeometry(SHOT_W, SHOT_H);
let shots = [];
function renderShots() {
  for (const sh of shots) scene.remove(sh.mesh);
  const S = items.get(selected), n = S.n;
  let dist = SIZE[n.type] * SEL_SCALE + SHOT_W * 0.55 + 1.5;
  const spread = [-0.95, 0, 0.95];                     // equal spacing: three spots on one arc
  // Choose the arc once: on the card's far side, rotated to where it overlaps the fewest shapes
  const base = cardSide > 0 ? Math.PI : 0;
  const near = [...items.values()].filter(it => it !== S && Math.abs(it.pos.z - S.pos.z) < 60);
  let best = base, bestCost = Infinity, bestDist = dist;
  for (const grow of [1, 1.15, 1.3]) for (let k = -6; k <= 6; k++) {
    const rot = base + k * 0.12, d0 = dist * grow;
    let cost = Math.abs(k) * 0.4 + (grow - 1) * 6;     // prefer close and straight-out
    for (const sp of spread) {
      const cx = S.pos.x + Math.cos(rot + sp) * d0, cy = S.pos.y + Math.sin(rot + sp) * d0;
      for (const it of near) {
        const r = SIZE[it.n.type] * 1.6 + 2;
        const nx = Math.max(cx - SHOT_W / 2, Math.min(it.pos.x, cx + SHOT_W / 2)), ny = Math.max(cy - SHOT_H / 2, Math.min(it.pos.y, cy + SHOT_H / 2));
        const d = Math.hypot(nx - it.pos.x, ny - it.pos.y);
        if (d < r) cost += (r - d) * (1 - Math.abs(it.pos.z - S.pos.z) / 60);
      }
    }
    if (cost < bestCost) { bestCost = cost; best = rot; bestDist = d0; }
  }
  const away = best;
  dist = bestDist;
  const t0 = performance.now();
  shots = mediaFor(n).map((m, i) => {
    const mesh = new THREE.Mesh(shotGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    mesh.renderOrder = 5;
    mesh.visible = false;
    const a = away + spread[i];
    mesh.position.set(S.pos.x + Math.cos(a) * dist, S.pos.y + Math.sin(a) * dist, S.pos.z);
    mesh.userData.shot = true;
    scene.add(mesh);
    shotTexture(m, n).then(tex => { mesh.material.map = tex; mesh.material.needsUpdate = true; mesh.visible = true; });
    return { mesh, delay: calm() ? 0 : 1500 + i * 220, t0 };
  });
  // The node and everything it connects to directly show their own photo inside their outline
  for (const id of [selected, ...adj.get(selected).map(e => e.id)]) {
    const it = items.get(id);
    if (it.photo.material.map) continue;
    nodeTexture(it.n).then(tex => { it.photo.material.map = tex; it.photo.material.needsUpdate = true; it.photo.visible = true; });
  }
}
function updateShots(now) {
  const S = items.get(selected);
  for (const sh of shots) {
    const age = now - sh.t0 - sh.delay;
    const target = age > 0 ? (calm() ? 1 : Math.min(1, age / 900)) * S.alpha : 0;
    sh.mesh.material.opacity += (target - sh.mesh.material.opacity) * lr(0.15);
  }
}
function shotRects() {
  // Every image counts from the start, even while it fades in, so the layout around it never shifts once it appears
  return shots.filter(sh => !exploring() || sh.mesh.material.opacity > 0.05).map(sh => {
    const c = toScreen(sh.mesh.position), e = toScreen(tmp2.copy(sh.mesh.position).add(new THREE.Vector3(SHOT_W / 2, SHOT_H / 2, 0)));
    const hw = Math.abs(e.x - c.x), hh = Math.abs(e.y - c.y);
    return { x1: c.x - hw - 8, x2: c.x + hw + 8, y1: c.y - hh - 8, y2: c.y + hh + 8 };
  });
}

function renderArrows() {
  for (const a of arrows) a.el.remove();
  const me = byId.get(selected);
  arrows = adj.get(selected).map(e => {
    const n = byId.get(e.id);
    const when = n.year < me.year ? 'earlier' : n.year > me.year ? 'later' : 'same year';
    const el = document.createElement('button');
    el.className = 'arrow';
    // Just the name and the arrow; the arrow itself says earlier (leans back) or later (leans forward)
    el.innerHTML = `<span class="chev">${ARROW_SVG}</span><span class="t">${esc(n.name)}</span>`;
    el.classList.add(n.year < me.year ? 'back' : n.year > me.year ? 'fwd' : 'level');
    el.setAttribute('aria-label', `Go to ${n.name} (${when})`);
    el.onclick = () => select(n.id);
    overlay.appendChild(el);
    // tx/ty: solved offset from the selected node; ex/ey: the offset shown, easing toward it
    return { el, id: n.id, w: 0, h: 0, tx: null, ty: null, ex: 0, ey: 0, x: 0, y: 0, off: false, ang: null };
  });
  solvedR = 0;
}

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), camUp = new THREE.Vector3();
function toScreen(v) {
  tmp.copy(v).project(camera);
  return { x: (tmp.x + 1) / 2 * innerWidth, y: (1 - tmp.y) / 2 * innerHeight, behind: tmp.z > 1 };
}
const rectHitsDisc = (r, cx, cy, cr) => {
  const nx = Math.max(r.x1, Math.min(cx, r.x2)), ny = Math.max(r.y1, Math.min(cy, r.y2));
  return (nx - cx) ** 2 + (ny - cy) ** 2 < cr * cr;
};
const rectsHit = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
const visibleDiscs = () => [...items.values()].filter(it => it.alpha > 0.12 && it.n.id !== selected);
// While the index is open on a large screen, overlay pieces stay to its right
const leftEdge = () => (!isMobile() && indexEl.classList.contains('open') ? indexEl.getBoundingClientRect().right + 16 : 24);
const settle = (dt, ms) => (calm() ? 1 : 1 - Math.exp(-dt / ms));   // frame-rate independent easing factor
// A shown/hidden choice must hold for a moment before it flips, so nothing blinks while the view moves
function hold(o, want, now, ms = 350) {
  if (want !== o.vis && now - o.visT > ms) { o.vis = want; o.visT = now; }
  return o.vis;
}

/* Direction from the selected node toward a connection, on screen */
function arrowDir(a, S) {
  const T = items.get(a.id), t = toScreen(T.pos);
  const W = innerWidth, H = innerHeight;
  const off = t.behind || t.x < 40 || t.x > W - 40 || t.y < 80 || t.y > H - 60;
  if (t.behind) {
    const right = tmp2.setFromMatrixColumn(camera.matrixWorld, 0), v = T.pos.clone().sub(S.pos);
    let dx = v.dot(right);
    const up = tmp2.setFromMatrixColumn(camera.matrixWorld, 1);
    let dy = -v.dot(up);
    const l = Math.hypot(dx, dy) || 1;
    return { dx: dx / l, dy: dy / l, dist: 9999, off, behind: true };
  }
  const dx = t.x - S.lx, dy = t.y - S.ly, dist = Math.hypot(dx, dy) || 1;
  return { dx: dx / dist, dy: dy / dist, dist, off, behind: false };
}

/* Arrows sit on the line toward each connection, kept clear of the card, the images, shapes and each other.
   This is only solved while the view is at rest, from resting positions, so the answer doesn't flicker. */
function solveArrows(S, blocks) {
  const W = innerWidth, H = innerHeight, s = { x: S.lx, y: S.ly }, selR = S.lr * 1.4;
  const placed = arrows.map(a => {
    const T = items.get(a.id), d = arrowDir(a, S);
    if (!a.w) { a.w = a.el.offsetWidth; a.h = a.el.offsetHeight; }
    let L = Math.min(Math.max(d.dist * 0.5, selR + 110), selR + 240);
    if (!d.behind) L = Math.max(selR * 0.7 + 60, Math.min(L, d.dist - T.lr * 2.2 - 34));
    return { a, x: s.x + d.dx * L, y: s.y + d.dy * L, dx: d.dx, dy: d.dy, off: d.off };
  });
  const box = p => ({ x1: p.x - p.a.w / 2 - 6, x2: p.x + p.a.w / 2 + 6, y1: p.y - p.a.h / 2 - 6, y2: p.y + p.a.h / 2 + 6 });
  // Move a pill out of a rectangle by the shortest way
  const pushOut = (p, o) => {
    const b = box(p);
    if (!rectsHit(b, o)) return;
    const upD = b.y2 - o.y1, downD = o.y2 - b.y1, leftD = b.x2 - o.x1, rightD = o.x2 - b.x1;
    const m = Math.min(upD, downD, leftD, rightD);
    if (m === upD) p.y -= upD + 2; else if (m === downD) p.y += downD + 2; else if (m === leftD) p.x -= leftD + 2; else p.x += rightD + 2;
  };
  const discs = visibleDiscs();
  for (let it = 0; it < 30; it++) {
    for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
      const A = placed[i], B = placed[j];
      const ox = (A.a.w + B.a.w) / 2 + 10 - Math.abs(A.x - B.x), oy = (A.a.h + B.a.h) / 2 + 10 - Math.abs(A.y - B.y);
      if (ox > 0 && oy > 0) { const d = (oy / 2 + 1) * (A.y <= B.y ? -1 : 1); A.y += d; B.y -= d; }
    }
    for (const p of placed) {
      for (const o of blocks) pushOut(p, o);
      for (const d of discs.concat([{ lx: s.x, ly: s.y, lr: S.lr * 1.6, n: {} }])) {
        const r = d.lr * (within(d.n.id) ? 1.6 : 1.25) + 4;
        if (rectHitsDisc(box(p), d.lx, d.ly, r)) {
          const vx = p.x - d.lx, vy = p.y - d.ly, l = Math.hypot(vx, vy) || 1;
          p.x += (vx / l) * 8; p.y += (vy / l) * 8;
        }
      }
      p.x = Math.min(Math.max(p.x, leftEdge() + p.a.w / 2), W - 24 - p.a.w / 2);
      p.y = Math.min(Math.max(p.y, 84 + p.a.h / 2), H - 64 - p.a.h / 2);
    }
  }
  // Hard pass: never cover the selected shape or the target shape; then never stack on each other
  for (let round = 0; round < 3; round++) {
    for (const p of placed) {
      const T = items.get(p.a.id);
      for (let k = 0; k < 60; k++) {
        const b = box(p);
        const hitSel = rectHitsDisc(b, s.x, s.y, S.lr * 1.5);
        const hitT = T.alpha > 0.1 && rectHitsDisc(b, T.lx, T.ly, T.lr * 1.35);
        if (!hitSel && !hitT) break;
        if (hitSel) { const vx = p.x - s.x, vy = p.y - s.y, l = Math.hypot(vx, vy) || 1; p.x += vx / l * 6; p.y += vy / l * 6; }
        if (hitT) { const vx = p.x - T.lx, vy = p.y - T.ly; const px = -p.dy, py = p.dx; const sgn = (vx * px + vy * py) >= 0 ? 1 : -1; p.x += px * sgn * 6; p.y += py * sgn * 6; }
      }
    }
    for (let it = 0; it < 12; it++) for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
      const A = placed[i], B = placed[j];
      const ox = (A.a.w + B.a.w) / 2 + 8 - Math.abs(A.x - B.x), oy = (A.a.h + B.a.h) / 2 + 8 - Math.abs(A.y - B.y);
      if (ox > 0 && oy > 0) { const d = (oy / 2 + 1) * (A.y <= B.y ? -1 : 1); A.y += d; B.y -= d; }
    }
    for (const p of placed) pushOut(p, blocks[0]);    // the card always wins: a pill never sits on top of it
  }
  // Re-express what's on screen in the new solve's scale, so switching solves never jumps
  const k = solvedR ? S.lr / solvedR : 1;
  for (const p of placed) {
    const a = p.a, first = a.tx == null;
    a.tx = p.x - s.x; a.ty = p.y - s.y; a.off = p.off;
    if (first) { a.ex = a.tx; a.ey = a.ty; } else { a.ex *= k; a.ey *= k; }
  }
  solvedR = S.lr;
}

let solvedR = 0;                                      // the selected node's screen radius when the arrows were last solved
let restFrames = 0;                                   // how long the camera has been still
function layoutOverlay(now, dt) {
  const W = innerWidth, H = innerHeight;
  const S = items.get(selected), s = { x: S.lx, y: S.ly }, selR = S.lr * 1.4;
  const imgs = shotRects();

  // Card: fixed side per selection (a bottom sheet on phones), beside the node's resting spot
  let cardBox;
  if (isMobile()) {
    card.style.transform = '';
    const r = card.getBoundingClientRect();
    cardBox = { x1: r.left, x2: r.right, y1: r.top, y2: r.bottom };
  } else {
    const cw = card.offsetWidth, ch = card.offsetHeight;
    let cx = cardSide > 0 ? s.x + selR + 40 : s.x - selR - 40 - cw;
    cx = Math.min(Math.max(cx, leftEdge()), W - 24 - cw);
    const cy = Math.min(Math.max(s.y - 80, 84), H - 70 - ch);
    card.style.transform = `translate(${cx}px, ${cy}px)`;
    cardBox = { x1: cx - 12, x2: cx + cw + 12, y1: cy - 12, y2: cy + ch + 12 };
  }
  const blocks = exploring() ? imgs : [cardBox, ...imgs];   // in Explore the card and arrows are put away
  obstacles = blocks.slice();

  if (!isMobile() && arrows.length && !exploring()) {
    if (!flight && restFrames >= 8) solveArrows(S, blocks);
    const solved = arrows[0].tx != null;
    // Between solves the arrows ride with the selected node and scale with the zoom, so they move as one piece
    const k = solvedR ? S.lr / solvedR : 1, f = settle(dt, 260);
    for (const a of arrows) {
      if (!solved) { a.el.classList.remove('show'); continue; }
      a.ex += (a.tx - a.ex) * f; a.ey += (a.ty - a.ey) * f;
      a.x = Math.min(Math.max(s.x + a.ex * k, leftEdge() + a.w / 2), W - 24 - a.w / 2);
      a.y = Math.min(Math.max(s.y + a.ey * k, 84 + a.h / 2), H - 64 - a.h / 2);
      a.el.style.transform = `translate(${a.x - a.w / 2}px, ${a.y - a.h / 2}px)`;
      a.el.classList.toggle('edge', a.off);
      a.el.classList.toggle('show', !flight);
      const d = arrowDir(a, S);
      // 3D: the arrow leans into the screen when the destination is earlier (further back in time)
      // and out toward you when it is later; the flat 2D map has no depth, so it stays flat there
      const dy = reduced ? 0 : Math.sign(byId.get(a.id).year - S.n.year);
      const want = Math.atan2(d.dy, d.dx);
      if (a.ang === null) a.ang = want;
      else { const diff = Math.atan2(Math.sin(want - a.ang), Math.cos(want - a.ang)); if (Math.abs(diff) > 0.04) a.ang += diff * f; }   // small wobbles are ignored
      const tf = `rotate(${a.ang.toFixed(3)}rad) rotateY(${dy * -62}deg)`;
      if (a.tf !== tf) { a.tf = tf; a.el.querySelector('svg').style.transform = tf; }
      obstacles.push({ x1: a.x - a.w / 2 - 6, x2: a.x + a.w / 2 + 6, y1: a.y - a.h / 2 - 6, y2: a.y + a.h / 2 + 6 });
    }
  }
  drawRipple(now);
}

/* Step badges are drawn in screen space so they sit on the right nodes */
const badges = new Map();
function drawRipple(now) {
  for (const it of items.values()) {
    const h = hops.get(it.n.id);
    const want = h >= 1 && h <= radius && it.alpha > 0.08;
    let b = badges.get(it.n.id);
    if (want && !b) { b = { el: document.createElement('span'), vis: false, visT: -1e9 }; b.el.className = 'badge'; overlay.appendChild(b.el); badges.set(it.n.id, b); }
    if (!b) continue;
    b.el.textContent = h;
    const bx = it.sx + it.sr * 0.78, by = it.sy - it.sr * 0.78;
    const covered = obstacles.some(o => bx > o.x1 - 12 && bx < o.x2 + 12 && by > o.y1 - 12 && by < o.y2 + 12);
    // Leaving the ripple hides at once; overlap changes wait a moment
    if (!want) { b.vis = false; b.visT = now; } else hold(b, !covered, now, still ? 0 : 350);
    b.el.style.opacity = b.vis ? 1 : 0;
    b.el.style.transform = `translate(${bx - 11}px, ${by - 11}px)`;
  }
}

/* ---------- Select ---------- */
function syncUrl() { history.replaceState(null, '', `?select=${selected}&radius=${radius}${detail ? '&detail=1' : ''}${exploring() ? '&mode=explore' : ''}${reduced ? '&motion=reduced' : ''}`); }
const modeBtns = { focus: document.getElementById('mode-focus'), explore: document.getElementById('mode-explore') };
function setMode(m, quiet = false) {
  if (m === mode) return;
  mode = m;
  document.body.classList.toggle('exploring', exploring());
  for (const [k, b] of Object.entries(modeBtns)) { b.classList.toggle('on', k === mode); b.setAttribute('aria-pressed', String(k === mode)); }
  controls.enableRotate = !exploring() && !reduced;   // in Explore (and in 2D), dragging never tilts the view
  if (exploring()) centerExplore();
  else { exploreGoal = null; if (!quiet) { fadeCardIn(); flyTo(selected); } }
  if (!quiet) syncUrl();
}
// Always the same centered, straight-on view, whatever angle Focus was left at; the year in view is kept
function centerExplore(year = focusYearNow()) {
  const c = new THREE.Vector3();
  for (const it of items.values()) c.add(it.pos);
  c.divideScalar(items.size);
  if (reduced) c.setX(X2(year)).setZ(0); else c.setZ(Z(year));
  exploreGoal = c.clone();
  flight = { t0: performance.now(), dur: calm() ? 1 : 1400, fromT: controls.target.clone(), toT: c, fromP: camera.position.clone(), toP: c.clone().add(exploreView()) };
}

/* ---------- Reduce motion: no animation, and a flat 2D graph (x = time) instead of depth ---------- */
const motionBtn = document.getElementById('motion');
function setReduced(on, save = true) {
  const year = focusYearNow();                         // Explore keeps the same year in view across the switch
  reduced = on;
  document.body.classList.toggle('reduced', on);
  motionBtn.classList.toggle('on', on);
  motionBtn.setAttribute('aria-pressed', String(on));
  for (const it of items.values()) { it.pos = on ? it.p2 : it.p3; it.group.position.copy(it.pos); it.lbl.position.copy(it.pos); }
  rail3.visible = !on; rail2.visible = on;
  for (const tk of ticks) tk.obj.position.set(on ? X2(tk.year) : AXIS.x - 9, on ? AXIS_2D_Y - 5 : AXIS.y, on ? 0 : Z(tk.year));
  scene.fog = on ? null : FOG;
  controls.enableRotate = !exploring() && !on;
  zoomGoal = null;
  chooseCardSide();
  renderArrows();
  renderShots();
  if (exploring()) centerExplore(year); else flyTo(selected);
  if (save) { try { localStorage.setItem('svhm-reduced-motion', on ? '1' : '0'); } catch (_) {} syncUrl(); }
}
motionBtn.onclick = () => setReduced(!reduced);
modeBtns.focus.onclick = () => setMode('focus');
modeBtns.explore.onclick = () => setMode('explore');
function chooseCardSide() {
  // Put the card on the side with fewer connections, using the camera's resting orientation
  const fwd = viewVec().negate().normalize(), right = new THREE.Vector3().crossVectors(fwd, YAXIS).normalize();
  const S = items.get(selected);
  let l = 0, r = 0;
  for (const e of adj.get(selected)) (items.get(e.id).pos.clone().sub(S.pos).dot(right) < 0 ? l++ : r++);
  cardSide = r <= l ? 1 : -1;
}
function select(id, opts = {}) {
  if (!byId.has(id)) return;
  if (exploring()) setMode('focus', true);            // select() does its own flight and card fade
  if (id !== selected) detail = false;
  selected = id;
  hops = hopsFrom(selected);
  chooseCardSide();
  rebuildGlints();
  renderCard();
  fadeCardIn();
  renderArrows();
  renderShots();
  renderIndex();
  if (!opts.noFly) flyTo(id);
  syncUrl();
  if (isMobile()) closeIndex();                       // the index stays open on larger screens; on phones it would cover the map
  dismissHint();
}
function neighborInTime(dir) {
  const me = byId.get(selected);
  const pick = list => list.filter(n => dir * (n.year - me.year) > 0).sort((a, b) => dir * (a.year - b.year))[0];
  return pick(adj.get(selected).map(e => byId.get(e.id))) || pick(nodes);
}

/* ---------- Index panel ---------- */
const indexEl = document.getElementById('index'), menu = document.getElementById('menu'), q = document.getElementById('q');
function openIndex() { indexEl.classList.add('open'); menu.setAttribute('aria-expanded', 'true'); document.body.classList.add('index-open'); }
function closeIndex() { indexEl.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); document.body.classList.remove('index-open'); }

/* ---------- Lightbox: a picture shown large, in full color, with its credit. Click outside it, the ×, or Esc to close. ---------- */
const lightbox = document.getElementById('lightbox');
function openLightbox(n) {
  if (!n || !n.picture) return;
  const img = lightbox.querySelector('img');
  img.src = n.picture; img.alt = n.name;
  lightbox.querySelector('.lb-name').textContent = n.name;
  lightbox.querySelector('.lb-credit').innerHTML = withLinks(esc(n.credit || ''));
  lightbox.classList.add('open');
  lightbox.querySelector('.lb-close').focus();
}
function closeLightbox() { lightbox.classList.remove('open'); }
lightbox.addEventListener('click', e => { if (e.target === lightbox || e.target.closest('.lb-close')) closeLightbox(); });

/* ---------- Legend: starts as a small button, opens a short key ---------- */
const legendEl = document.getElementById('legend'), legendBtn = document.getElementById('legend-btn');
function setLegend(open) {
  legendEl.classList.toggle('open', open);
  legendBtn.setAttribute('aria-expanded', String(open));
  chrome = null;                                       // labels make room for the open panel
}
legendBtn.onclick = () => setLegend(!legendEl.classList.contains('open'));

/* ---------- Corrections: anyone can ask for a fix, through the form linked in Settings ---------- */
const fixEl = document.getElementById('fix'), fixAbout = document.getElementById('fix-about');
fixAbout.innerHTML = '<option value="">The map in general</option>' + nodes.slice().sort((a, b) => a.year - b.year).map(n => `<option value="${n.id}">${esc(n.name)} (${esc(dateOf(n))})</option>`).join('');
const formLink = settings['Corrections form link'];
function openFix(id = selected) {
  if (formLink) return void window.open(formLink, '_blank', 'noopener');
  fixEl.classList.remove('sent');
  fixAbout.value = id || '';
  fixEl.classList.add('open');
  document.getElementById('fix-what').focus();
}
function closeFix() { fixEl.classList.remove('open'); }
document.getElementById('fix-open').onclick = () => openFix();
document.getElementById('fix-close').onclick = closeFix;
document.getElementById('fix-form').addEventListener('submit', e => {
  e.preventDefault();
  fixEl.classList.add('sent');
  e.target.reset();
});
menu.onclick = () => (indexEl.classList.contains('open') ? closeIndex() : openIndex());
document.getElementById('close').onclick = closeIndex;
q.addEventListener('input', renderIndex);
function renderIndex() {
  const term = q.value.trim().toLowerCase();
  document.getElementById('list').innerHTML = [['person', 'People'], ['event', 'Events'], ['place', 'Places']].map(([type, title]) => {
    const rows = nodes.filter(n => n.type === type && (!term || n.name.toLowerCase().includes(term))).sort((a, b) => a.year - b.year);
    return rows.length ? `<h3>${title}</h3>` + rows.map(n => `<button class="item ${n.id === selected ? 'on' : ''}" data-id="${n.id}">${glyph(n.type)}<span class="nm">${esc(n.name)}</span><span class="yr">${esc(dateOf(n))}</span></button>`).join('') : '';
  }).join('');
  document.querySelectorAll('#list .item').forEach(b => b.onclick = () => select(b.dataset.id));
}

/* ---------- Input: click, drag anything, swipe through time on phones ---------- */
const hint = document.getElementById('hint');
let hintGone = false;
function dismissHint() { if (!hintGone && performance.now() > 8000) { hintGone = true; hint.style.opacity = 0; } }

const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
function rayAt(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
}
// The collapsed card lets clicks through (CSS); a click that lands on its text should not count as empty space
const overCard = e => { const r = card.getBoundingClientRect(); return card.classList.contains('show') && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };
function pickAt(e) {
  rayAt(e);
  const targets = pickables.concat(shots.filter(s => s.mesh.visible && s.mesh.material.opacity > 0.2).map(s => s.mesh));
  return ray.intersectObjects(targets).find(h => h.object.userData.shot || items.get(h.object.userData.id).alpha > 0.15);
}
let press = null;
window.__map = { items, get shots() { return shots; }, get camOffset() { return camera.position.clone().sub(controls.target).toArray().map(v => +v.toFixed(2)); } };   // handy for debugging in the console
const dragPlane = new THREE.Plane(), hitPt = new THREE.Vector3();
renderer.domElement.addEventListener('pointerdown', e => {
  const hit = pickAt(e);
  press = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, hit, drag: false, id: e.pointerId };
  if (exploring()) try { renderer.domElement.setPointerCapture(e.pointerId); } catch (_) {}
  if (hit && !exploring()) {                         // pieces can be moved in Focus; in Explore a drag always moves the view
    controls.enabled = false;                          // grabbing something: don't rotate the view
    const obj = hit.object.userData.shot ? hit.object : items.get(hit.object.userData.id).group;
    dragPlane.set(ZAXIS, -obj.position.z);             // drag within the object's own time plane
    ray.ray.intersectPlane(dragPlane, hitPt);
    press.obj = obj; press.offset = obj.position.clone().sub(hitPt);
    try { renderer.domElement.setPointerCapture(e.pointerId); } catch (_) {}
  }
});
renderer.domElement.addEventListener('pointermove', e => {
  if (!press) { renderer.domElement.style.cursor = pickAt(e) ? 'grab' : 'default'; return; }
  const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
  if (press.hit && moved > 5 && !exploring()) {
    press.drag = true;
    renderer.domElement.style.cursor = 'grabbing';
    rayAt(e);
    if (ray.ray.intersectPlane(dragPlane, hitPt)) {
      const p = hitPt.add(press.offset);
      if (press.obj.userData.shot) press.obj.position.set(p.x, p.y, press.obj.position.z);
      else {
        const it = items.get(press.hit.object.userData.id);
        if (!reduced) { it.pos.x = p.x; it.group.position.x = p.x; }   // in 2D, x is the year, so only up/down
        it.pos.y = p.y;                                  // time never changes
      }
    }
  }
  if (exploring()) {
    if (moved > 5) renderer.domElement.style.cursor = 'grabbing';
    // Drag to move around; on phones a vertical swipe moves through time instead
    if (isMobile() || e.pointerType === 'touch') { panExplore(e.clientX - press.lastX, 0); travelYears((e.clientY - press.lastY) * 0.12); }
    else panExplore(e.clientX - press.lastX, e.clientY - press.lastY);
  } else if (!press.hit && (isMobile() || e.pointerType === 'touch')) {
    zoomBy(Math.exp((e.clientY - press.lastY) * 0.004));   // swipe to zoom in and out
  }
  press.lastX = e.clientX; press.lastY = e.clientY;
});
renderer.domElement.addEventListener('pointerup', e => {
  if (!press) return;
  controls.enabled = !isMobile();
  const click = Math.hypot(e.clientX - press.x, e.clientY - press.y) <= 5;
  if (click) {
    if (press.hit && !press.hit.object.userData.shot) {
      const id = press.hit.object.userData.id;
      if (id !== selected || exploring()) select(id);   // clicking anything in Explore focuses on it
      else if (byId.get(id).picture) openLightbox(byId.get(id));   // clicking the chosen shape again shows its picture large
    } else if (press.hit && press.hit.object.userData.shot) openLightbox(byId.get(selected));
    else if (!press.hit && !exploring() && !overCard(e)) setMode('explore');   // clicking empty space leaves the story and roams freely
  }
  press = null;
  renderer.domElement.style.cursor = 'default';
});
addEventListener('keydown', e => {
  if (e.key === 'Escape' && lightbox.classList.contains('open')) return closeLightbox();
  if (e.key === 'Escape' && fixEl.classList.contains('open')) return closeFix();
  if (e.key === 'Escape' && legendEl.classList.contains('open')) return setLegend(false);
  if (e.key === 'Escape') { if (exploring()) setMode('focus'); else if (detail) { detail = false; renderCard(); syncUrl(); } return closeIndex(); }
  if (e.target.closest && e.target.closest('input, textarea, select')) return;
  if (e.key === '/') { e.preventDefault(); openIndex(); q.focus(); return; }
  if (exploring()) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') travelYears(-5);      // ↑ heads into the scene, back in time
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') travelYears(5);
    return;
  }
  if (e.key === 'ArrowLeft') { const n = neighborInTime(-1); if (n) select(n.id); }
  if (e.key === 'ArrowRight') { const n = neighborInTime(1); if (n) select(n.id); }
});
function applyViewport() {
  camera.aspect = innerWidth / innerHeight;
  // On phones the card is a bottom sheet, so the scene's center is raised into the open space above it
  if (isMobile()) camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.2, innerWidth, innerHeight);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
  controls.enabled = !isMobile();
  document.body.classList.toggle('mobile', isMobile());
}
addEventListener('resize', () => { const was = document.body.classList.contains('mobile'); applyViewport(); if (was !== isMobile()) renderCard(); });

/* ---------- Frame loop ---------- */
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const born = performance.now();
let lastNow = born;
const lastCam = new THREE.Vector3(), lastTarget = new THREE.Vector3();
function tick(now) {
  const t = now / 1000;
  const dt = still ? 1e6 : Math.min(now - lastNow, 60);
  lastNow = now;
  if (flight) {
    const k = ease(Math.min(1, (now - flight.t0) / flight.dur));
    controls.target.lerpVectors(flight.fromT, flight.toT, k);
    camera.position.lerpVectors(flight.fromP, flight.toP, k);
    if (k === 1) flight = null;
  } else if (exploring() && exploreGoal) {
    // Glide toward the goal; the camera keeps the same fixed offset, so the angle never changes
    controls.target.add(tmp2.subVectors(exploreGoal, controls.target).multiplyScalar(lr(0.08)));
    camera.position.copy(controls.target).add(exploreView());
  } else if (zoomGoal !== null) {
    // Eased zoom toward the wheel's goal distance
    const off = tmp2.subVectors(camera.position, controls.target);
    const d = off.length();
    if (Math.abs(zoomGoal - d) > 0.01) { off.setLength(d + (zoomGoal - d) * 0.06); camera.position.copy(controls.target).add(off); }
  }
  if (exploring()) { camera.lookAt(controls.target); camera.updateMatrixWorld(); }
  else controls.update();
  camUp.setFromMatrixColumn(camera.matrixWorld, 1);
  // The overlay re-plans only once the camera has come to rest
  const camMoved = camera.position.distanceTo(lastCam) + controls.target.distanceTo(lastTarget);
  restFrames = camMoved < 0.004 ? restFrames + 1 : 0;
  lastCam.copy(camera.position); lastTarget.copy(controls.target);

  const focusYear = focusYearNow();
  const appear = calm() ? 1 : smooth(0, 1.8, (now - born) / 1000);
  const S = items.get(selected);

  for (const it of items.values()) {
    const { n, group, line, fill, photo, halo } = it;
    const h = hops.get(n.id);
    const isSel = n.id === selected;
    const inR = within(n.id);
    const dy = n.year - focusYear;
    const linked = isSel || (h !== undefined && h <= 1) || exploring();
    const direct = isSel || h === 1;
    let timeA = reduced ? 1 : dy > 0 && !linked ? 1 - smooth(3, 13, dy) : 1 - smooth(FADE_NEAR, FADE_FAR, Math.abs(dy));   // the flat graph shows every year at once   // what sits between you and the focus fades quickly
    if (direct) timeA = Math.max(timeA, 0.5);          // the selected node and its connections never fade out completely
    const overlapsSel = !isSel && S.lr > 0 && Math.hypot(it.lx - S.lx, it.ly - S.ly) < S.lr * 1.6 + it.lr * 1.15;
    const hopA = exploring() ? (isSel ? 1 : 0.85) : isSel ? 1 : (inR ? [1, 1, 0.8, 0.62][h] : 0.28) * (overlapsSel ? 0.06 : 1);
    it.alpha += (timeA * hopA * appear - it.alpha) * lr(0.06);
    group.quaternion.copy(camera.quaternion);
    it.bs += ((isSel ? SEL_SCALE : 1) - it.bs) * lr(0.06);
    const breath = calm() ? 0 : 1;
    group.scale.setScalar(it.bs * (1 + Math.sin(t * 0.45 + it.phase) * 0.02 * breath));   // a slow breath
    group.position.y = it.pos.y + Math.sin(t * 0.25 + it.phase) * 0.3 * breath;
    it.lbl.position.copy(it.pos);                      // names sit at the resting spot, so they don't drift with the breath
    // Selected: one pink outline with the photo inside. Direct connections show their photo too.
    line.material.color.lerp(isSel ? C_ROSE : C_WHITE, lr(0.08));
    line.material.opacity = it.alpha;
    fill.visible = it.alpha > 0.03;
    photo.material.opacity += ((isSel ? it.alpha : h === 1 ? it.alpha * 0.85 : 0) - photo.material.opacity) * lr(0.06);
    halo.material.opacity = 0;
    const c = toScreen(group.position), top = toScreen(tmp2.copy(group.position).addScaledVector(camUp, SIZE[n.type] * group.scale.x));
    it.sx = c.x; it.sy = c.y; it.sr = Math.abs(c.y - top.y);
    const rc = toScreen(it.pos), rtop = toScreen(tmp2.copy(it.pos).addScaledVector(camUp, SIZE[n.type] * it.bs));
    it.lx = rc.x; it.ly = rc.y; it.lr = Math.abs(rc.y - rtop.y);
  }

  for (const L of linkObjs) {
    const a = items.get(L.a).alpha, b = items.get(L.b).alpha;
    const touches = L.a === selected || L.b === selected;
    // The selected node's connections stay strong however far apart in time the two ends are, in both modes
    const target = touches ? Math.max(a, b) * 0.62 : Math.min(a, b) * (exploring() ? 0.3 : within(L.a) && within(L.b) ? 0.3 : 0.09);
    if (L.strong !== touches) { L.strong = touches; L.mesh.material = touches ? ribbonMatStrong : ribbonMat; L.head.material.fog = !touches; L.head.material.needsUpdate = true; }
    L.opacity += (target - L.opacity) * lr(0.06);
    L.mesh.visible = L.head.visible = L.opacity > 0.005;
    const ha = hops.get(L.a), hb = hops.get(L.b);
    const onPath = within(L.a) && within(L.b) && Math.abs(ha - hb) === 1;
    let tint = 0;
    if (touches || (onPath && !exploring())) tint = 0.85;
    if (L.mesh.visible) updateRibbon(L, L.opacity * (tint ? 1 + tint * 0.6 : 1), tint);
  }
  for (const g of glints) {
    const u = ((t / 9) + g.offset) % 1;
    const c = g.L.curve;
    if (!c) continue;
    bez(c.a, c.c, c.b, c.u0 + (c.u1 - c.u0) * u, g.mesh.position);
    g.mesh.quaternion.copy(camera.quaternion);
    g.mesh.material.opacity = calm() ? 0 : Math.sin(u * Math.PI) * 0.7 * g.L.opacity;
  }

  if (!calm()) {
    dust.rotation.z = t * 0.003;
    bright.rotation.z = -t * 0.002;
    bright.material.opacity = 0.45 + Math.sin(t * 0.4) * 0.1;
  }

  updateShots(now);
  layoutOverlay(now, dt);

  // Labels: below each shape; hidden where they would cover a shape, the card, an image, an arrow or another label
  const discs = [...items.values()].filter(it => it.alpha > 0.1);
  const taken = obstacles.concat(chromeRects());
  if (indexEl.classList.contains('open')) { const r = indexEl.getBoundingClientRect(); taken.push({ x1: r.left - 6, x2: r.right + 10, y1: r.top - 6, y2: r.bottom + 6 }); }
  const order = [...items.values()].sort((x, y) => y.alpha - x.alpha);
  for (const it of order) {
    const { el, inner, n } = it;
    if (!it.lw) { it.lw = inner.offsetWidth; it.lh = inner.offsetHeight; }
    const gap = Math.round(it.lr * (it.n.type === 'person' ? 1.05 : 1.2) + 10);
    inner.style.transform = `translateY(${gap}px)`;
    const r = { x1: it.lx - it.lw / 2 - 4, x2: it.lx + it.lw / 2 + 4, y1: it.ly + gap - 2, y2: it.ly + gap + it.lh + 2 };
    const never = it.alpha < 0.05 || (!exploring() && (n.id === selected || (!isMobile() && hops.get(n.id) === 1)));
    const blocked = taken.some(o => rectsHit(r, o))
      || discs.some(d => d !== it && rectHitsDisc(r, d.sx, d.sy, d.sr * (d.n.id === selected ? 1.4 : 1.15)));
    // Overlap changes wait a moment before a label hides or returns, and labels fade instead of blinking
    if (never) { it.vis = false; it.visT = now; } else hold(it, !blocked, now, still ? 0 : 350);
    it.op += ((it.vis ? it.alpha : 0) - it.op) * settle(dt, 140);
    el.style.opacity = it.op.toFixed(3);
    el.style.pointerEvents = it.vis ? 'auto' : 'none';
    if (it.vis) taken.push(r);
  }
  // Decade marks on the time axis: lowest priority, they step aside for everything else
  for (const tk of ticks) {
    if (!tk.w) { tk.w = tk.el.offsetWidth; tk.h = tk.el.offsetHeight; }
    const c = toScreen(tk.pos);
    const r = { x1: c.x - tk.w / 2 - 4, x2: c.x + tk.w / 2 + 4, y1: c.y - tk.h / 2 - 2, y2: c.y + tk.h / 2 + 2 };
    const a = (reduced ? 1 : 1 - smooth(8, 36, Math.abs(tk.year - focusYear))) * appear;
    const clear = !c.behind && a > 0.05 && !taken.some(o => rectsHit(r, o)) && !discs.some(d => rectHitsDisc(r, d.sx, d.sy, d.sr * 1.15));
    hold(tk, clear, now, still ? 0 : 350);
    tk.op += ((tk.vis ? a : 0) - tk.op) * settle(dt, 160);
    tk.el.style.opacity = tk.op.toFixed(3);
    if (tk.vis) taken.push(r);
  }
  // The readout names the years in view, not one year. The flat graph shows every year, so there it's what fits on screen.
  const span = reduced ? camera.position.distanceTo(controls.target) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect / XS : IN_VIEW;
  const range = `${Math.max(START_YEAR, Math.round(focusYear - span))}–${Math.min(END_YEAR, Math.round(focusYear + span))}`;
  if (range !== shownYear) { shownYear = range; yearEl.textContent = range; }

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  // The renderer places labels at fractions of a pixel, which makes their text shimmer: snap them to whole pixels
  for (const it of items.values()) it.el.style.transform = `translate(-50%, -50%) translate(${Math.round(it.lx)}px, ${Math.round(it.ly)}px)`;
  requestAnimationFrame(tick);
}

/* ---------- Start ---------- */
applyViewport();
hops = hopsFrom(selected);
chooseCardSide();
rebuildGlints();
renderCard();
fadeCardIn();
renderArrows();
renderShots();
renderIndex();
if (params.get('index') === '1') openIndex();
if (still) document.body.classList.add('still');
document.fonts.ready.then(() => { for (const it of items.values()) it.lw = 0; for (const a of arrows) a.w = 0; for (const tk of ticks) tk.w = 0; });
const intro = document.getElementById('intro');
let savedMotion = null;
try { savedMotion = localStorage.getItem('svhm-reduced-motion'); } catch (_) {}
const startReduced = params.get('motion') === 'reduced' || (params.get('motion') !== 'full' && (savedMotion === '1' || (savedMotion === null && matchMedia('(prefers-reduced-motion: reduce)').matches)));
if (startReduced) setReduced(true, false);
if (skipIntro || reduced) {
  intro.remove();
  const target = items.get(selected).pos;
  controls.target.copy(target);
  camera.position.copy(target.clone().add(viewVec()));
} else {
  flyTo(selected, 3000, true);
  setTimeout(() => intro.classList.add('gone'), 1600);
}
// The main link opens in Focus on the first event (South-View founded); ?mode=explore opens Explore
if (params.get('mode') === 'explore') {
  if (flight) { controls.target.copy(flight.toT); camera.position.copy(flight.toP); }
  setMode('explore');
}
requestAnimationFrame(tick);
