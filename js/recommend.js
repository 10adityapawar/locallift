// The "AI" For You feed: a transparent scoring model that blends a shopper's
// chosen interests, what they've tapped on, distance, deals and ratings.
import { INTERESTS, ORIGIN } from './data.js';

const label = Object.fromEntries(INTERESTS.map(i => [i.id, i.label]));

export function distanceMi(a, b) {
  const R = 3958.8;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function isOpen(b, now = new Date()) {
  const h = now.getHours() + now.getMinutes() / 60;
  return h >= b.hours[0] && h < b.hours[1];
}

export function rankForYou(businesses, state) {
  // Learn from behavior: which tags has this shopper viewed, tapped or saved?
  const weight = { view: 1, tap: 1.5, save: 2 };
  const tagAffinity = {};
  const lastViewedByTag = {};
  const byId = Object.fromEntries(businesses.map(b => [b.id, b]));
  for (const e of state.events) {
    const b = byId[e.bizId];
    if (!b) continue;
    for (const t of b.tags) {
      tagAffinity[t] = (tagAffinity[t] || 0) + (weight[e.type] || 0);
      lastViewedByTag[t] = b;
    }
  }

  return businesses
    .map(b => {
      const reasons = [];
      let score = 0;

      const matches = b.tags.filter(t => state.interests.includes(t));
      if (matches.length) {
        score += matches.length * 3;
        reasons.push({ w: matches.length * 3, text: `You like ${matches.slice(0, 2).map(t => label[t]).join(' & ')}` });
      }

      const learned = Math.min(4, b.tags.reduce((s, t) => s + (tagAffinity[t] || 0), 0) * 0.5);
      if (learned > 0) {
        score += learned;
        const via = b.tags.map(t => lastViewedByTag[t]).find(x => x && x.id !== b.id);
        if (via) reasons.push({ w: learned, text: `Because you viewed ${via.name}` });
      }

      const d = distanceMi(ORIGIN, b);
      const near = Math.max(0, 2 - d * 0.8);
      score += near;
      if (d < 0.6) reasons.push({ w: near, text: `${d.toFixed(1)} mi from you` });

      if (b.deal) {
        score += 1.2;
        reasons.push({ w: 1.2, text: 'Has an Orbit deal' });
      }

      score += (b.rating - 4.5) * 2;
      if (b.rating >= 4.9) reasons.push({ w: 0.8, text: `Top rated · ${b.rating}★` });

      if (isOpen(b)) score += 0.5;
      if (b.isNew) {
        score += 1.5;
        reasons.push({ w: 1.5, text: 'New on Orbit' });
      }

      reasons.sort((x, y) => y.w - x.w);
      return { biz: b, score, reasons: reasons.slice(0, 2).map(r => r.text) };
    })
    .sort((a, b) => b.score - a.score);
}
