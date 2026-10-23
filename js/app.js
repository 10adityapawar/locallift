import { APP, INTERESTS, ORIGIN, PLANS, SMALL_LIMITS, CATEGORIES } from './data.js';
import * as store from './store.js';
import { rankForYou, distanceMi, isOpen } from './recommend.js';
import * as ai from './ai.js';
import { lineChart, barList } from './charts.js';

const app = document.getElementById('app');
const tabbar = document.getElementById('tabbar');
const S = () => store.getState();

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const interestById = Object.fromEntries(INTERESTS.map(i => [i.id, i]));
const money = n => (n % 1 ? `$${n.toFixed(2)}` : `$${n}`);
const milesFrom = b => distanceMi(ORIGIN, b);
const fmtMi = d => (d < 0.1 ? '<0.1 mi' : `${d.toFixed(1)} mi`);
const fmtHour = h => { const p = h >= 12 ? 'pm' : 'am'; const x = h % 12 || 12; return `${x}${p}`; };
const num = n => n.toLocaleString();

// View-only state that doesn't need to survive a reload.
const ui = {
  q: '', cat: 'All', openNow: false, hasDeal: false, sort: 'distance',
  range: 30, expanded: null,
  aiKeywords: null, aiTone: 'Friendly', aiDrafts: null, aiTags: null, aiThinking: false, animate: false,
  joinResult: null,
};

// ---------- Routing ----------

const routes = [
  [/^\/welcome$/, viewWelcome, null],
  [/^\/interests$/, viewInterests, 'customer'],
  [/^\/foryou$/, viewForYou, 'customer'],
  [/^\/discover$/, viewDiscover, 'customer'],
  [/^\/deals$/, viewDeals, 'customer'],
  [/^\/saved$/, viewSaved, 'customer'],
  [/^\/biz\/(\d+)$/, viewBiz, null],
  [/^\/owner$/, viewOwnerDash, 'business'],
  [/^\/owner\/profile$/, viewOwnerProfile, 'business'],
  [/^\/owner\/plans$/, viewOwnerPlans, 'business'],
  [/^\/owner\/join$/, viewOwnerJoin, 'business'],
];

const home = () => (!S().welcomed ? '/welcome' : S().mode === 'business' ? '/owner' : '/foryou');
const go = path => { location.hash = '#' + path; };

function render(entering = false) {
  const path = location.hash.replace(/^#/, '');
  for (const [re, view, mode] of routes) {
    const m = path.match(re);
    if (!m) continue;
    if (mode && S().mode !== mode) store.update(s => { s.mode = mode; });
    if (entering && re.source.startsWith('^\\/biz') && S().mode === 'customer') {
      store.track('view', m[1]);
      ui.expanded = null;
    }
    app.innerHTML = view(...m.slice(1));
    renderChrome(path);
    afterRender();
    if (entering) window.scrollTo(0, 0);
    return;
  }
  location.replace('#' + home());
}

const rerender = () => render(false);

function renderChrome(path) {
  const mode = S().mode;
  document.body.dataset.mode = mode;
  document.body.classList.toggle('no-tabs', path === '/welcome');
  document.querySelectorAll('[data-action="mode"]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
  });

  const tabs = mode === 'business'
    ? [['/owner', '📊', 'Dashboard'], ['/owner/profile', '✨', 'Profile'], [`/biz/${S().ownedBizId}`, '👀', 'Preview'], ['/owner/plans', '💳', 'Plans']]
    : [['/foryou', '🔥', 'For You'], ['/discover', '🧭', 'Discover'], ['/deals', '🏷️', 'Deals'], ['/saved', '♥', 'Saved']];
  tabbar.innerHTML = tabs.map(([href, icon, label]) => `
    <a href="#${href}" class="tab" ${path === href ? 'aria-current="page"' : ''}>
      <span class="tab-icon" aria-hidden="true">${icon}</span><span>${label}</span>
    </a>`).join('');
}

// ---------- Shared pieces ----------

function logoTile(b, size = '') {
  return `<div class="logo-tile ${size}" style="--tile:${esc(b.color)}" aria-hidden="true">${esc(b.emoji)}</div>`;
}

function openBadge(b) {
  return isOpen(b)
    ? `<span class="status open">Open · until ${fmtHour(b.hours[1])}</span>`
    : `<span class="status closed">Closed · opens ${fmtHour(b.hours[0])}</span>`;
}

