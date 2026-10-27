// All seed data for the demo. Every business here is fictional.
// To rename the app, change APP.name here and in index.html + manifest.webmanifest.

export const APP = {
  name: 'Orbit',
  slogan: 'Small shops. Big reach.',
};

// Customers are assumed to be standing at the ASU Memorial Union (Tempe, AZ).
export const ORIGIN = { lat: 33.4176, lng: -111.9341, label: 'ASU Memorial Union' };

// A business must be under BOTH limits to be verified as "small".
export const SMALL_LIMITS = { revenue: 1_000_000, employees: 50 };

export const INTERESTS = [
  { id: 'coffee', label: 'Coffee', emoji: '☕' },
  { id: 'food', label: 'Food & Eats', emoji: '🌮' },
  { id: 'sweets', label: 'Sweets', emoji: '🧁' },
  { id: 'thrift', label: 'Thrift', emoji: '🛍️' },
  { id: 'vintage', label: 'Vintage', emoji: '📼' },
  { id: 'beauty', label: 'Beauty', emoji: '💅' },
  { id: 'fitness', label: 'Fitness', emoji: '🥊' },
  { id: 'art', label: 'Art', emoji: '🎨' },
  { id: 'music', label: 'Music', emoji: '🎧' },
  { id: 'books', label: 'Books', emoji: '📚' },
  { id: 'plants', label: 'Plants', emoji: '🪴' },
  { id: 'pets', label: 'Pets', emoji: '🐾' },
  { id: 'bikes', label: 'Bikes', emoji: '🚲' },
  { id: 'tech', label: 'Tech Repair', emoji: '📱' },
  { id: 'handmade', label: 'Handmade', emoji: '🧶' },
];

export const CATEGORIES = [
  'Coffee', 'Food Truck', 'Restaurant', 'Bakery', 'Thrift', 'Records', 'Books',
  'Beauty', 'Fitness', 'Art', 'Plants', 'Pets', 'Bike Shop', 'Repair', 'Gifts',
];

export const PLANS = [
  {
    id: 'free', name: 'Starter', price: 0,
    blurb: 'Get discovered.',
    features: ['Verified small-business profile', 'Show up in Discover & Map', 'Total profile views', 'Post 1 deal a month'],
  },
  {
    id: 'pro', name: 'Pro', price: 14.99, popular: true,
    blurb: 'Know your customers.',
    features: ['Everything in Starter', 'Full analytics dashboard', '"Who viewed you" insights', 'AI Profile Assistant', 'Unlimited deals'],
  },
  {
    id: 'growth', name: 'Growth', price: 29.99,
    blurb: 'Get in front of more people.',
    features: ['Everything in Pro', 'Boosted For You placement', 'Weekly AI growth tips', 'Campus event spotlight', 'Priority support'],
  },
];

