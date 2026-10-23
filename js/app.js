import { APP, INTERESTS, ORIGIN, PLANS, SMALL_LIMITS, CATEGORIES } from './data.js';
import * as store from './store.js';
import { rankForYou, distanceMi, isOpen } from './recommend.js';
import * as ai from './ai.js';
import { lineChart, barList } from './charts.js';
import { icon } from './icons.js';

const app = document.getElementById('app');
const tabbar = document.getElementById('tabbar');
const topnav = document.getElementById('topnav');
const S = () => store.getState();

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const interestById = Object.fromEntries(INTERESTS.map(i => [i.id, i]));
const money = n => (n % 1 ? `$${n.toFixed(2)}` : `$${n}`);
const milesFrom = b => distanceMi(ORIGIN, b);
const fmtMi = d => (d < 0.1 ? '<0.1 mi' : `${d.toFixed(1)} mi`);
const fmtHour = h => `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;
const num = n => n.toLocaleString();
const limitM = `$${(SMALL_LIMITS.revenue / 1e6).toFixed(0)}M`;

// View-only state that doesn't need to survive a reload.
const ui = {
  q: '', cat: 'All', openNow: false, hasDeal: false, sort: 'distance',
  range: 30, expanded: null,
  aiKeywords: null, aiKeywordsFor: null, aiTone: 'Friendly', aiDrafts: null, aiTags: null, aiThinking: false, animate: false,
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
  document.body.dataset.page = path.split('/')[1] || '';
  document.body.classList.toggle('no-tabs', path === '/welcome');
  document.querySelectorAll('[data-action="mode"]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
  });

  const tabs = mode === 'business'
    ? [['/owner', 'chart', 'Dashboard'], ['/owner/profile', 'store', 'Profile'], [`/biz/${S().ownedBizId}`, 'eye', 'Preview'], ['/owner/plans', 'card', 'Plans']]
    : [['/foryou', 'home', 'For You'], ['/discover', 'compass', 'Discover'], ['/deals', 'tag', 'Deals'], ['/saved', 'heart', 'Saved']];
  const links = cls => tabs.map(([href, ic, label]) => `
    <a href="#${href}" class="${cls}" ${path === href ? 'aria-current="page"' : ''}>${icon(ic, 20)}<span>${label}</span></a>`).join('');
  tabbar.innerHTML = links('tab');
  topnav.innerHTML = path === '/welcome' ? '' : links('navlink');
}

// ---------- Shared pieces ----------

function initials(name) {
  const words = name.replace(/&/g, '').split(/\s+/).filter(Boolean);
  return (words[0][0] + (words[1] ? words[1][0] : '')).toUpperCase();
}

function monogram(b, size = '') {
  return `<div class="monogram ${size}" style="--tile:${esc(b.color)}" aria-hidden="true">${esc(initials(b.name))}</div>`;
}

function openStatus(b) {
  return isOpen(b)
    ? `<span class="status open"><i></i>Open until ${fmtHour(b.hours[1])}</span>`
    : `<span class="status closed"><i></i>Closed · Opens ${fmtHour(b.hours[0])}</span>`;
}

function rating(b) {
  return `<span class="rating">${icon('star', 13, 'filled')}${b.rating.toFixed(1)}${b.reviews ? ` <span class="muted">(${b.reviews})</span>` : ''}</span>`;
}

function bizCard(b, reasons = [], featured = false) {
  const saved = S().saved.includes(b.id);
  return `
  <article class="biz-card ${featured ? 'featured' : ''}" data-action="open-biz" data-id="${b.id}" role="link" tabindex="0" aria-label="${esc(b.name)}">
    ${featured ? `<div class="cover" style="--tile:${esc(b.color)}"><span class="cover-label">Top recommendation</span></div>` : ''}
    <div class="biz-row">
      ${monogram(b, featured ? 'lg overlap' : '')}
      <div class="biz-main">
        <div class="biz-title"><h3>${esc(b.name)}</h3><span class="verified" title="Verified small business">${icon('check', 11)}</span></div>
        <p class="meta">${esc(b.category)} · ${fmtMi(milesFrom(b))} · ${rating(b)}</p>
        <p class="tagline">${esc(b.tagline)}</p>
        <div class="card-foot">
          ${openStatus(b)}
          ${b.deal ? `<span class="deal-tag">${icon('tag', 13)}${esc(b.deal.title)}</span>` : ''}
        </div>
        ${reasons.length ? `<p class="reason">${icon('info', 13)}${esc(reasons.join(' · '))}</p>` : ''}
      </div>
      <button class="heart ${saved ? 'on' : ''}" data-action="save" data-id="${b.id}" aria-pressed="${saved}" aria-label="${saved ? 'Remove from saved' : 'Save'} ${esc(b.name)}">${icon('heart', 20)}</button>
    </div>
  </article>`;
}

function interestChips(selected, action) {
  return INTERESTS.map(i => `
    <button class="chip ${selected.includes(i.id) ? 'on' : ''}" data-action="${action}" data-id="${i.id}" aria-pressed="${selected.includes(i.id)}">
      ${selected.includes(i.id) ? icon('check', 14) : ''}${esc(i.label)}
    </button>`).join('');
}

function pageHead(title, sub = '', right = '') {
  return `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div>${right}</div>`;
}

function backLink() {
  return `<button class="back" data-action="back">${icon('back', 16)} Back</button>`;
}

// ---------- Customer views ----------

function viewWelcome() {
  const count = store.allBusinesses().length;
  return `
  <section class="hero">
    <p class="eyebrow">Tempe, Arizona · Near ASU</p>
    <h1 class="hero-title">Shop small.<br><span>Find the local businesses around campus.</span></h1>
    <p class="lead">${esc(APP.name)} lists only verified independent businesses, so neighborhood shops get discovered without competing against national chains.</p>
    <div class="hero-cta">
      <button class="btn primary lg" data-action="start" data-mode="customer">Start exploring ${icon('chevronRight', 18)}</button>
      <button class="btn secondary lg" data-action="start" data-mode="business">List your business</button>
    </div>
    <dl class="stats">
      <div><dt>Local businesses</dt><dd>${count}</dd></div>
      <div><dt>Independently owned</dt><dd>100%</dd></div>
      <div><dt>Revenue cap to join</dt><dd>${limitM}</dd></div>
    </dl>
  </section>

  <section class="features">
    <article class="feature">
      <div class="feature-icon">${icon('shield', 22)}</div>
      <h3>Verified small only</h3>
      <p>Every business is checked against our size limit: under ${limitM} in yearly sales and under ${SMALL_LIMITS.employees} employees.</p>
    </article>
    <article class="feature">
      <div class="feature-icon">${icon('compass', 22)}</div>
      <h3>Recommendations that fit you</h3>
      <p>Your feed adapts to your interests, what you browse and how close you are, and it always shows why something was recommended.</p>
    </article>
    <article class="feature">
      <div class="feature-icon">${icon('chart', 22)}</div>
      <h3>Insights for owners</h3>
      <p>Owners see profile views, popular products and anonymous viewer interests, plus a writing assistant for their profile.</p>
    </article>
  </section>

  <footer class="site-footer">
    <span>${esc(APP.name)} · ${esc(APP.slogan)}</span>
    <span class="muted">Prototype for WPC 101 Spark Tank, Fall 2026. All businesses shown are fictional.</span>
  </footer>`;
}

function viewInterests() {
  const sel = S().interests;
  return `
  <div class="narrow">
    ${pageHead('Personalize your feed', 'Choose a few categories you care about. You can change these at any time.')}
    <div class="chip-wrap">${interestChips(sel, 'toggle-interest')}</div>
    <div class="form-actions">
      <span class="muted small">${sel.length} selected</span>
      <button class="btn primary" data-action="go" data-to="/foryou">${sel.length ? 'Continue' : 'Skip for now'}</button>
    </div>
  </div>`;
}

function viewForYou() {
  const st = S();
  const ranked = rankForYou(store.allBusinesses(), st);
  const [top, ...rest] = ranked;
  const chips = st.interests.length
    ? st.interests.map(id => `<span class="pill">${esc(interestById[id].label)}</span>`).join('')
    : '<span class="muted small">No interests selected</span>';
  return `
  ${pageHead('Recommended for you', `Based on your interests near ${esc(ORIGIN.label)}`)}
  <div class="interest-bar">
    <span class="muted small">Interests:</span>
    <div class="pill-row">${chips}</div>
    <a href="#/interests" class="link small">Edit</a>
  </div>
  <div class="card-grid">
    ${top ? bizCard(top.biz, top.reasons, true) : ''}
    ${rest.map(r => bizCard(r.biz, r.reasons)).join('')}
  </div>`;
}

function filteredBusinesses() {
  const q = ui.q.trim().toLowerCase();
  const list = store.allBusinesses().filter(b => {
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
      <circle r="11" fill="${esc(b.color)}"/><text text-anchor="middle" dy="3.5" font-size="9" font-weight="700" fill="#fff">${esc(initials(b.name))}</text><title>${esc(b.name)}</title></g>`;
  }).join('');
  return `
  <div class="panel map-card">
    <svg viewBox="-160 -160 320 320" class="mini-map" role="img" aria-label="Map of businesses around ${esc(ORIGIN.label)}">
      <circle r="${SC}" class="ring outer"/><circle r="${SC / R}" class="ring"/><circle r="${SC * 0.5 / R}" class="ring"/>
      <text y="${-SC * 0.5 / R - 4}" class="ring-label" text-anchor="middle">0.5 mi</text>
      <text y="${-SC / R - 4}" class="ring-label" text-anchor="middle">1 mi</text>
      <g class="you"><circle r="9" class="you-pulse"/><circle r="5.5"/></g>
      ${dots}
    </svg>
    <p class="muted small center">${icon('pin', 13)} ${esc(ORIGIN.label)}</p>
  </div>`;
}