function bizCard(b, reasons = [], featured = false) {
  const saved = S().saved.includes(b.id);
  return `
  <article class="card biz-card ${featured ? 'featured' : ''}" data-action="open-biz" data-id="${b.id}" role="link" tabindex="0" aria-label="${esc(b.name)}">
    ${featured ? `<div class="featured-banner" style="--tile:${esc(b.color)}"><span class="pill gold">✨ Top pick for you</span><span class="featured-emoji" aria-hidden="true">${esc(b.emoji)}</span></div>` : ''}
    <div class="biz-row">
      ${featured ? '' : logoTile(b)}
      <div class="biz-main">
        <div class="biz-title"><h3>${esc(b.name)}</h3><span class="verified" title="Verified small business">✓</span></div>
        <p class="meta">${esc(b.category)} · ${fmtMi(milesFrom(b))} · ★ ${b.rating.toFixed(1)}${b.reviews ? ` (${b.reviews})` : ''}</p>
        <p class="tagline">${esc(b.tagline)}</p>
        <div class="chips-inline">
          ${openBadge(b)}
          ${b.deal ? `<span class="pill deal">🏷️ ${esc(b.deal.title)}</span>` : ''}
        </div>
        ${reasons.length ? `<div class="why">${reasons.map(r => `<span>✨ ${esc(r)}</span>`).join('')}</div>` : ''}
      </div>
      <button class="heart ${saved ? 'on' : ''}" data-action="save" data-id="${b.id}" aria-pressed="${saved}" aria-label="${saved ? 'Remove from saved' : 'Save'} ${esc(b.name)}">${saved ? '♥' : '♡'}</button>
    </div>
  </article>`;
}

function interestChips(selected, action) {
  return INTERESTS.map(i => `
    <button class="chip ${selected.includes(i.id) ? 'on' : ''}" data-action="${action}" data-id="${i.id}" aria-pressed="${selected.includes(i.id)}">
      <span aria-hidden="true">${i.emoji}</span> ${esc(i.label)}
    </button>`).join('');
}

function pageHead(title, sub = '', right = '') {
  return `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div>${right}</div>`;
}

// ---------- Customer views ----------

function viewWelcome() {
  const count = store.allBusinesses().length;
  return `
  <section class="welcome">
    <div class="welcome-logo">${logoSvg(84)}</div>
    <h1 class="welcome-title">${esc(APP.name)}</h1>
    <p class="welcome-slogan">${esc(APP.slogan)}</p>
    <p class="welcome-copy">Discover <strong>verified small businesses</strong> around ASU. No big-box chains and no ads from corporations, just your neighbors.</p>
    <div class="stat-strip">
      <div><strong>${count}</strong><span>local shops</span></div>
      <div><strong>100%</strong><span>small-biz verified</span></div>
      <div><strong>0</strong><span>chains</span></div>
    </div>
    <div class="stack">
      <button class="btn primary big" data-action="start" data-mode="customer">🛍️ I'm shopping local</button>
      <button class="btn ghost big" data-action="start" data-mode="business">🏪 I own a small business</button>
    </div>
    <p class="muted small center">Demo prototype · Spark Tank Fall 2026</p>
  </section>`;
}

function viewInterests() {
  const sel = S().interests;
  return `
  ${pageHead('What are you into?', 'Pick a few. We\'ll build your For You feed around them.')}
  <div class="chip-grid">${interestChips(sel, 'toggle-interest')}</div>
  <div class="sticky-cta">
    <button class="btn primary big" data-action="go" data-to="/foryou">${sel.length ? `Show my feed (${sel.length} picked)` : 'Skip for now'}</button>
  </div>`;
}

function viewForYou() {
  const st = S();
  const ranked = rankForYou(store.allBusinesses(), st);
  const [top, ...rest] = ranked;
  const chips = st.interests.length
    ? st.interests.map(id => `<span class="pill">${interestById[id].emoji} ${esc(interestById[id].label)}</span>`).join('')
    : '<span class="muted small">No interests picked yet</span>';
  return `
  ${pageHead('For You', `Picked for you near ${esc(ORIGIN.label)}`)}
  <div class="interest-bar">
    <div class="chips-inline scroll-x">${chips}</div>
    <a href="#/interests" class="link small">Edit</a>
  </div>
  <p class="ai-note">✨ Your feed learns from your interests and what you tap. Try opening a few shops, then come back.</p>
  ${top ? bizCard(top.biz, top.reasons, true) : ''}
  <div class="list">${rest.map(r => bizCard(r.biz, r.reasons)).join('')}</div>`;
}

