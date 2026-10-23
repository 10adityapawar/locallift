// Demo state lives in localStorage. Analytics are seeded (fake history)
// plus any live events created by tapping around in Shop mode.
import { BUSINESSES, INTERESTS, ORIGIN } from './data.js';

const KEY = 'locallift-demo-v1';
const DAY = 86400000;
const HISTORY_DAYS = 60;

const defaults = () => ({
  welcomed: false,
  mode: 'customer',     // 'customer' | 'business'
  interests: [],
  events: [],           // { type: 'view'|'tap'|'save', bizId, product?, interests, ts }
  saved: [],
  redeemed: [],
  ownedBizId: 1,
  plan: 'pro',
  customBiz: [],        // businesses created through the sign-up flow
  overrides: {},        // per-business edits: { [id]: { bio, tags, products } }
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch (e) { /* storage blocked: fall through to defaults */ }
  return defaults();
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

export const getState = () => state;

export function update(fn) {
  fn(state);
  save();
}

export function reset() {
  state = defaults();
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}

export function allBusinesses() {
  return [...BUSINESSES, ...state.customBiz].map(b => ({ ...b, ...(state.overrides[b.id] || {}) }));
}

export function getBiz(id) {
  return allBusinesses().find(b => b.id === Number(id));
}

export function track(type, bizId, extra = {}) {
  update(s => {
    s.events.push({ type, bizId: Number(bizId), interests: [...s.interests], ts: Date.now(), ...extra });
    if (s.events.length > 500) s.events.splice(0, s.events.length - 500);
  });
}

export function toggleSaved(bizId) {
  const id = Number(bizId);
  const isSaved = state.saved.includes(id);
  update(s => { s.saved = isSaved ? s.saved.filter(x => x !== id) : [...s.saved, id]; });
  if (!isSaved) track('save', id);
  return !isSaved;
}

export function createBusiness(fields) {
  const id = 100 + state.customBiz.length + 1;
  // Drop new businesses somewhere within ~1 mile of campus.
  const angle = Math.random() * Math.PI * 2;
  const dist = 0.004 + Math.random() * 0.01;
  const biz = {
    id, emoji: '🏪', color: '#8C1D40', tags: [], products: [], deal: null,
    tagline: 'New on LocalLift!', bio: '',
    lat: ORIGIN.lat + Math.sin(angle) * dist, lng: ORIGIN.lng + Math.cos(angle) * dist,
    hours: [9, 18], rating: 5.0, reviews: 0, priceLevel: 1, founded: new Date().getFullYear(),
    popularity: 0, isNew: true,
    ...fields,
  };
  update(s => { s.customBiz.push(biz); s.ownedBizId = id; });
  return biz;
}

// ---------- Seeded analytics ----------

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function getStats(biz, days) {
  const r = rng(biz.id * 7919 + 13);
  const today = startOfDay(Date.now());
  const views = [], taps = [], saves = [];

  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const dow = new Date(today - i * DAY).getDay();
    const weekend = dow === 5 || dow === 6 ? 1.35 : dow === 0 ? 1.15 : 1;
    const growth = 1 + ((HISTORY_DAYS - i) / HISTORY_DAYS) * 0.35;
    const v = Math.round(biz.popularity * weekend * growth * (0.75 + r() * 0.5));
    views.push(v);
    taps.push(Math.round(v * (0.28 + r() * 0.14)));
    saves.push(Math.round(v * (0.05 + r() * 0.05)));
  }

  const live = state.events.filter(e => e.bizId === biz.id);
  for (const e of live) {
    const idx = HISTORY_DAYS - 1 - Math.round((today - startOfDay(e.ts)) / DAY);
    if (idx < 0 || idx >= HISTORY_DAYS) continue;
    if (e.type === 'view') views[idx]++;
    else if (e.type === 'tap') taps[idx]++;
    else if (e.type === 'save') saves[idx]++;
  }

  const cur = a => a.slice(-days);
  const prev = a => a.slice(-2 * days, -days);
  const sum = a => a.reduce((x, y) => x + y, 0);

  const labels = cur(views).map((_, i) => {
    const d = new Date(today - (days - 1 - i) * DAY);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });

  return {
    days, labels,
    views: cur(views),
    totals: { views: sum(cur(views)), taps: sum(cur(taps)), saves: sum(cur(saves)) },
    prev: { views: sum(prev(views)), taps: sum(prev(taps)), saves: sum(prev(saves)) },
    liveToday: live.filter(e => e.ts >= today).length,
  };
}

export function topProducts(biz, stats) {
  const r = rng(biz.id * 31 + 7);
  const weights = biz.products.map(() => 0.4 + r());
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  const liveTaps = state.events.filter(e => e.bizId === biz.id && e.type === 'tap');
  const seededTotal = biz.popularity ? stats.totals.taps - liveTaps.length : 0;
  return biz.products
    .map((p, i) => ({
      label: p.name,
      value: Math.max(0, Math.round((seededTotal * weights[i]) / wsum)) + liveTaps.filter(e => e.product === i).length,
    }))
    .sort((a, b) => b.value - a.value);
}

export function viewerInterests(biz) {
  const r = rng(biz.id * 101 + 3);
  const scores = {};
  for (const it of INTERESTS) {
    scores[it.id] = biz.popularity ? (biz.tags.includes(it.id) ? 3 + r() * 3 : r() * 1.2) : 0;
  }
  for (const e of state.events) {
    if (e.bizId === biz.id && e.type === 'view') for (const i of e.interests || []) scores[i] = (scores[i] || 0) + 1;
  }
  const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
  return INTERESTS
    .map(it => ({ id: it.id, label: it.label, value: Math.round((scores[it.id] / total) * 100) }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

const PERSONAS = ['ASU student', 'Tempe local', 'Grad student', 'ASU staff', 'Visiting family', 'Downtown worker'];

export function recentViewers(biz, distanceOf) {
  const live = state.events
    .filter(e => e.bizId === biz.id && e.type === 'view')
    .slice(-4)
    .reverse()
    .map(e => ({
      who: 'Shopper on this device',
      interests: e.interests.slice(0, 3),
      dist: distanceOf(biz),
      when: timeAgo(e.ts),
      live: true,
    }));
  if (!biz.popularity) return live;

  const r = rng(biz.id * 977 + 1);
  const pool = INTERESTS.map(i => i.id);
  const seeded = [];
  let minutes = 6;
  for (let i = 0; i < 6; i++) {
    const own = biz.tags[Math.floor(r() * biz.tags.length)];
    const other = pool[Math.floor(r() * pool.length)];
    seeded.push({
      who: PERSONAS[Math.floor(r() * PERSONAS.length)],
      interests: [...new Set([own, other])],
      dist: 0.2 + r() * 2.3,
      when: minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)}h ago`,
      live: false,
    });
    minutes += Math.round(8 + r() * 50);
  }
  return [...live, ...seeded];
}

function timeAgo(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