function discoverResults() {
  const list = filteredBusinesses();
  return `
    <aside class="discover-map">${miniMap(list)}</aside>
    <div class="discover-list">
      <p class="muted small">${list.length} verified small business${list.length === 1 ? '' : 'es'}</p>
      <div class="list">${list.map(b => bizCard(b)).join('') || '<div class="empty">No businesses match these filters.</div>'}</div>
    </div>`;
}

function viewDiscover() {
  const cats = ['All', ...CATEGORIES.filter(c => store.allBusinesses().some(b => b.category === c))];
  return `
  ${pageHead('Discover', 'Independent businesses near you')}
  <div class="toolbar">
    <label class="search">
      ${icon('search', 18)}
      <input id="search" type="search" placeholder="Search tacos, vintage, nails…" value="${esc(ui.q)}" aria-label="Search businesses">
    </label>
    <div class="filters">
      <button class="chip ${ui.openNow ? 'on' : ''}" data-action="filter" data-id="openNow" aria-pressed="${ui.openNow}">Open now</button>
      <button class="chip ${ui.hasDeal ? 'on' : ''}" data-action="filter" data-id="hasDeal" aria-pressed="${ui.hasDeal}">Has deal</button>
      <label class="select-wrap">Sort by
        <select id="sort"><option value="distance" ${ui.sort === 'distance' ? 'selected' : ''}>Distance</option><option value="rating" ${ui.sort === 'rating' ? 'selected' : ''}>Rating</option></select>
      </label>
    </div>
  </div>
  <div class="tabs-row scroll-x" role="group" aria-label="Category">${cats.map(c => `<button class="tab-chip ${ui.cat === c ? 'on' : ''}" data-action="cat" data-id="${esc(c)}" aria-pressed="${ui.cat === c}">${esc(c)}</button>`).join('')}</div>
  <div id="results" class="discover-layout">${discoverResults()}</div>`;
}