function filteredBusinesses() {
  const q = ui.q.trim().toLowerCase();
  let list = store.allBusinesses().filter(b => {
    if (ui.cat !== 'All' && b.category !== ui.cat) return false;
    if (ui.openNow && !isOpen(b)) return false;
    if (ui.hasDeal && !b.deal) return false;
    if (q) {
      const hay = [b.name, b.category, b.tagline, b.area, ...b.tags, ...b.products.map(p => p.name)].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  list.sort(ui.sort === 'rating' ? (a, b) => b.rating - a.rating : (a, b) => milesFrom(a) - milesFrom(b));
  return list;
}

function miniMap(list) {
  const R = 1.2; // miles shown from center to edge
  const SC = 150;
  const cos = Math.cos((ORIGIN.lat * Math.PI) / 180);
  const dots = list.map(b => {
    const x = ((b.lng - ORIGIN.lng) * 69 * cos) / R * SC;
    const y = (-(b.lat - ORIGIN.lat) * 69) / R * SC;
    if (Math.hypot(x, y) > SC - 8) return '';
    return `<g class="map-dot" data-action="open-biz" data-id="${b.id}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})" tabindex="0" role="link" aria-label="${esc(b.name)}">
      <circle r="13" fill="${esc(b.color)}"/><text text-anchor="middle" dy="4.5" font-size="13">${esc(b.emoji)}</text></g>`;
  }).join('');
  return `
  <div class="card map-card">
    <svg viewBox="-160 -160 320 320" class="mini-map" role="img" aria-label="Map of shops around ${esc(ORIGIN.label)}">
      <circle r="${SC}" class="ring outer"/><circle r="${SC / R}" class="ring"/><circle r="${SC * 0.5 / R}" class="ring"/>
      <text y="${-SC * 0.5 / R - 4}" class="ring-label" text-anchor="middle">0.5 mi</text>
      <text y="${-SC / R - 4}" class="ring-label" text-anchor="middle">1 mi</text>
      <g class="you"><circle r="9" class="you-pulse"/><circle r="6"/></g>
      ${dots}
    </svg>
    <p class="muted small center">You're at ${esc(ORIGIN.label)} · tap a pin</p>
  </div>`;
}

function discoverResults() {
  const list = filteredBusinesses();
  return `
    ${miniMap(list)}
    <p class="muted small">${list.length} verified small business${list.length === 1 ? '' : 'es'}</p>
    <div class="list">${list.map(b => bizCard(b)).join('') || '<div class="empty">No shops match. Try clearing a filter.</div>'}</div>`;
}

function viewDiscover() {
  const cats = ['All', ...CATEGORIES.filter(c => store.allBusinesses().some(b => b.category === c))];
  return `
  ${pageHead('Discover', 'Small businesses near you, closest first')}
  <label class="search">
    <span aria-hidden="true">🔎</span>
    <input id="search" type="search" placeholder="Tacos, vintage, nails…" value="${esc(ui.q)}" aria-label="Search businesses">
  </label>
  <div class="chips-inline scroll-x">${cats.map(c => `<button class="chip ${ui.cat === c ? 'on' : ''}" data-action="cat" data-id="${esc(c)}" aria-pressed="${ui.cat === c}">${esc(c)}</button>`).join('')}</div>
  <div class="filters">
    <button class="chip ${ui.openNow ? 'on' : ''}" data-action="filter" data-id="openNow" aria-pressed="${ui.openNow}">🟢 Open now</button>
    <button class="chip ${ui.hasDeal ? 'on' : ''}" data-action="filter" data-id="hasDeal" aria-pressed="${ui.hasDeal}">🏷️ Has deal</button>
    <label class="select-wrap">Sort
      <select id="sort"><option value="distance" ${ui.sort === 'distance' ? 'selected' : ''}>Distance</option><option value="rating" ${ui.sort === 'rating' ? 'selected' : ''}>Rating</option></select>
    </label>
  </div>
  <div id="results">${discoverResults()}</div>`;
}

function viewDeals() {
  const withDeals = store.allBusinesses().filter(b => b.deal).sort((a, b) => milesFrom(a) - milesFrom(b));
  const red = S().redeemed;
  return `
  ${pageHead('Deals', 'Exclusive offers from local shops')}
  <div class="promo-banner">
    <strong>🎉 Welcome offer</strong>
    <p>New to ${esc(APP.name)}? Your first purchase at any shop is <strong>10% off</strong>, on top of the deals below.</p>
  </div>
  <div class="list">
  ${withDeals.map(b => {
    const done = red.includes(b.id);
    return `
    <article class="card deal-card">
      <div class="biz-row" data-action="open-biz" data-id="${b.id}" role="link" tabindex="0">
        ${logoTile(b)}
        <div class="biz-main">
          <h3>${esc(b.deal.title)}</h3>
          <p class="meta">${esc(b.name)} · ${fmtMi(milesFrom(b))}</p>
          <p class="small muted">${esc(b.deal.detail)}</p>
        </div>
      </div>
      ${done
        ? `<div class="coupon"><span>Show this code</span><strong>${esc(b.deal.code)}</strong></div>`
        : `<button class="btn primary" data-action="redeem" data-id="${b.id}">Get code</button>`}
    </article>`;
  }).join('')}
  </div>`;
}

function viewSaved() {
  const saved = store.allBusinesses().filter(b => S().saved.includes(b.id));
  return `
  ${pageHead('Saved', 'Your favorite local spots')}
  <div class="list">${saved.map(b => bizCard(b)).join('') || `
    <div class="empty"><div class="empty-icon">♡</div><p>Tap the heart on any shop to save it here.</p>
    <a class="btn ghost" href="#/discover">Find shops</a></div>`}
  </div>`;
}

function viewBiz(id) {
  const b = store.getBiz(id);
  if (!b) return `<div class="empty">Business not found. <a href="#/discover">Back to Discover</a></div>`;
  const st = S();
  const isOwnerPreview = st.mode === 'business' && b.id === st.ownedBizId;
  const saved = st.saved.includes(b.id);
  return `
  ${isOwnerPreview ? `<div class="owner-banner">👀 This is how shoppers see your profile. <a href="#/owner/profile">Edit</a></div>` : ''}
  <button class="back" data-action="back" aria-label="Back">‹ Back</button>
  <section class="biz-hero" style="--tile:${esc(b.color)}">
    <div class="biz-hero-emoji" aria-hidden="true">${esc(b.emoji)}</div>
  </section>
  <section class="biz-head">
    <h1>${esc(b.name)}</h1>
    <div class="verified-badge">✓ Verified Small Business</div>
    <p class="meta">${esc(b.category)} · ${esc(b.area || '')} · ${fmtMi(milesFrom(b))}</p>
    <p class="meta">★ ${b.rating.toFixed(1)} ${b.reviews ? `· ${b.reviews} reviews` : '· New'} · ${'$'.repeat(b.priceLevel)}</p>
    <div class="chips-inline">${openBadge(b)}<span class="pill">🕒 ${fmtHour(b.hours[0])}–${fmtHour(b.hours[1])} daily</span></div>
    <div class="action-row">
      <button class="btn ${saved ? 'primary' : 'ghost'}" data-action="save" data-id="${b.id}" aria-pressed="${saved}">${saved ? '♥ Saved' : '♡ Save'}</button>
      <button class="btn ghost" data-action="toast" data-msg="In the real app this opens directions in Maps.">📍 Directions</button>
      <button class="btn ghost" data-action="share" data-id="${b.id}">↗ Share</button>
    </div>
  </section>

  ${b.deal ? `
  <section class="card deal-inline">
    <div><strong>🏷️ ${esc(b.deal.title)}</strong><p class="small muted">${esc(b.deal.detail)}</p></div>
    ${st.redeemed.includes(b.id) ? `<div class="coupon small"><strong>${esc(b.deal.code)}</strong></div>` : `<button class="btn primary" data-action="redeem" data-id="${b.id}">Get code</button>`}
  </section>` : ''}

  <section class="section">
    <h2>About</h2>
    <p>${esc(b.bio) || '<span class="muted">This business hasn\'t written a bio yet.</span>'}</p>
    <div class="chips-inline">${b.tags.map(t => `<span class="pill">${interestById[t]?.emoji || ''} ${esc(interestById[t]?.label || t)}</span>`).join('')}</div>
  </section>

  <section class="section">
    <h2>Products & services</h2>
    ${b.products.length ? `<div class="product-grid">${b.products.map((p, i) => `
      <button class="product ${ui.expanded === i ? 'open' : ''}" data-action="tap-product" data-id="${b.id}" data-idx="${i}" aria-expanded="${ui.expanded === i}">
        <span class="product-emoji" aria-hidden="true">${esc(p.emoji || '🛒')}</span>
        <span class="product-name">${esc(p.name)}</span>
        <span class="product-price">${money(p.price)}</span>
        ${ui.expanded === i ? `<span class="product-desc">${esc(p.desc || '')}</span>` : ''}
      </button>`).join('')}</div>` : '<p class="muted">No products listed yet.</p>'}
  </section>

  <section class="section owner-card card">
    <div class="avatar" aria-hidden="true">${esc((b.owner || '?')[0])}</div>
    <div>
      <strong>Run by ${esc(b.owner || 'a local owner')}</strong>
      <p class="small muted">Local since ${b.founded}${b.employees ? ` · ${b.employees} employee${b.employees === 1 ? '' : 's'}` : ''}. Every dollar here stays in Tempe.</p>
    </div>
  </section>`;
}

// ---------- Business views ----------

function ownedBiz() {
  return store.getBiz(S().ownedBizId) || store.getBiz(1);
}

function delta(cur, prev) {
  if (!prev) return cur ? '<span class="delta up">New</span>' : '';
  const pct = Math.round(((cur - prev) / prev) * 100);
  return `<span class="delta ${pct >= 0 ? 'up' : 'down'}">${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}%</span>`;
}

function viewOwnerDash() {
  const b = ownedBiz();
  const st = S();
  const stats = store.getStats(b, ui.range);
  const interests = store.viewerInterests(b);
  const products = store.topProducts(b, stats);
  const viewers = store.recentViewers(b, milesFrom);
  const tips = ai.insights(b, stats, interests, products);
  const tapRate = stats.totals.views ? Math.round((stats.totals.taps / stats.totals.views) * 100) : 0;
  const prevRate = stats.prev.views ? Math.round((stats.prev.taps / stats.prev.views) * 100) : 0;
  const locked = st.plan === 'free';
  const plan = PLANS.find(p => p.id === st.plan);

  const bizOptions = store.allBusinesses().map(x => `<option value="${x.id}" ${x.id === b.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('');

  return `
  ${pageHead(`Hi, ${esc(b.owner || 'there')} 👋`, '', `<span class="pill plan-pill">${esc(plan.name)} plan</span>`)}
  <div class="owner-switch">
    ${logoTile(b, 'sm')}
    <label class="select-wrap grow"><span class="sr-only">Your business</span>
      <select id="owned-biz">${bizOptions}</select>
    </label>
  </div>
  <div class="row-between">
    <div class="segmented" role="group" aria-label="Date range">
      <button data-action="range" data-id="7" aria-pressed="${ui.range === 7}">7 days</button>
      <button data-action="range" data-id="30" aria-pressed="${ui.range === 30}">30 days</button>
    </div>
    ${stats.liveToday ? `<span class="live"><span class="live-dot"></span>${stats.liveToday} live today</span>` : ''}
  </div>

  ${!stats.totals.views ? `
  <div class="promo-banner">
    <strong>🚀 Your profile is live!</strong>
    <p>Switch to <strong>Shop</strong> mode and open your business. You'll see the views appear here in real time.</p>
  </div>` : ''}

  <div class="kpis">
    <div class="kpi"><span>Profile views</span><strong>${num(stats.totals.views)}</strong>${delta(stats.totals.views, stats.prev.views)}</div>
    <div class="kpi"><span>Product taps</span><strong>${num(stats.totals.taps)}</strong>${delta(stats.totals.taps, stats.prev.taps)}</div>
    <div class="kpi"><span>Saves</span><strong>${num(stats.totals.saves)}</strong>${delta(stats.totals.saves, stats.prev.saves)}</div>
    <div class="kpi"><span>Tap rate</span><strong>${tapRate}%</strong>${prevRate ? `<span class="delta ${tapRate >= prevRate ? 'up' : 'down'}">${tapRate >= prevRate ? '▲' : '▼'} ${Math.abs(tapRate - prevRate)} pts</span>` : ''}</div>
  </div>

  <section class="card">
    <h2 class="card-title">Profile views</h2>
    ${lineChart(stats.views, stats.labels)}
  </section>

  <section class="card ai-card">
    <h2 class="card-title">✨ AI insights</h2>
    <ul class="tips">${tips.map(t => `<li><span aria-hidden="true">${t.icon}</span><p>${esc(t.text)}</p></li>`).join('')}</ul>
  </section>

  <section class="card ${locked ? 'locked' : ''}">
    <h2 class="card-title">👀 Who viewed you</h2>
    <ul class="viewers">${viewers.slice(0, 6).map(v => `
      <li class="${v.live ? 'is-live' : ''}">
        <div class="avatar sm" aria-hidden="true">${v.live ? '📱' : '👤'}</div>
        <div class="grow">
          <strong>${esc(v.who)}</strong>${v.live ? ' <span class="pill live-pill">LIVE</span>' : ''}
          <p class="small muted">${v.interests.map(i => esc(interestById[i]?.label || i)).join(', ') || 'No interests set'} · ${fmtMi(v.dist)} away</p>
        </div>
        <span class="small muted nowrap">${esc(v.when)}</span>
      </li>`).join('') || '<li class="muted small">No viewers yet.</li>'}
    </ul>
    <p class="small muted">Shoppers stay anonymous. You see interests and distance, never names.</p>
    ${locked ? `<div class="lock-overlay"><p>🔒 See who's viewing you with <strong>Pro</strong></p><a class="btn primary" href="#/owner/plans">Upgrade</a></div>` : ''}
  </section>

  <div class="two-col">
    <section class="card ${locked ? 'locked' : ''}">
      <h2 class="card-title">Viewer interests</h2>
      ${barList(interests, '%')}
      ${locked ? '<div class="lock-overlay"><p>🔒 Pro</p></div>' : ''}
    </section>
    <section class="card">
      <h2 class="card-title">Top products</h2>
      ${barList(products.slice(0, 5), ' taps')}
    </section>
  </div>

  <a class="btn ghost full" href="#/owner/join">＋ List another business</a>`;
}

function viewOwnerProfile() {
  const b = ownedBiz();
  if (ui.aiKeywords === null || ui.aiKeywordsFor !== b.id) {
    ui.aiKeywords = b.tags.map(t => interestById[t]?.label.toLowerCase()).filter(Boolean).join(', ');
    ui.aiKeywordsFor = b.id;
    ui.aiDrafts = null;
    ui.aiTags = null;
  }
  const locked = S().plan === 'free';
  const tags = ui.aiTags || b.tags;

  return `
  ${pageHead('Your profile', esc(b.name))}

  <section class="card">
    <h2 class="card-title">Current bio</h2>
    <p>${esc(b.bio) || '<span class="muted">No bio yet. Let the AI assistant write one below.</span>'}</p>
  </section>

  <section class="card ai-card ${locked ? 'locked' : ''}">
    <h2 class="card-title">✨ AI Profile Assistant</h2>
    <p class="small muted">Tell us a few things you're known for and we'll draft a bio that helps the right shoppers find you.</p>
    <label class="field">What are you known for?
      <textarea id="ai-keywords" rows="2" placeholder="e.g. cold brew, horchata lattes, friendly baristas">${esc(ui.aiKeywords)}</textarea>
    </label>
    <div class="field">Tone
      <div class="segmented" role="group" aria-label="Tone">
        ${['Friendly', 'Professional', 'Playful'].map(t => `<button data-action="tone" data-id="${t}" aria-pressed="${ui.aiTone === t}">${t}</button>`).join('')}
      </div>
    </div>
    <button class="btn primary full" data-action="ai-generate" ${ui.aiThinking ? 'disabled' : ''}>
      ${ui.aiThinking ? '<span class="spinner"></span> Writing…' : '✨ Write my bio'}
    </button>
    ${ui.aiDrafts ? `
      <div class="drafts">
        ${ui.aiDrafts.map((d, i) => `
          <div class="draft">
            <span class="draft-label">Option ${i + 1}</span>
            <p data-type="${esc(d)}">${ui.animate ? '' : esc(d)}</p>
            <button class="btn ghost sm" data-action="use-bio" data-idx="${i}">Use this bio</button>
          </div>`).join('')}
      </div>` : ''}
    ${locked ? `<div class="lock-overlay"><p>🔒 The AI Profile Assistant is part of <strong>Pro</strong></p><a class="btn primary" href="#/owner/plans">Upgrade</a></div>` : ''}
  </section>

  <section class="card">
    <h2 class="card-title">Tags ${ui.aiTags ? '<span class="pill gold">✨ AI suggested</span>' : ''}</h2>
    <p class="small muted">Tags decide whose For You feed you appear in.</p>
    <div class="chip-grid compact">${interestChips(tags, 'toggle-tag')}</div>
  </section>

  <section class="card">
    <h2 class="card-title">Products & services</h2>
    <ul class="edit-products">
      ${b.products.map((p, i) => `
        <li>
          <span class="product-emoji" aria-hidden="true">${esc(p.emoji || '🛒')}</span>
          <div class="grow">
            <strong>${esc(p.name)}</strong> <span class="muted">${money(p.price)}</span>
            <p class="small muted">${esc(p.desc) || 'No description'}</p>
          </div>
          <button class="btn ghost sm" data-action="ai-desc" data-idx="${i}" ${locked ? 'disabled' : ''} title="Write description with AI">✨</button>
          <button class="btn ghost sm" data-action="remove-product" data-idx="${i}" aria-label="Remove ${esc(p.name)}">✕</button>
        </li>`).join('') || '<li class="muted small">No products yet.</li>'}
    </ul>
    <form class="add-product" data-form="add-product">
      <input name="name" placeholder="Product name" required aria-label="Product name">
      <input name="price" type="number" min="0" step="0.01" placeholder="Price" required aria-label="Price">
      <button class="btn primary" type="submit">Add</button>
    </form>
  </section>

  <section class="card">
    <h2 class="card-title">Deal</h2>
    ${b.deal ? `<p><strong>${esc(b.deal.title)}</strong> · code <code>${esc(b.deal.code)}</code></p>
      <button class="btn ghost sm" data-action="remove-deal">Remove deal</button>` : `
    <form class="add-product" data-form="add-deal">
      <input name="title" placeholder="e.g. 10% off for students" required aria-label="Deal title">
      <button class="btn primary" type="submit">Post deal</button>
    </form>`}
  </section>`;
}

function viewOwnerPlans() {
  const cur = S().plan;
  return `
  ${pageHead('Plans', 'Grow at your own pace. Cancel anytime.')}
  <div class="promo-banner">
    <strong>🔱 Launch promo for ASU-area businesses</strong>
    <p>Your first 3 months are <strong>50% off</strong> any paid plan.</p>
  </div>
  <div class="plans">
    ${PLANS.map(p => `
      <article class="card plan ${p.popular ? 'popular' : ''} ${cur === p.id ? 'current' : ''}">
        ${p.popular ? '<span class="pill gold plan-flag">Most popular</span>' : ''}
        <h2>${esc(p.name)}</h2>
        <p class="muted">${esc(p.blurb)}</p>
        <p class="price">${p.price ? `<strong>$${p.price}</strong><span>/mo</span>` : '<strong>Free</strong>'}</p>
        ${p.price ? `<p class="small promo-price">$${(p.price / 2).toFixed(2)}/mo for your first 3 months</p>` : '<p class="small">&nbsp;</p>'}
        <ul class="features">${p.features.map(f => `<li>✓ ${esc(f)}</li>`).join('')}</ul>
        ${cur === p.id
          ? '<button class="btn ghost full" disabled>Current plan</button>'
          : `<button class="btn ${p.popular ? 'primary' : 'ghost'} full" data-action="plan" data-id="${p.id}">${p.price ? 'Choose ' + esc(p.name) : 'Switch to free'}</button>`}
      </article>`).join('')}
  </div>
  <section class="section">
    <h2>Why only small businesses?</h2>
    <p class="muted">Big chains already have huge ad budgets. ${esc(APP.name)} verifies every business is under <strong>$${(SMALL_LIMITS.revenue / 1e6).toFixed(0)}M in yearly sales</strong> and <strong>${SMALL_LIMITS.employees} employees</strong>, so local shops compete on a level playing field.</p>
  </section>`;
}

function viewOwnerJoin() {
  const r = ui.joinResult;
  if (r && r.ok === false) {
    return `
    <section class="result-screen">
      <div class="result-icon">🏢</div>
      <h1>${esc(APP.name)} is just for small businesses</h1>
      <p class="muted">${esc(r.name)} is over our small-business limit (under $${(SMALL_LIMITS.revenue / 1e6).toFixed(0)}M yearly sales and under ${SMALL_LIMITS.employees} employees). That's what keeps the playing field level for local shops.</p>
      <div class="stack">
        <button class="btn primary big" data-action="join-again">Try a different business</button>
        <button class="btn ghost big" data-action="toast" data-msg="Invite link copied! (demo)">Invite a small shop you love</button>
      </div>
    </section>`;
  }
  return `
  <button class="back" data-action="back" aria-label="Back">‹ Back</button>
  ${pageHead('List your business', 'Free to join. Takes 1 minute.')}
  <form class="card join-form" data-form="join">
    <label class="field">Business name<input name="name" required placeholder="e.g. Mesa Moon Boba"></label>
    <label class="field">Category
      <select name="category">${CATEGORIES.map(c => `<option>${esc(c)}</option>`).join('')}</select>
    </label>
    <label class="field">Neighborhood<input name="area" placeholder="e.g. Mill Ave"></label>
    <label class="field">Your first name<input name="owner" required placeholder="e.g. Sam"></label>
    <fieldset class="verify">
      <legend>🔍 Small-business check</legend>
      <label class="field">Yearly sales (USD)<input name="revenue" type="number" min="0" step="1000" required placeholder="e.g. 150000"></label>
      <label class="field">Number of employees<input name="employees" type="number" min="1" required placeholder="e.g. 4"></label>
      <p class="small muted">Must be under $${(SMALL_LIMITS.revenue / 1e6).toFixed(0)}M and under ${SMALL_LIMITS.employees} employees. In the full app we'd confirm this with a quick document check.</p>
    </fieldset>
    <button class="btn primary big full" type="submit">Verify & create profile</button>
  </form>`;
}

// ---------- After-render hooks (typing animation, inputs) ----------

function afterRender() {
  if (ui.animate) {
    ui.animate = false;
    const els = [...document.querySelectorAll('[data-type]')];
    els.forEach((el, i) => setTimeout(() => typeInto(el, el.dataset.type), i * 250));
  }
}

function typeInto(el, text) {
  let i = 0;
  const tick = () => {
    i = Math.min(text.length, i + 3);
    el.textContent = text.slice(0, i);
    if (i < text.length) setTimeout(tick, 16);
  };
  tick();
}

// ---------- Event handling ----------

const actions = {
  mode(el) {
    const mode = el.dataset.mode;
    store.update(s => { s.mode = mode; s.welcomed = true; });
    go(mode === 'business' ? '/owner' : '/foryou');
  },
  start(el) {
    const mode = el.dataset.mode;
    store.update(s => { s.welcomed = true; s.mode = mode; });
    go(mode === 'business' ? '/owner' : S().interests.length ? '/foryou' : '/interests');
  },
  go(el) {
    const menu = document.getElementById('menu');
    if (menu.open) menu.close();
    go(el.dataset.to);
  },
  back() { history.length > 1 ? history.back() : go(home()); },
  'open-biz'(el) { go(`/biz/${el.dataset.id}`); },
  save(el) {
    const now = store.toggleSaved(el.dataset.id);
    toast(now ? 'Saved ♥' : 'Removed from saved');
    rerender();
  },
  'toggle-interest'(el) {
    const id = el.dataset.id;
    store.update(s => { s.interests = s.interests.includes(id) ? s.interests.filter(x => x !== id) : [...s.interests, id]; });
    rerender();
  },
  cat(el) { ui.cat = el.dataset.id; rerender(); },
  filter(el) { ui[el.dataset.id] = !ui[el.dataset.id]; rerender(); },
  redeem(el) {
    const id = Number(el.dataset.id);
    store.update(s => { if (!s.redeemed.includes(id)) s.redeemed.push(id); });
    toast('Code unlocked! Show it at checkout.');
    rerender();
  },
  'tap-product'(el) {
    const idx = Number(el.dataset.idx);
    if (ui.expanded !== idx && S().mode === 'customer') store.track('tap', el.dataset.id, { product: idx });
    ui.expanded = ui.expanded === idx ? null : idx;
    rerender();
  },
  async share(el) {
    const b = store.getBiz(el.dataset.id);
    const text = `Check out ${b.name} on ${APP.name}: ${b.tagline}`;
    try {
      if (navigator.share) await navigator.share({ title: b.name, text, url: location.href });
      else { await navigator.clipboard.writeText(`${text} ${location.href}`); toast('Link copied!'); }
    } catch (e) { /* share cancelled */ }
  },
  toast(el) { toast(el.dataset.msg); },
  range(el) { ui.range = Number(el.dataset.id); rerender(); },
  tone(el) { ui.aiTone = el.dataset.id; rerender(); },
  'ai-generate'() {
    const b = ownedBiz();
    ui.aiKeywords = document.getElementById('ai-keywords')?.value ?? ui.aiKeywords;
    ui.aiThinking = true;
    rerender();
    setTimeout(() => {
      ui.aiThinking = false;
      ui.aiDrafts = ai.generateBios({ name: b.name, category: b.category, keywords: ui.aiKeywords, tone: ui.aiTone, area: b.area });
      ui.aiTags = [...new Set([...b.tags, ...ai.suggestTags(ui.aiKeywords, b.category)])];
      saveOverride(b, { tags: ui.aiTags });
      ui.animate = true;
      rerender();
    }, 900);
  },
  'use-bio'(el) {
    const b = ownedBiz();
    saveOverride(b, { bio: ui.aiDrafts[Number(el.dataset.idx)] });
    toast('Bio updated ✓');
    rerender();
  },
  'toggle-tag'(el) {
    const b = ownedBiz();
    const id = el.dataset.id;
    const tags = b.tags.includes(id) ? b.tags.filter(t => t !== id) : [...b.tags, id];
    ui.aiTags = null;
    saveOverride(b, { tags });
    rerender();
  },
  'ai-desc'(el) {
    const b = ownedBiz();
    const idx = Number(el.dataset.idx);
    const products = b.products.map((p, i) => (i === idx ? { ...p, desc: ai.describeProduct(p.name, b.name, ui.aiTone) } : p));
    saveOverride(b, { products });
    toast('✨ Description written');
    rerender();
  },
  'remove-product'(el) {
    const b = ownedBiz();
    saveOverride(b, { products: b.products.filter((_, i) => i !== Number(el.dataset.idx)) });
    rerender();
  },
  'remove-deal'() { saveOverride(ownedBiz(), { deal: null }); rerender(); },
  plan(el) {
    const p = PLANS.find(x => x.id === el.dataset.id);
    store.update(s => { s.plan = p.id; });
    toast(p.price ? `You're on ${p.name}! (Demo, no payment taken)` : 'Switched to Starter');
    rerender();
  },
  'join-again'() { ui.joinResult = null; rerender(); },
  menu() { document.getElementById('menu').showModal(); },
  'close-menu'() { document.getElementById('menu').close(); },
  reset() {
    if (!confirm('Reset the demo? This clears saved shops, clicks and new businesses.')) return;
    store.reset();
    Object.assign(ui, { q: '', cat: 'All', openNow: false, hasDeal: false, aiKeywords: null, aiDrafts: null, aiTags: null, joinResult: null });
    document.getElementById('menu').close();
    toast('Demo reset');
    location.hash = '#/welcome';
    rerender();
  },
  install() {
    document.getElementById('menu').close();
    if (deferredInstall) {
      deferredInstall.prompt();
      deferredInstall = null;
    } else {
      toast('iPhone: tap Share → Add to Home Screen. Android: menu ⋮ → Install app.', 5000);
    }
  },
};

function saveOverride(b, patch) {
  store.update(s => {
    if (b.id >= 100) {
      const c = s.customBiz.find(x => x.id === b.id);
      Object.assign(c, patch);
    } else {
      s.overrides[b.id] = { ...(s.overrides[b.id] || {}), ...patch };
    }
  });
}

const forms = {
  join(f) {
    const d = Object.fromEntries(new FormData(f));
    const revenue = Number(d.revenue), employees = Number(d.employees);
    if (revenue >= SMALL_LIMITS.revenue || employees >= SMALL_LIMITS.employees) {
      ui.joinResult = { ok: false, name: d.name };
      rerender();
      window.scrollTo(0, 0);
      return;
    }
    store.createBusiness({
      name: d.name.trim(), category: d.category, area: d.area.trim() || 'Tempe', owner: d.owner.trim(),
      revenue, employees, tags: ai.suggestTags(d.name, d.category), tagline: `New ${d.category.toLowerCase()} spot in ${d.area.trim() || 'Tempe'}`,
    });
    store.update(s => { s.plan = 'pro'; });
    ui.joinResult = null;
    toast('✓ Verified small business! You get Pro free for 30 days.', 4000);
    go('/owner/profile');
  },
  'add-product'(f) {
    const d = Object.fromEntries(new FormData(f));
    const b = ownedBiz();
    saveOverride(b, { products: [...b.products, { name: d.name.trim(), price: Number(d.price), emoji: '🛒', desc: '' }] });
    rerender();
  },
  'add-deal'(f) {
    const d = Object.fromEntries(new FormData(f));
    const b = ownedBiz();
    const code = (b.name.replace(/[^a-z]/gi, '').slice(0, 5) + Math.floor(10 + Math.random() * 89)).toUpperCase();
    saveOverride(b, { deal: { title: d.title.trim(), detail: 'Show your LocalLift app at checkout.', code } });
    toast('Deal posted 🏷️');
    rerender();
  },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el); }
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest('[role="link"][data-action]');
  if (el && el === e.target) { e.preventDefault(); actions[el.dataset.action]?.(el); }
});

