// Tiny hand-rolled SVG/HTML charts so the app needs no chart library.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let uid = 0;

export function lineChart(values, labels) {
  const W = 320, H = 130, padX = 6, padTop = 10, padBottom = 22;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? (W - padX * 2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => [padX + i * step, padTop + (1 - v / max) * (H - padTop - padBottom)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const base = H - padBottom;
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${base} L${pts[0][0].toFixed(1)},${base} Z`;
  const id = `g${++uid}`;
  const last = pts[pts.length - 1];
  const tick = i => `<text x="${pts[i][0]}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}">${esc(labels[i])}</text>`;
  const mid = Math.floor((pts.length - 1) / 2);

  return `<svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Profile views per day, peak ${max}">
    <defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="var(--brand)" stop-opacity=".28"/><stop offset="100%" stop-color="var(--brand)" stop-opacity="0"/>
    </linearGradient></defs>
    <line x1="${padX}" x2="${W - padX}" y1="${base}" y2="${base}" class="axis"/>
    <path d="${area}" fill="url(#${id})"/>
    <path d="${line}" fill="none" stroke="var(--brand)" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="4" fill="var(--brand)" stroke="var(--surface)" stroke-width="2"/>
    ${tick(0)}${pts.length > 2 ? tick(mid) : ''}${tick(pts.length - 1)}
  </svg>`;
}

export function barList(items, suffix = '') {
  if (!items.length) return '<p class="muted small">No data yet.</p>';
  const max = Math.max(1, ...items.map(i => i.value));
  return `<ul class="bar-list">${items.map(i => `
    <li>
      <div class="bar-row"><span>${esc(i.label)}</span><strong>${i.value}${suffix}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (i.value / max) * 100)}%"></div></div>
    </li>`).join('')}</ul>`;
}