function viewDeals() {
  const withDeals = store.allBusinesses().filter(b => b.deal).sort((a, b) => milesFrom(a) - milesFrom(b));
  const red = S().redeemed;
  return `
  ${pageHead('Deals', 'Offers from local businesses, available only on LocalLift')}
  <div class="notice">
    <div class="notice-icon">${icon('gift', 20)}</div>
    <div><strong>Welcome offer</strong><p>Get 10% off your first purchase at any LocalLift business. It stacks with the deals below.</p></div>
  </div>
  <div class="card-grid">
  ${withDeals.map(b => {
    const done = red.includes(b.id);
    return `
    <article class="panel deal-card">
      <div class="biz-row" data-action="open-biz" data-id="${b.id}" role="link" tabindex="0">
        ${monogram(b)}
        <div class="biz-main">
          <h3>${esc(b.deal.title)}</h3>
          <p class="meta">${esc(b.name)} · ${fmtMi(milesFrom(b))}</p>
          <p class="small muted">${esc(b.deal.detail)}</p>
        </div>
      </div>
      ${done
        ? `<div class="coupon"><span>Show this code at checkout</span><strong>${esc(b.deal.code)}</strong></div>`
        : `<button class="btn secondary full" data-action="redeem" data-id="${b.id}">Reveal code</button>`}
    </article>`;
  }).join('')}
  </div>`;
}