document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]');
  if (!f) return;
  e.preventDefault();
  forms[f.dataset.form]?.(f);
});

document.addEventListener('input', e => {
  if (e.target.id === 'search') {
    ui.q = e.target.value;
    document.getElementById('results').innerHTML = discoverResults();
  } else if (e.target.id === 'ai-keywords') {
    ui.aiKeywords = e.target.value;
  }
});

document.addEventListener('change', e => {
  if (e.target.id === 'sort') { ui.sort = e.target.value; rerender(); }
  if (e.target.id === 'owned-biz') {
    store.update(s => { s.ownedBizId = Number(e.target.value); });
    rerender();
  }
});

let toastTimer;
function toast(msg, ms = 2400) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

export function logoSvg(size = 32) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" aria-hidden="true">
    <rect width="512" height="512" rx="112" fill="#8C1D40"/>
    <rect x="140" y="222" width="232" height="150" fill="#fff"/>
    <rect x="226" y="290" width="60" height="82" rx="6" fill="#8C1D40"/>
    <path d="M140 150h232l24 72H116z" fill="#FFC627"/>
    ${[144, 200, 256, 312, 368].map(x => `<path d="M${x - 28} 222a28 28 0 0 0 56 0z" fill="#FFC627"/>`).join('')}
  </svg>`;
}

// ---------- PWA ----------

let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

document.getElementById('brand-logo').innerHTML = logoSvg(30);
window.addEventListener('hashchange', () => render(true));
render(true);
