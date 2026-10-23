// Simulated AI: template- and rule-based generators that stand in for a real
// language model in the demo. Swap these for API calls in a real product.
import { APP, INTERESTS } from './data.js';

const pick = (arr, n) => arr[Math.abs(n) % arr.length];

function keywordList(text) {
  return text.split(/[,\n]+|\band\b/i).map(s => s.trim()).filter(Boolean).slice(0, 4);
}

function joinNice(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function generateBios({ name, category, keywords, tone, area }) {
  const kw = keywordList(keywords);
  const things = kw.length ? joinNice(kw) : `the best ${category.toLowerCase()} in town`;
  const where = area ? `in ${area}` : 'near ASU';
  const seed = name.length + kw.length;

  const openers = {
    Friendly: [`Welcome to ${name}!`, `Hey neighbor! We're ${name}.`, `Hi, we're ${name}.`],
    Professional: [`${name} is a locally owned ${category.toLowerCase()} business ${where}.`, `At ${name}, quality comes first.`],
    Playful: [`Warning: ${name} may become your new favorite habit.`, `Plot twist: the best ${category.toLowerCase()} spot ${where} is ${name}.`],
  }[tone] || [`Welcome to ${name}.`];

  return [
    `${pick(openers, seed)} We're a small, locally owned spot ${where} known for ${things}. Every purchase supports a real person in your community, not a corporate chain.`,
    `${tone === 'Playful' ? 'Small shop, big flavor.' : 'Small by choice, local by heart.'} ${name} brings you ${things}, made with care right here ${where}. Stop by and say hi. We'd love to meet you.`,
    `Looking for ${things}? ${name} has you covered. ${tone === 'Professional' ? 'We pride ourselves on personal service and fair prices.' : 'Come for the goods, stay for the good vibes.'} Follow us on ${APP.name} for weekly deals.`,
  ];
}

const SYNONYMS = {
  coffee: ['coffee', 'barista', 'latte', 'espresso', 'brew', 'cafe', 'tea', 'boba'],
  food: ['food', 'taco', 'burger', 'pizza', 'bowl', 'lunch', 'dinner', 'meal', 'truck', 'kitchen', 'bbq'],
  sweets: ['sweet', 'horchata', 'churro', 'dessert', 'cake', 'cookie', 'pastry', 'bake', 'donut', 'ice cream', 'cupcake', 'candy'],
  thrift: ['thrift', 'secondhand', 'used', 'resale', 'consign'],
  vintage: ['vintage', 'retro', 'antique', '90s', '80s', 'vinyl'],
  beauty: ['nail', 'hair', 'beauty', 'makeup', 'lash', 'skin', 'salon', 'spa', 'brow'],
  fitness: ['gym', 'fitness', 'yoga', 'boxing', 'workout', 'pilates', 'training', 'dance'],
  art: ['art', 'paint', 'print', 'design', 'tattoo', 'gallery', 'photo', 'sticker'],
  music: ['music', 'record', 'vinyl', 'guitar', 'band', 'dj', 'concert'],
  books: ['book', 'read', 'comic', 'library', 'textbook'],
  plants: ['plant', 'flower', 'succulent', 'garden', 'floral'],
  pets: ['pet', 'dog', 'cat', 'groom', 'puppy', 'animal'],
  bikes: ['bike', 'bicycle', 'scooter', 'cycle', 'skate'],
  tech: ['phone', 'repair', 'laptop', 'computer', 'tech', 'screen', 'gaming'],
  handmade: ['handmade', 'craft', 'candle', 'jewelry', 'pottery', 'knit', 'soap', 'custom', 'local'],
};

export function suggestTags(text, category = '') {
  const hay = `${text} ${category}`.toLowerCase();
  const found = Object.entries(SYNONYMS)
    .filter(([, words]) => words.some(w => hay.includes(w)))
    .map(([id]) => id);
  return found.length ? found.slice(0, 4) : ['handmade'];
}

export function describeProduct(productName, bizName, tone = 'Friendly') {
  const n = productName.trim();
  const seed = n.length;
  const lines = {
    Friendly: [
      `Our ${n} is a customer favorite, made fresh and with love.`,
      `You'll keep coming back for our ${n}. It's that good.`,
    ],
    Professional: [
      `${n}: crafted with quality ingredients and attention to detail.`,
      `A signature ${n} from ${bizName}, prepared to order.`,
    ],
    Playful: [
      `${n}? Yes please. Trust us on this one.`,
      `Fair warning: one ${n} is never enough.`,
    ],
  }[tone] || [`Try our ${n}.`];
  return pick(lines, seed);
}

const interestLabel = Object.fromEntries(INTERESTS.map(i => [i.id, i.label]));

export function insights(biz, stats, interests, products) {
  const tips = [];
  const change = stats.prev.views ? (stats.totals.views - stats.prev.views) / stats.prev.views : 0;

  if (!stats.totals.views) {
    tips.push({ icon: 'store', text: 'Your profile is brand new. Add 3+ products and a deal. Profiles with deals get about 2× more taps in the first week.' });
    tips.push({ icon: 'pen', text: 'Write a bio with the Writing Assistant. Clear bios help the For You feed match you to the right shoppers.' });
    return tips;
  }

  if (interests[0]) {
    const top = interests[0];
    tips.push({ icon: 'target', text: `${top.value}% of your viewers are into ${top.label}. Feature something for them at the top of your profile.` });
  }
  if (products[0] && products.length > 1) {
    tips.push({ icon: 'star', text: `"${products[0].label}" gets the most taps. Try a bundle deal with your least-tapped item.` });
  }
  if (change > 0.05) tips.push({ icon: 'trending', text: `Views are up ${Math.round(change * 100)}% vs. the previous ${stats.days} days. Keep posting deals while momentum is high.` });
  else if (change < -0.05) tips.push({ icon: 'trendingDown', text: `Views dipped ${Math.round(-change * 100)}%. A limited-time deal is the fastest way to get back in the For You feed.` });
  if (!biz.deal) tips.push({ icon: 'tag', text: 'You have no active deal. Shops with a deal show up in the Deals tab and get a For You boost.' });

  const tapRate = stats.totals.views ? stats.totals.taps / stats.totals.views : 0;
  if (tapRate < 0.3) tips.push({ icon: 'package', text: `Only ${Math.round(tapRate * 100)}% of viewers tap a product. Add clearer product names and prices.` });
  const missing = interests.map(i => i.id).filter(id => !biz.tags.includes(id));
  if (missing[0]) tips.push({ icon: 'tag', text: `Many viewers also like ${interestLabel[missing[0]]}. Adding that tag could put you in more feeds.` });

  return tips.slice(0, 4);
}
