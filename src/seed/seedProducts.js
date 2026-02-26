const { Product } = require('../models/Product');
const { User } = require('../models/User');

async function getFallbackSellerId() {
  const superAdmin = await User.findOne({ role: 'SUPER_ADMIN' }).select('_id');
  if (!superAdmin) {
    throw new Error('Cannot seed products without SUPER_ADMIN user (run seedUsers first)');
  }
  return superAdmin._id;
}

async function seedProducts() {
  const sellerId = await getFallbackSellerId();
  await Product.deleteMany({});

  const categories = [
    {
      category: 'electrical',
      brand: 'VoltGuard',
      baseImages: [
        'https://images.unsplash.com/photo-1585914924626-15adac1e6402?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1518110837873-77a2ffdb703d?auto=format&fit=crop&w=1200&q=80',
      ],
      items: [
        { title: 'Smart Surge Protector 8-Outlet', price: 24.99, tags: ['home', 'safety', 'usb'] },
        { title: 'USB-C Fast Charger 65W', price: 19.99, tags: ['charger', 'usb-c'] },
        { title: 'Smart Plug (Wi‑Fi) Pack of 2', price: 22.5, tags: ['smart', 'home'] },
        { title: 'Extension Board 6-Socket', price: 14.0, tags: ['power', 'home'] },
        { title: 'LED Desk Lamp (Dimmable)', price: 29.0, tags: ['lamp', 'study'] },
        { title: 'Cable Organizer Clips', price: 7.99, tags: ['cable', 'desk'] },
        { title: 'Universal Travel Adapter', price: 18.0, tags: ['travel', 'adapter'] },
        { title: 'Power Bank 20000mAh', price: 32.0, tags: ['powerbank', 'travel'] },
        { title: 'Wireless Doorbell Kit', price: 27.0, tags: ['home', 'security'] },
        { title: 'Smart Night Light Sensor', price: 11.0, tags: ['light', 'sensor'] },
      ],
    },
    {
      category: 'supplements',
      brand: 'GymFuel',
      baseImages: [
        'https://images.unsplash.com/photo-1593095948071-474c5cc2989f?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1579722821403-8e0cc2f74f59?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1599058917212-d750089bc07a?auto=format&fit=crop&w=1200&q=80',
      ],
      items: [
        { title: 'Whey Protein Isolate (2lb)', price: 39.99, tags: ['protein', 'fitness'] },
        { title: 'Creatine Monohydrate (300g)', price: 17.99, tags: ['strength', 'performance'] },
        { title: 'Pre-Workout (Fruit Burst)', price: 21.5, tags: ['energy', 'training'] },
        { title: 'Omega-3 Fish Oil (60 caps)', price: 12.99, tags: ['recovery', 'health'] },
        { title: 'Multivitamin Daily (90 tabs)', price: 14.5, tags: ['vitamins', 'wellness'] },
        { title: 'Electrolyte Hydration Mix', price: 9.99, tags: ['hydration', 'sports'] },
        { title: 'Mass Gainer (1kg)', price: 26.0, tags: ['calories', 'bulk'] },
        { title: 'BCAA Powder (250g)', price: 15.0, tags: ['recovery', 'amino'] },
        { title: 'Protein Bars Pack (12)', price: 18.0, tags: ['snack', 'protein'] },
        { title: 'Zinc + Magnesium (60 tabs)', price: 11.0, tags: ['sleep', 'recovery'] },
      ],
    },
    {
      category: 'clothes_men',
      brand: 'MotionWear',
      baseImages: [
        'https://images.unsplash.com/photo-1520975958225-4f5a7d9c1b10?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1520975431068-3cde3f0a6c61?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1520975809534-8cb77a0b3b71?auto=format&fit=crop&w=1200&q=80',
      ],
      items: [
        { title: "Men's Performance Hoodie", price: 49.0, tags: ['hoodie', 'men'] },
        { title: "Men's Training T-Shirt", price: 19.0, tags: ['tshirt', 'gym'] },
        { title: "Men's Joggers (Slim Fit)", price: 29.0, tags: ['joggers', 'daily'] },
        { title: "Men's Running Shorts", price: 17.5, tags: ['shorts', 'run'] },
        { title: "Men's Lightweight Jacket", price: 54.0, tags: ['jacket', 'outdoor'] },
        { title: "Men's Polo Shirt", price: 22.0, tags: ['polo', 'casual'] },
        { title: "Men's Socks Pack (6)", price: 9.0, tags: ['socks', 'basics'] },
        { title: "Men's Compression Tee", price: 24.0, tags: ['compression', 'training'] },
        { title: "Men's Casual Shirt", price: 31.0, tags: ['shirt', 'casual'] },
        { title: "Men's Track Pants", price: 28.0, tags: ['track', 'sport'] },
      ],
    },
    {
      category: 'clothes_women',
      brand: 'FlexAura',
      baseImages: [
        'https://images.unsplash.com/photo-1520975682031-a4fe8be3a1a5?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1520975664944-5a3a3e5bdcf8?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1520975829413-3f0829d9b377?auto=format&fit=crop&w=1200&q=80',
      ],
      items: [
        { title: "Women's Seamless Leggings", price: 42.0, tags: ['leggings', 'women'] },
        { title: "Women's Sports Bra", price: 24.0, tags: ['sportsbra', 'gym'] },
        { title: "Women's Oversized Hoodie", price: 46.0, tags: ['hoodie', 'daily'] },
        { title: "Women's Training Tee", price: 18.0, tags: ['tshirt', 'training'] },
        { title: "Women's Running Shorts", price: 16.0, tags: ['shorts', 'run'] },
        { title: "Women's Zip Jacket", price: 52.0, tags: ['jacket', 'outdoor'] },
        { title: "Women's Yoga Pants", price: 39.0, tags: ['yoga', 'comfort'] },
        { title: "Women's Tank Top", price: 14.0, tags: ['tank', 'summer'] },
        { title: "Women's Socks Pack (5)", price: 8.0, tags: ['socks', 'basics'] },
        { title: "Women's Lounge Set", price: 58.0, tags: ['loungewear', 'set'] },
      ],
    },
    {
      category: 'clothes_kids',
      brand: 'TinyTrend',
      baseImages: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1520975693902-8c2d7f3a3b30?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1520975789799-5bfb6f12e726?auto=format&fit=crop&w=1200&q=80',
      ],
      items: [
        { title: "Kids' Graphic T-Shirt", price: 18.0, tags: ['kids', 'tshirt'] },
        { title: "Kids' Hoodie", price: 26.0, tags: ['kids', 'hoodie'] },
        { title: "Kids' Joggers", price: 19.0, tags: ['kids', 'joggers'] },
        { title: "Kids' Shorts", price: 14.0, tags: ['kids', 'shorts'] },
        { title: "Kids' Sneakers", price: 32.0, tags: ['kids', 'shoes'] },
        { title: "Kids' Sandals", price: 18.0, tags: ['kids', 'sandals'] },
        { title: "Kids' Dress", price: 29.0, tags: ['kids', 'dress'] },
        { title: "Kids' Jacket", price: 34.0, tags: ['kids', 'jacket'] },
        { title: "Kids' Socks Pack (6)", price: 7.5, tags: ['kids', 'socks'] },
        { title: "Kids' Backpack", price: 21.0, tags: ['kids', 'bag'] },
      ],
    },
  ];

  const now = Date.now();
  const products = [];

  for (const c of categories) {
    c.items.forEach((it, idx) => {
      const imgUrl = c.baseImages[idx % c.baseImages.length];
      products.push({
        title: it.title,
        description: 'Quality build with a clean, minimal design. Great value for everyday use.',
        sellerId,
        category: c.category,
        price: it.price,
        currency: 'INR',
        images: [
          {
            url: imgUrl,
            publicId: `seed/${c.category}/${now}-${idx}`,
          },
        ],
        brand: c.brand,
        tags: it.tags,
        status: 'APPROVED',
        stock: 15 + (idx % 20),
      });
    });
  }

  await Product.insertMany(products);
}

module.exports = { seedProducts };
