// Where the map's content comes from: the content sheet in Google Drive (see docs/MAINTENANCE.md).
// If the sheet can't be read, the map uses the saved copy in content/ instead, so it never shows up empty.
// Add ?content=saved to the address to skip the sheet and test the saved copy.

export const SHEET_ID = '1TmdpE1abFiaWOeoYWzv-XDwXrCuz3NShifqZV8q9DA4';
const fromSheet = tab => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tab)}`;
const fromSaved = tab => `content/${tab.toLowerCase()}.csv`;

// RFC 4180 CSV: quoted fields may hold commas, quotes ("") and line breaks
function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head = [], ...body] = rows.filter(r => r.some(v => v.trim()));
  const keys = head.map(h => h.trim());
  return body.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

async function readTab(tab, url) {
  const res = await fetch(url(tab), { cache: 'no-store' });
  if (!res.ok) throw new Error(`${tab}: ${res.status}`);
  const text = await res.text();
  if (/^\s*</.test(text)) throw new Error(`${tab}: the sheet isn't shared for viewing`);   // Google answers a sign-in page
  return parseCsv(text);
}

async function readAll(url) {
  const [entries, connections, settings] = await Promise.all(['Entries', 'Connections', 'Settings'].map(t => readTab(t, url)));
  if (!entries.length || !('Name' in entries[0])) throw new Error('Entries tab has no Name column');
  return { entries, connections, settings };
}

const slug = s => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-');
const yes = v => !/^(no|n|false|hide|hidden)$/i.test(v || '');
const firstYear = s => { const m = String(s || '').match(/\b(1[6-9]\d\d|20\d\d)\b/); return m ? +m[1] : NaN; };

export async function loadContent() {
  let raw, where = 'sheet';
  try {
    if (new URLSearchParams(location.search).get('content') === 'saved') throw new Error('asked for the saved copy');
    raw = await readAll(fromSheet);
  } catch (err) {
    console.warn('Using the saved copy of the content:', err.message);
    raw = await readAll(fromSaved); where = 'saved';
  }

  const nodes = [], byName = new Map();
  for (const r of raw.entries) {
    const name = r['Name'];
    if (!name || !yes(r['Show on map']) || byName.has(name.toLowerCase())) continue;
    const n = {
      id: slug(name), name,
      type: /event/i.test(r['Type']) ? 'event' : 'person',
      dates: r['Dates'],
      year: Number(r['Year on map']) || firstYear(r['Dates']),
      text: r['Text from the notes'], source: r['Source'],
      rests: r['Rests at South-View'],
      picture: r['Picture link'], credit: r['Picture credit'],
    };
    nodes.push(n); byName.set(name.toLowerCase(), n);
  }

  const links = [];
  for (const c of raw.connections) {
    const a = byName.get((c['From'] || '').toLowerCase()), b = byName.get((c['To'] || '').toLowerCase());
    if (!a || !b) { if (c['From'] || c['To']) console.warn('Connection skipped, name not found in Entries:', c['From'], '→', c['To']); continue; }
    links.push({ a: a.id, b: b.id, rel: c['Connection'] || 'connected to' });
  }

  // A row with no usable year sits at the year of an event it connects to
  for (const n of nodes) if (!n.year) {
    const ev = links.map(l => (l.a === n.id ? l.b : l.b === n.id ? l.a : null)).map(id => nodes.find(m => m.id === id)).find(m => m && m.year);
    n.year = ev ? ev.year : NaN;
  }
  const placed = nodes.filter(n => n.year);
  for (const n of nodes) if (!n.year) console.warn('Left off the map, no year:', n.name);
  for (const n of placed) n.dates = n.dates || String(n.year);
  layout(placed, links);

  const settings = Object.fromEntries(raw.settings.map(s => [s['Setting'], s['Value']]));
  const years = placed.map(n => n.year);
  return {
    nodes: placed,
    links: links.filter(l => placed.some(n => n.id === l.a) && placed.some(n => n.id === l.b)),
    settings, where,
    START_YEAR: Math.floor((Math.min(...years) - 4) / 10) * 10,
    END_YEAR: Math.ceil((Math.max(...years) + 4) / 10) * 10,
  };
}

// Nobody places shapes by hand: each event gets a spot, and the people connected to it sit in a ring around it.
function layout(nodes, links) {
  const events = nodes.filter(n => n.type === 'event').sort((a, b) => a.year - b.year);
  // The first event sits in the middle; later ones step around it so their rings don't sit on top of each other
  events.forEach((e, i) => { const a = i * 2.1, d = i ? 38 : 0; e.x = Math.cos(a) * d; e.y = Math.sin(a) * d * 0.7; });
  const home = new Map();
  for (const n of nodes) if (n.type !== 'event') {
    const ev = links.map(l => (l.a === n.id ? l.b : l.b === n.id ? l.a : null)).map(id => events.find(e => e.id === id)).filter(Boolean);
    const h = ev.sort((p, q) => Math.abs(p.year - n.year) - Math.abs(q.year - n.year))[0];
    if (!home.has(h)) home.set(h, []);
    home.get(h).push(n);
  }
  for (const [h, people] of home) {
    const cx = h ? h.x : 0, cy = h ? h.y : 0, r = 15 + people.length * 2.4;
    people.forEach((p, i) => { const a = (i / people.length) * Math.PI * 2 + 0.6; p.x = cx + Math.cos(a) * r; p.y = cy + Math.sin(a) * r * 0.8; });
  }
}