function viewSaved() {
  const saved = store.allBusinesses().filter(b => S().saved.includes(b.id));
  return `
  ${pageHead('Saved', 'Businesses you want to come back to')}
  ${saved.length ? `<div class="card-grid">${saved.map(b => bizCard(b)).join('')}</div>` : `
    <div class="empty"><div class="empty-icon">${icon('heart', 28)}</div><p>You haven't saved anything yet. Tap the heart on a business to save it here.</p>
    <a class="btn secondary" href="#/discover">Browse businesses</a></div>`}`;
}

function viewBiz(id) {
  const b = store.getBiz(id);
  if (!b) return `<div class="empty">Business not found. <a href="#/discover">Back to Discover</a></div>`;
  const st = S();
  const isOwnerPreview = st.mode === 'business' && b.id === st.ownedBizId;
  const saved = st.saved.includes(b.id);
  return `
  ${isOwnerPreview ? `<div class="notice slim">${icon('eye', 18)}<p>This is how shoppers see your profile. <a href="#/owner/profile">Edit profile</a></p></div>` : ''}
  ${backLink()}
  <section class="biz-cover" style="--tile:${esc(b.color)}"></section>
  <div class="biz-layout">
    <div class="biz-primary">
      <section class="biz-head">
        ${monogram(b, 'xl overlap')}
        <div class="biz-head-text">
          <h1>${esc(b.name)}</h1>
          <p class="meta">${esc(b.category)} · ${esc(b.area || 'Tempe')} · ${'$'.repeat(b.priceLevel)}</p>
        </div>
      </section>
      <div class="badge-row">
        <span class="badge-verified">${icon('shield', 15)} Verified small business</span>
        ${rating(b)}${b.reviews ? '' : ' <span class="muted small">New</span>'}
        ${openStatus(b)}
      </div>
      <div class="action-row">
        <button class="btn ${saved ? 'primary' : 'secondary'}" data-action="save" data-id="${b.id}" aria-pressed="${saved}">${icon('heart', 16)} ${saved ? 'Saved' : 'Save'}</button>
        <button class="btn secondary" data-action="toast" data-msg="In the full app, this opens directions in your maps app.">${icon('pin', 16)} Directions</button>
        <button class="btn secondary" data-action="share" data-id="${b.id}">${icon('share', 16)} Share</button>
      </div>

      <section class="section">
        <h2>About</h2>
        <p>${esc(b.bio) || '<span class="muted">This business hasn\'t added a description yet.</span>'}</p>
        <div class="pill-row">${b.tags.map(t => `<span class="pill">${esc(interestById[t]?.label || t)}</span>`).join('')}</div>
      </section>

      <section class="section">
        <h2>Products & services</h2>
        ${b.products.length ? `<ul class="menu-list">${b.products.map((p, i) => `
          <li>
            <button class="menu-item ${ui.expanded === i ? 'open' : ''}" data-action="tap-product" data-id="${b.id}" data-idx="${i}" aria-expanded="${ui.expanded === i}">
              <span class="menu-name">${esc(p.name)}</span>
              <span class="menu-price">${money(p.price)}</span>
              ${icon('chevronDown', 16, 'chev')}
              ${ui.expanded === i ? `<span class="menu-desc">${esc(p.desc || 'No description yet.')}</span>` : ''}
            </button>
          </li>`).join('')}</ul>` : '<p class="muted">No products listed yet.</p>'}
      </section>
    </div>

    <aside class="biz-side">
      ${b.deal ? `
      <section class="panel deal-panel">
        <p class="eyebrow">${icon('tag', 14)} LocalLift deal</p>
        <h3>${esc(b.deal.title)}</h3>
        <p class="small muted">${esc(b.deal.detail)}</p>
        ${st.redeemed.includes(b.id) ? `<div class="coupon"><span>Code</span><strong>${esc(b.deal.code)}</strong></div>` : `<button class="btn primary full" data-action="redeem" data-id="${b.id}">Reveal code</button>`}
      </section>` : ''}
      <section class="panel">
        <h3 class="panel-title">Hours & location</h3>
        <ul class="info-list">
          <li>${icon('clock', 16)}<span>Daily, ${fmtHour(b.hours[0])} – ${fmtHour(b.hours[1])}</span></li>
          <li>${icon('pin', 16)}<span>${esc(b.area || 'Tempe')}, Tempe AZ · ${fmtMi(milesFrom(b))} from ${esc(ORIGIN.label)}</span></li>
        </ul>
      </section>
      <section class="panel owner-card">
        <div class="avatar">${esc((b.owner || '?')[0])}</div>
        <div>
          <strong>Owned by ${esc(b.owner || 'a local owner')}</strong>
          <p class="small muted">Local since ${b.founded}${b.employees ? ` · ${b.employees} employee${b.employees === 1 ? '' : 's'}` : ''}</p>
        </div>
      </section>
    </aside>
  </div>`;
}

