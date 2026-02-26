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
  await Product.insertMany([
    {
      title: 'Smart Surge Protector 8-Outlet',
      description: 'Reliable surge protection with USB ports and compact design.',
      sellerId,
      category: 'electrical',
      price: 24.99,
      currency: 'INR',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1585914924626-15adac1e6402?auto=format&fit=crop&w=1200&q=80',
          publicId: 'seed/surge-protector',
        },
      ],
      brand: 'VoltGuard',
      tags: ['home', 'safety', 'usb'],
      status: 'APPROVED',
      stock: 25,
    },
    {
      title: 'Whey Protein Isolate (2lb)',
      description: 'High-protein isolate for lean muscle support and fast recovery.',
      sellerId,
      category: 'supplements',
      price: 39.99,
      currency: 'INR',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989f?auto=format&fit=crop&w=1200&q=80',
          publicId: 'seed/whey',
        },
      ],
      brand: 'GymFuel',
      tags: ['protein', 'fitness'],
      status: 'APPROVED',
      stock: 40,
    },
    {
      title: "Men's Performance Hoodie",
      description: 'Soft, breathable hoodie with an athletic fit.',
      sellerId,
      category: 'clothes_men',
      price: 49.0,
      currency: 'INR',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1520975958225-4f5a7d9c1b10?auto=format&fit=crop&w=1200&q=80',
          publicId: 'seed/mens-hoodie',
        },
      ],
      brand: 'MotionWear',
      tags: ['hoodie', 'men'],
      status: 'APPROVED',
      stock: 18,
    },
    {
      title: "Women's Seamless Leggings",
      description: 'Stretchy, supportive leggings for workouts or everyday comfort.',
      sellerId,
      category: 'clothes_women',
      price: 42.0,
      currency: 'INR',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1520975682031-a4fe8be3a1a5?auto=format&fit=crop&w=1200&q=80',
          publicId: 'seed/womens-leggings',
        },
      ],
      brand: 'FlexAura',
      tags: ['leggings', 'women'],
      status: 'APPROVED',
      stock: 30,
    },
    {
      title: "Kids' Graphic T-Shirt",
      description: 'Comfortable cotton tee with a fun graphic print.',
      sellerId,
      category: 'clothes_kids',
      price: 18.0,
      currency: 'INR',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
          publicId: 'seed/kids-tee',
        },
      ],
      brand: 'TinyTrend',
      tags: ['kids', 'tshirt'],
      status: 'APPROVED',
      stock: 50,
    },
  ]);
}

module.exports = { seedProducts };