// hours: [open, close] in 24h local time, same every day for simplicity.
// popularity: average daily profile views, used to seed the analytics.
export const BUSINESSES = [
  {
    id: 1, name: 'Saguaro Sips', category: 'Coffee', emoji: '☕', color: '#2f7d5b',
    tagline: 'Cold brew on wheels, steps from Hayden Lawn.',
    bio: 'A student-run coffee cart pouring prickly pear cold brew and horchata lattes between classes. Every bean is roasted in Phoenix.',
    tags: ['coffee', 'sweets', 'handmade'], lat: 33.4190, lng: -111.9355, area: 'Hayden Lawn',
    hours: [7, 15], rating: 4.9, reviews: 212, priceLevel: 1, employees: 4, revenue: 140000, founded: 2023, owner: 'Maya',
    popularity: 46,
    deal: { title: '15% off any drink', detail: 'Show your Orbit app at the cart.', code: 'SIPS15' },
    products: [
      { name: 'Prickly Pear Cold Brew', price: 5.5, emoji: '🌵', desc: 'Slow-steeped 18 hours with a splash of real prickly pear syrup.' },
      { name: 'Horchata Latte', price: 5.75, emoji: '🥛', desc: 'Espresso, house horchata and a dusting of cinnamon.' },
      { name: 'Mesquite Mocha', price: 6, emoji: '🍫', desc: 'Dark chocolate with smoky mesquite syrup.' },
      { name: 'Concha', price: 3, emoji: '🍞', desc: 'Sweet bread from a family bakery in Mesa.' },
    ],
  },
  {
    id: 2, name: 'Second Spin Thrift', category: 'Thrift', emoji: '🛍️', color: '#b5563b',
    tagline: 'Hand-picked vintage on Mill Ave.',
    bio: 'Curated secondhand clothes, denim and vinyl. We buy, sell and trade, and we restock every Thursday.',
    tags: ['thrift', 'vintage', 'music'], lat: 33.4237, lng: -111.9399, area: 'Mill Ave',
    hours: [10, 20], rating: 4.7, reviews: 389, priceLevel: 1, employees: 6, revenue: 310000, founded: 2019, owner: 'Dante',
    popularity: 58,
    deal: { title: '$5 off $25+', detail: 'Valid on everything except consignment.', code: 'SPIN5' },
    products: [
      { name: 'Vintage Band Tees', price: 14, emoji: '👕', desc: 'Real 80s and 90s tour shirts, checked for holes.' },
      { name: 'Denim Jackets', price: 28, emoji: '🧥', desc: 'Broken-in denim jackets in every wash.' },
      { name: 'Vinyl Records', price: 8, emoji: '💿', desc: 'Crate-dug classics and local bands.' },
    ],
  },
  {
    id: 3, name: 'Tacos La Paloma', category: 'Food Truck', emoji: '🌮', color: '#c98a12',
    tagline: 'Sonoran street tacos, family recipe since 1998.',
    bio: 'Three generations, one truck. Carne asada over mesquite, handmade tortillas, and salsas we will not share the recipe for.',
    tags: ['food'], lat: 33.4150, lng: -111.9268, area: 'Apache Blvd',
    hours: [11, 22], rating: 4.8, reviews: 540, priceLevel: 1, employees: 5, revenue: 260000, founded: 2016, owner: 'Rosa',
    popularity: 64,
    deal: { title: 'Free horchata with 3 tacos', detail: 'Tuesdays only.', code: 'PALOMA' },
    products: [
      { name: 'Carne Asada Taco', price: 3.5, emoji: '🌮', desc: 'Mesquite-grilled steak on a fresh corn tortilla.' },
      { name: 'Al Pastor Plate', price: 11, emoji: '🍍', desc: 'Three tacos, rice, beans and grilled pineapple.' },
      { name: 'Sonoran Hot Dog', price: 6, emoji: '🌭', desc: 'Bacon-wrapped, with beans, onions and jalapeño.' },
    ],
  },
  {
    id: 4, name: 'Gilded Nail Studio', category: 'Beauty', emoji: '💅', color: '#b0477a',
    tagline: 'Nail art by appointment, walk-ins welcome.',
    bio: 'A two-artist studio specializing in gel-X, chrome and custom hand-painted designs. Game-day sets in maroon and gold every fall.',
    tags: ['beauty', 'art'], lat: 33.4105, lng: -111.9405, area: 'University Dr',
    hours: [10, 19], rating: 4.9, reviews: 167, priceLevel: 2, employees: 3, revenue: 120000, founded: 2022, owner: 'Linh',
    popularity: 32,
    deal: null,
    products: [
      { name: 'Gel-X Full Set', price: 55, emoji: '✨', desc: 'Soft gel extensions in any shape and length.' },
      { name: 'Game Day Set', price: 45, emoji: '🏈', desc: 'Hand-painted maroon and gold designs.' },
      { name: 'Classic Manicure', price: 25, emoji: '💅', desc: 'Shape, cuticle care and polish.' },
    ],
  },
  {
    id: 5, name: 'Spoke & Wrench', category: 'Bike Shop', emoji: '🚲', color: '#3d6fb6',
    tagline: 'Flat tire before class? We got you.',
    bio: 'Fast student bike repair, used bikes and locks. Most flats fixed in 15 minutes while you wait.',
    tags: ['bikes', 'fitness'], lat: 33.4172, lng: -111.9207, area: 'Rural Rd',
    hours: [8, 18], rating: 4.6, reviews: 98, priceLevel: 1, employees: 2, revenue: 90000, founded: 2020, owner: 'Theo',
    popularity: 22,
    deal: { title: '$10 tune-up for students', detail: 'Bring your Sun Card.', code: 'SPOKE10' },
    products: [
      { name: 'Flat Fix', price: 12, emoji: '🛞', desc: 'Tube replacement in about 15 minutes.' },
      { name: 'Full Tune-Up', price: 45, emoji: '🔧', desc: 'Brakes, gears, chain and a safety check.' },
      { name: 'U-Lock', price: 30, emoji: '🔒', desc: 'The lock that actually stops thieves on campus.' },
    ],
  },
  {
    id: 6, name: 'Sunrise Crumb Bakery', category: 'Bakery', emoji: '🧁', color: '#d9772b',
    tagline: 'Croissants worth waking up for.',
    bio: 'Small-batch pastries baked at 4am every morning. When they are gone, they are gone.',
    tags: ['sweets', 'food', 'coffee'], lat: 33.4290, lng: -111.9365, area: 'Downtown Tempe',
    hours: [6, 14], rating: 4.8, reviews: 301, priceLevel: 2, employees: 7, revenue: 420000, founded: 2018, owner: 'Claire',
    popularity: 41,
    deal: null,
    products: [
      { name: 'Butter Croissant', price: 4, emoji: '🥐', desc: '72-hour laminated dough, crisp outside and soft inside.' },
      { name: 'Date Shake Cupcake', price: 4.5, emoji: '🧁', desc: 'A nod to the classic Arizona date shake.' },
      { name: 'Sourdough Loaf', price: 9, emoji: '🍞', desc: 'Naturally leavened, baked fresh daily.' },
    ],
  },
  {
    id: 7, name: 'Ink & Agave Collective', category: 'Art', emoji: '🎨', color: '#6a4bb3',
    tagline: '20 local artists under one roof.',
    bio: 'A gallery and shop where Tempe artists sell prints, stickers and originals. Open studio nights every First Friday.',
    tags: ['art', 'handmade'], lat: 33.4248, lng: -111.9412, area: 'Mill Ave',
    hours: [11, 19], rating: 4.7, reviews: 122, priceLevel: 2, employees: 3, revenue: 150000, founded: 2021, owner: 'Javier',
    popularity: 27,
    deal: { title: 'Free sticker with any print', detail: 'While supplies last.', code: 'INKFREE' },
    products: [
      { name: 'Desert Sunset Print', price: 25, emoji: '🌅', desc: '11x14 giclée print by a local artist.' },
      { name: 'Sticker Pack', price: 8, emoji: '🌵', desc: '6 waterproof stickers for your laptop.' },
      { name: 'Original Canvas', price: 180, emoji: '🖼️', desc: 'One-of-a-kind acrylic on canvas.' },
    ],
  },
  {
    id: 8, name: 'Leaf Lab', category: 'Plants', emoji: '🪴', color: '#3e8e41',
    tagline: 'Dorm-proof plants and pots.',
    bio: 'Low-light, low-water plants that survive dorm life, plus handmade pots and free repotting.',
    tags: ['plants', 'handmade'], lat: 33.4069, lng: -111.9340, area: 'Broadway Rd',
    hours: [9, 18], rating: 4.8, reviews: 143, priceLevel: 2, employees: 3, revenue: 110000, founded: 2021, owner: 'Priya',
    popularity: 24,
    deal: { title: 'Free repot with any plant', detail: 'Bring your own pot or buy one.', code: 'LEAFLAB' },
    products: [
      { name: 'Snake Plant', price: 18, emoji: '🌿', desc: 'Nearly unkillable and loves low light.' },
      { name: 'Mini Succulent Trio', price: 15, emoji: '🌵', desc: 'Three tiny succulents in clay pots.' },
      { name: 'Hand-thrown Pot', price: 22, emoji: '🏺', desc: 'Glazed ceramic by a Tempe potter.' },
    ],
  },
  {
    id: 9, name: 'Paws on Apache', category: 'Pets', emoji: '🐾', color: '#a0612b',
    tagline: 'Grooming, treats and puppy playdates.',
    bio: 'Neighborhood dog grooming with a self-serve wash station and homemade treats.',
    tags: ['pets'], lat: 33.4147, lng: -111.9150, area: 'Apache Blvd',
    hours: [8, 18], rating: 4.7, reviews: 88, priceLevel: 2, employees: 4, revenue: 180000, founded: 2017, owner: 'Grace',
    popularity: 18,
    deal: null,
    products: [
      { name: 'Self-Serve Wash', price: 15, emoji: '🛁', desc: 'Tub, shampoo, towels and dryer included.' },
      { name: 'Full Groom', price: 55, emoji: '✂️', desc: 'Bath, cut, nails and a bandana.' },
      { name: 'Peanut Butter Treats', price: 6, emoji: '🦴', desc: 'A dozen homemade dog biscuits.' },
    ],
  },
  {
    id: 10, name: 'FixIt Fast', category: 'Repair', emoji: '📱', color: '#2c6e8f',
    tagline: 'Cracked screen? Fixed in under an hour.',
    bio: 'Phone, tablet and laptop repair with honest pricing. No fix, no fee.',
    tags: ['tech'], lat: 33.4220, lng: -111.9260, area: 'Scottsdale Rd',
    hours: [10, 19], rating: 4.6, reviews: 205, priceLevel: 2, employees: 3, revenue: 230000, founded: 2019, owner: 'Omar',
    popularity: 35,
    deal: { title: '20% off screen repair', detail: 'For ASU students.', code: 'FIXIT20' },
    products: [
      { name: 'iPhone Screen', price: 89, emoji: '📱', desc: 'Premium replacement screen with a 90-day warranty.' },
      { name: 'Battery Swap', price: 49, emoji: '🔋', desc: 'Get your all-day battery back.' },
      { name: 'Laptop Cleanup', price: 39, emoji: '💻', desc: 'Dust out, fresh paste and a software tune-up.' },
    ],
  },
  {
    id: 11, name: 'Desert Pages', category: 'Books', emoji: '📚', color: '#7a5c3e',
    tagline: 'Used books, cheap textbooks, cozy chairs.',
    bio: 'A used bookstore with a textbook buyback that actually pays. Book club on Wednesdays.',
    tags: ['books', 'coffee'], lat: 33.4265, lng: -111.9420, area: 'Mill Ave',
    hours: [9, 21], rating: 4.8, reviews: 176, priceLevel: 1, employees: 4, revenue: 160000, founded: 2015, owner: 'Ruth',
    popularity: 26,
    deal: null,
    products: [
      { name: 'Mystery Book Bundle', price: 12, emoji: '🎁', desc: 'Three wrapped books picked for your taste.' },
      { name: 'Used Textbooks', price: 20, emoji: '📘', desc: 'Up to 70% off campus bookstore prices.' },
      { name: 'Drip Coffee', price: 2, emoji: '☕', desc: 'Bottomless while you read.' },
    ],
  },
  {
    id: 12, name: 'Iron Mesa Boxing', category: 'Fitness', emoji: '🥊', color: '#9b2335',
    tagline: 'Learn to box. Leave stress at the door.',
    bio: 'Beginner-friendly boxing and conditioning classes. First class is always free.',
    tags: ['fitness'], lat: 33.4040, lng: -111.9290, area: 'Broadway Rd',
    hours: [6, 21], rating: 4.9, reviews: 134, priceLevel: 2, employees: 6, revenue: 280000, founded: 2018, owner: 'Marcus',
    popularity: 30,
    deal: { title: 'First class free', detail: 'Gloves provided.', code: 'IRONFREE' },
    products: [
      { name: 'Drop-in Class', price: 20, emoji: '🥊', desc: '60 minutes of boxing and conditioning.' },
      { name: 'Student Monthly', price: 79, emoji: '📅', desc: 'Unlimited classes with a valid student ID.' },
      { name: 'Hand Wraps', price: 10, emoji: '🧤', desc: '180-inch wraps in maroon or black.' },
    ],
  },
  {
    id: 13, name: 'Copper Bowl Poke', category: 'Restaurant', emoji: '🍣', color: '#c4573a',
    tagline: 'Build-your-own bowls, fast.',
    bio: 'Fresh poke and veggie bowls. Order ahead and skip the line between classes.',
    tags: ['food'], lat: 33.4199, lng: -111.9310, area: 'College Ave',
    hours: [11, 21], rating: 4.5, reviews: 260, priceLevel: 2, employees: 9, revenue: 520000, founded: 2020, owner: 'Kenji',
    popularity: 44,
    deal: null,
    products: [
      { name: 'Classic Ahi Bowl', price: 13, emoji: '🍣', desc: 'Ahi tuna, rice, edamame and house shoyu.' },
      { name: 'Spicy Tofu Bowl', price: 11, emoji: '🌶️', desc: 'Crispy tofu with sriracha mayo.' },
      { name: 'Mochi (3 pc)', price: 5, emoji: '🍡', desc: 'Mango, strawberry and matcha.' },
    ],
  },
  {
    id: 14, name: 'Lumen Candle Co.', category: 'Gifts', emoji: '🕯️', color: '#8a6d1f',
    tagline: 'Hand-poured soy candles that smell like Arizona.',
    bio: 'Candles poured in small batches with scents like creosote rain, citrus grove and desert sage.',
    tags: ['handmade', 'art', 'beauty'], lat: 33.4120, lng: -111.9480, area: 'Mill & University',
    hours: [10, 18], rating: 4.9, reviews: 74, priceLevel: 2, employees: 2, revenue: 70000, founded: 2023, owner: 'Ava',
    popularity: 16,
    deal: { title: 'Buy 2, get 1 free', detail: 'Mix and match any scent.', code: 'LUMEN3' },
    products: [
      { name: 'Desert Rain Candle', price: 24, emoji: '🌧️', desc: 'Creosote and petrichor in an amber jar.' },
      { name: 'Citrus Grove Candle', price: 24, emoji: '🍊', desc: 'Orange blossom with grapefruit peel.' },
      { name: 'Pour-Your-Own Class', price: 40, emoji: '🫙', desc: 'Make your own candle in 90 minutes.' },
    ],
  },
  {
    id: 15, name: 'Groove Garden Records', category: 'Records', emoji: '🎧', color: '#3f3d8f',
    tagline: 'New and used vinyl, plus local shows.',
    bio: 'Record shop with listening stations and free in-store shows from Arizona bands every Saturday.',
    tags: ['music', 'vintage'], lat: 33.4310, lng: -111.9395, area: 'Downtown Tempe',
    hours: [11, 21], rating: 4.7, reviews: 156, priceLevel: 2, employees: 3, revenue: 190000, founded: 2014, owner: 'Eli',
    popularity: 21,
    deal: null,
    products: [
      { name: 'New Vinyl', price: 28, emoji: '💿', desc: 'Fresh pressings from indie labels.' },
      { name: 'Dollar Bin', price: 1, emoji: '🪙', desc: 'Hidden gems for a buck.' },
      { name: 'Turntable Starter Kit', price: 149, emoji: '🎶', desc: 'Belt-drive turntable and speakers.' },
    ],
  },
];