// ---------- Business views ----------

function ownedBiz() {
  return store.getBiz(S().ownedBizId) || store.getBiz(1);
}

function delta(cur, prev) {
  if (!prev) return cur ? '<span class="delta up">New</span>' : '';
  const pct = Math.round(((cur - prev) / prev) * 100);
  return `<span class="delta ${pct >= 0 ? 'up' : 'down'}">${icon(pct >= 0 ? 'trending' : 'trendingDown', 13)} ${Math.abs(pct)}%</span>`;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function lockOverlay(text) {
  return `<div class="lock-overlay">${icon('lock', 20)}<p>${text}</p><a class="btn primary sm" href="#/owner/plans">View plans</a></div>`;
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
  const rateDelta = prevRate
    ? `<span class="delta ${tapRate >= prevRate ? 'up' : 'down'}">${icon(tapRate >= prevRate ? 'trending' : 'trendingDown', 13)} ${Math.abs(tapRate - prevRate)} pts</span>`
    : '';

  return `
  <div class="dash-head">
    <div>
      <p class="eyebrow">${greeting()}, ${esc(b.owner || 'there')}</p>
      <div class="owner-switch">
        ${monogram(b, 'sm')}
        <label class="select-plain"><span class="sr-only">Your business</span>
          <select id="owned-biz">${bizOptions}</select>
        </label>
      </div>
    </div>
    <div class="dash-controls">
      ${stats.liveToday ? `<span class="live"><span class="live-dot"></span>${stats.liveToday} live today</span>` : ''}
      <span class="pill">${esc(plan.name)} plan</span>
      <div class="segmented" role="group" aria-label="Date range">
        <button data-action="range" data-id="7" aria-pressed="${ui.range === 7}">7 days</button>
        <button data-action="range" data-id="30" aria-pressed="${ui.range === 30}">30 days</button>
      </div>
    </div>
  </div>

  ${!stats.totals.views ? `
  <div class="notice">
    <div class="notice-icon">${icon('store', 20)}</div>
    <div><strong>Your profile is live</strong><p>Switch to Shop mode and open your business. Views will show up here in real time.</p></div>
  </div>` : ''}

  <div class="kpis">
    <div class="kpi"><span>Profile views</span><strong>${num(stats.totals.views)}</strong>${delta(stats.totals.views, stats.prev.views)}</div>
    <div class="kpi"><span>Product taps</span><strong>${num(stats.totals.taps)}</strong>${delta(stats.totals.taps, stats.prev.taps)}</div>
    <div class="kpi"><span>Saves</span><strong>${num(stats.totals.saves)}</strong>${delta(stats.totals.saves, stats.prev.saves)}</div>
    <div class="kpi"><span>Tap rate</span><strong>${tapRate}%</strong>${rateDelta}</div>
  </div>

  <div class="dash-grid">
    <section class="panel span-2">
      <div class="panel-head"><h2 class="panel-title">Profile views</h2><span class="muted small">Last ${ui.range} days</span></div>
      ${lineChart(stats.views, stats.labels)}
    </section>

    <section class="panel">
      <div class="panel-head"><h2 class="panel-title">${icon('bulb', 18)} Insights</h2><span class="muted small">Updated today</span></div>
      <ul class="tips">${tips.map(t => `<li><span class="tip-icon">${icon(t.icon, 16)}</span><p>${esc(t.text)}</p></li>`).join('')}</ul>
    </section>

    <section class="panel ${locked ? 'locked' : ''}">
      <div class="panel-head"><h2 class="panel-title">Recent viewers</h2><span class="muted small">Anonymous</span></div>
      <ul class="viewers">${viewers.slice(0, 6).map(v => `
        <li class="${v.live ? 'is-live' : ''}">
          <div class="avatar sm">${icon(v.live ? 'phone' : 'user', 16)}</div>
          <div class="grow">
            <strong>${esc(v.who)}</strong>${v.live ? ' <span class="pill live-pill">Live</span>' : ''}
            <p class="small muted">${v.interests.map(i => esc(interestById[i]?.label || i)).join(', ') || 'No interests set'} · ${fmtMi(v.dist)} away</p>
          </div>
          <span class="small muted nowrap">${esc(v.when)}</span>
        </li>`).join('') || '<li class="muted small">No viewers yet.</li>'}
      </ul>
      ${locked ? lockOverlay('Recent viewers are included in Pro') : ''}
    </section>

    <section class="panel ${locked ? 'locked' : ''}">
      <h2 class="panel-title">Viewer interests</h2>
      ${barList(interests, '%')}
      ${locked ? lockOverlay('Viewer interests are included in Pro') : ''}
    </section>

    <section class="panel">
      <h2 class="panel-title">Top products</h2>
      ${barList(products.slice(0, 5), ' taps')}
    </section>
  </div>

  <a class="btn secondary" href="#/owner/join">${icon('plus', 16)} List another business</a>`;
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
  ${pageHead('Business profile', esc(b.name), `<a class="btn secondary sm" href="#/biz/${b.id}">${icon('eye', 16)} Preview</a>`)}
  <div class="dash-grid">
    <section class="panel">
      <h2 class="panel-title">Description</h2>
      <p>${esc(b.bio) || '<span class="muted">No description yet. Use the writing assistant to draft one.</span>'}</p>
    </section>

    <section class="panel ${locked ? 'locked' : ''}">
      <div class="panel-head"><h2 class="panel-title">${icon('pen', 18)} Writing assistant</h2><span class="pill">Pro</span></div>
      <p class="small muted">List a few things you're known for and we'll draft three descriptions for you to choose from.</p>
      <label class="field">What are you known for?
        <textarea id="ai-keywords" rows="2" placeholder="e.g. cold brew, horchata lattes, friendly baristas">${esc(ui.aiKeywords)}</textarea>
      </label>
      <div class="field">Tone
        <div class="segmented" role="group" aria-label="Tone">
          ${['Friendly', 'Professional', 'Playful'].map(t => `<button data-action="tone" data-id="${t}" aria-pressed="${ui.aiTone === t}">${t}</button>`).join('')}
        </div>
      </div>
      <button class="btn primary" data-action="ai-generate" ${ui.aiThinking ? 'disabled' : ''}>
        ${ui.aiThinking ? '<span class="spinner"></span> Drafting…' : 'Generate drafts'}
      </button>
      ${ui.aiDrafts ? `
        <div class="drafts">
          ${ui.aiDrafts.map((d, i) => `
            <div class="draft">
              <span class="draft-label">Draft ${i + 1}</span>
              <p data-type="${esc(d)}">${ui.animate ? '' : esc(d)}</p>
              <button class="btn secondary sm" data-action="use-bio" data-idx="${i}">Use this description</button>
            </div>`).join('')}
        </div>` : ''}
      ${locked ? lockOverlay('The writing assistant is included in Pro') : ''}
    </section>

    <section class="panel">
      <div class="panel-head"><h2 class="panel-title">Categories</h2>${ui.aiTags ? '<span class="pill">Suggested</span>' : ''}</div>
      <p class="small muted">Categories decide which shoppers' recommendations you appear in.</p>
      <div class="chip-wrap">${interestChips(tags, 'toggle-tag')}</div>
    </section>

    <section class="panel">
      <h2 class="panel-title">Products & services</h2>
      <ul class="edit-products">
        ${b.products.map((p, i) => `
          <li>
            <div class="grow">
              <div class="row-between"><strong>${esc(p.name)}</strong><span>${money(p.price)}</span></div>
              <p class="small muted">${esc(p.desc) || 'No description'}</p>
            </div>
            <button class="icon-btn sm" data-action="ai-desc" data-idx="${i}" ${locked ? 'disabled' : ''} title="Draft a description" aria-label="Draft a description for ${esc(p.name)}">${icon('pen', 15)}</button>
            <button class="icon-btn sm" data-action="remove-product" data-idx="${i}" title="Remove" aria-label="Remove ${esc(p.name)}">${icon('x', 15)}</button>
          </li>`).join('') || '<li class="muted small">No products yet.</li>'}
      </ul>
      <form class="inline-form" data-form="add-product">
        <input name="name" placeholder="Product name" required aria-label="Product name">
        <input name="price" type="number" min="0" step="0.01" placeholder="Price" required aria-label="Price">
        <button class="btn primary" type="submit">Add</button>
      </form>
    </section>

    <section class="panel">
      <h2 class="panel-title">Current deal</h2>
      ${b.deal ? `<p><strong>${esc(b.deal.title)}</strong></p><p class="small muted">Code <code>${esc(b.deal.code)}</code></p>
        <button class="btn secondary sm" data-action="remove-deal">Remove deal</button>` : `
      <p class="small muted">Businesses with a deal appear in the Deals tab and rank higher in recommendations.</p>
      <form class="inline-form" data-form="add-deal">
        <input name="title" placeholder="e.g. 10% off for students" required aria-label="Deal title">
        <button class="btn primary" type="submit">Post</button>
      </form>`}
    </section>
  </div>`;
}

function viewOwnerPlans() {
  const cur = S().plan;
  return `
  ${pageHead('Plans & pricing', 'Simple monthly pricing. Cancel anytime.')}
  <div class="notice">
    <div class="notice-icon">${icon('gift', 20)}</div>
    <div><strong>Launch offer for Tempe businesses</strong><p>50% off any paid plan for your first three months.</p></div>
  </div>
  <div class="plans">
    ${PLANS.map(p => `
      <article class="panel plan ${p.popular ? 'popular' : ''}">
        <div class="row-between"><h2>${esc(p.name)}</h2>${p.popular ? '<span class="pill brand">Most popular</span>' : ''}${cur === p.id ? '<span class="pill">Current</span>' : ''}</div>
        <p class="muted">${esc(p.blurb)}</p>
        <p class="price">${p.price ? `<strong>$${p.price}</strong><span>/month</span>` : '<strong>$0</strong><span>/month</span>'}</p>
        <p class="small promo-price">${p.price ? `$${(p.price / 2).toFixed(2)}/month for the first 3 months` : 'Free forever'}</p>
        <ul class="features-list">${p.features.map(f => `<li>${icon('check', 16)}<span>${esc(f)}</span></li>`).join('')}</ul>
        ${cur === p.id
          ? '<button class="btn secondary full" disabled>Current plan</button>'
          : `<button class="btn ${p.popular ? 'primary' : 'secondary'} full" data-action="plan" data-id="${p.id}">${p.price ? 'Choose ' + esc(p.name) : 'Switch to Starter'}</button>`}
      </article>`).join('')}
  </div>
  <section class="section narrow-text">
    <h2>Why only small businesses?</h2>
    <p class="muted">National chains already have large advertising budgets. ${esc(APP.name)} verifies that every business is under <strong>${limitM} in yearly sales</strong> and has fewer than <strong>${SMALL_LIMITS.employees} employees</strong>, so local businesses compete on equal footing.</p>
  </section>`;
}

function viewOwnerJoin() {
  const r = ui.joinResult;
  if (r && r.ok === false) {
    return `
    <section class="result-screen narrow">
      <div class="result-icon">${icon('building', 32)}</div>
      <h1>${esc(r.name)} doesn't qualify</h1>
      <p class="muted">${esc(APP.name)} is only for small businesses: under ${limitM} in yearly sales and fewer than ${SMALL_LIMITS.employees} employees. That limit is what keeps the platform fair for independent shops.</p>
      <div class="hero-cta">
        <button class="btn primary" data-action="join-again">Try a different business</button>
        <button class="btn secondary" data-action="toast" data-msg="Invite link copied (demo).">Invite a local business</button>
      </div>
    </section>`;
  }
  return `
  <div class="narrow">
    ${backLink()}
    ${pageHead('List your business', 'Free to join. It takes about a minute.')}
    <form class="panel join-form" data-form="join">
      <div class="form-grid">
        <label class="field">Business name<input name="name" required placeholder="e.g. Mesa Moon Boba"></label>
        <label class="field">Category
          <select name="category">${CATEGORIES.map(c => `<option>${esc(c)}</option>`).join('')}</select>
        </label>
        <label class="field">Neighborhood<input name="area" placeholder="e.g. Mill Ave"></label>
        <label class="field">Your first name<input name="owner" required placeholder="e.g. Sam"></label>
      </div>
      <fieldset class="verify">
        <legend>${icon('shield', 16)} Small-business verification</legend>
        <div class="form-grid">
          <label class="field">Yearly sales (USD)<input name="revenue" type="number" min="0" step="1000" required placeholder="e.g. 150000"></label>
          <label class="field">Number of employees<input name="employees" type="number" min="1" required placeholder="e.g. 4"></label>
        </div>
        <p class="small muted">Must be under ${limitM} in sales and fewer than ${SMALL_LIMITS.employees} employees. The full product confirms this with a document check.</p>
      </fieldset>
      <button class="btn primary lg full" type="submit">Verify and create profile</button>
    </form>
  </div>`;
}

// ---------- After-render hooks (typing animation) ----------

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
    toast(now ? 'Saved' : 'Removed from saved');
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
    toast('Code revealed. Show it at checkout.');
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
    const text = `${b.name} on ${APP.name}: ${b.tagline}`;
    try {
      if (navigator.share) await navigator.share({ title: b.name, text, url: location.href });
      else { await navigator.clipboard.writeText(`${text} ${location.href}`); toast('Link copied'); }
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
    saveOverride(ownedBiz(), { bio: ui.aiDrafts[Number(el.dataset.idx)] });
    toast('Description updated');
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
    toast('Description drafted');
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
    toast(p.price ? `Switched to ${p.name} (demo, no payment taken)` : 'Switched to Starter');
    rerender();
  },
  'join-again'() { ui.joinResult = null; rerender(); },
  menu() { document.getElementById('menu').showModal(); },
  'close-menu'() { document.getElementById('menu').close(); },
  reset() {
    if (!confirm('Reset the demo? This clears saved businesses, activity and any new businesses.')) return;
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
      toast('iPhone: Share, then Add to Home Screen. Android: menu, then Install app.', 5000);
    }
  },
};

function saveOverride(b, patch) {
  store.update(s => {
    if (b.id >= 100) {
      Object.assign(s.customBiz.find(x => x.id === b.id), patch);
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
    const area = d.area.trim() || 'Tempe';
    store.createBusiness({
      name: d.name.trim(), category: d.category, area, owner: d.owner.trim(),
      revenue, employees, tags: ai.suggestTags(d.name, d.category), tagline: `New ${d.category.toLowerCase()} business in ${area}`,
    });
    store.update(s => { s.plan = 'pro'; });
    ui.joinResult = null;
    toast('Verified. Your profile is live, with Pro free for 30 days.', 4000);
    go('/owner/profile');
  },
  'add-product'(f) {
    const d = Object.fromEntries(new FormData(f));
    const b = ownedBiz();
    saveOverride(b, { products: [...b.products, { name: d.name.trim(), price: Number(d.price), desc: '' }] });
    rerender();
  },
  'add-deal'(f) {
    const d = Object.fromEntries(new FormData(f));
    const b = ownedBiz();
    const code = (b.name.replace(/[^a-z]/gi, '').slice(0, 5) + Math.floor(10 + Math.random() * 89)).toUpperCase();
    saveOverride(b, { deal: { title: d.title.trim(), detail: 'Show your LocalLift app at checkout.', code } });
    toast('Deal posted');
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

// ---------- Static chrome + PWA ----------

document.getElementById('brand-logo').innerHTML = logoSvg(28);
document.getElementById('menu-btn').innerHTML = icon('more', 20);
document.getElementById('menu-list').innerHTML = `
  <button class="menu-row" data-action="install">${icon('download', 18)} Add to home screen</button>
  <button class="menu-row" data-action="go" data-to="/welcome">${icon('home', 18)} Show landing page</button>
  <button class="menu-row danger" data-action="reset">${icon('refresh', 18)} Reset demo</button>
  <button class="btn secondary full" data-action="close-menu">Close</button>`;

let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

window.addEventListener('hashchange', () => render(true));
render(true);
