import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';

// Load .env from crm-backend root regardless of where the script is run from
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// ── Constants ───────────────────────────────────────────────────────────
const CITIES = ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune'];
const ORDER_CATEGORIES = ['coffee', 'fashion', 'beauty', 'electronics', 'home', 'fitness'];

const ITEMS_BY_CATEGORY = {
  coffee:      ['Espresso', 'Latte', 'Cappuccino', 'Cold Brew', 'Mocha', 'Americano'],
  fashion:     ['T-Shirt', 'Jeans', 'Sneakers', 'Jacket', 'Dress', 'Sunglasses'],
  beauty:      ['Moisturizer', 'Serum', 'Lipstick', 'Foundation', 'Perfume', 'Shampoo'],
  electronics: ['Earbuds', 'Phone Case', 'Charger', 'Smart Watch', 'Power Bank', 'Speaker'],
  home:        ['Candle', 'Cushion', 'Mug Set', 'Throw Blanket', 'Plant Pot', 'Wall Art'],
  fitness:     ['Yoga Mat', 'Resistance Band', 'Protein Shake', 'Dumbbells', 'Gym Bag', 'Shaker'],
};

// ── Helpers ─────────────────────────────────────────────────────────────
const rand = (min, max) => faker.number.int({ min, max });
const randFloat = (min, max) => Math.round(faker.number.float({ min, max, fractionDigits: 2 }) * 100) / 100;
const daysAgo = (min, max) => {
  const d = new Date();
  d.setDate(d.getDate() - rand(min, max));
  return d;
};
const pick = (arr) => arr[rand(0, arr.length - 1)];

function makePhone() {
  return `+91${faker.string.numeric(10)}`;
}

/**
 * Split `totalSpend` roughly among `count` orders, returning an array of amounts.
 */
function splitSpend(totalSpend, count) {
  if (count === 1) return [totalSpend];
  const weights = Array.from({ length: count }, () => Math.random());
  const sum = weights.reduce((a, b) => a + b, 0);
  const amounts = weights.map((w) => Math.round((w / sum) * totalSpend * 100) / 100);
  // Adjust rounding drift on the last element
  const diff = totalSpend - amounts.reduce((a, b) => a + b, 0);
  amounts[amounts.length - 1] = Math.round((amounts[amounts.length - 1] + diff) * 100) / 100;
  return amounts;
}

function buildOrders(customerId, totalSpend, orderCount, lastOrderDate) {
  const amounts = splitSpend(totalSpend, orderCount);
  return amounts.map((amount, i) => {
    const category = pick(ORDER_CATEGORIES);
    const itemCount = rand(1, 3);
    const items = Array.from({ length: itemCount }, () => pick(ITEMS_BY_CATEGORY[category]));
    // Spread order dates: most recent = lastOrderDate, earlier ones further back
    const orderDate = new Date(lastOrderDate);
    orderDate.setDate(orderDate.getDate() - i * rand(3, 15));
    return {
      customerId,
      amount,
      category,
      items,
      createdAt: orderDate,
    };
  });
}

function buildCustomer(overrides) {
  return {
    name: faker.person.fullName(),
    phone: makePhone(),
    email: faker.internet.email().toLowerCase(),
    city: pick(CITIES),
    ...overrides,
  };
}

// ── Segment Definitions ─────────────────────────────────────────────────
const segments = [
  {
    label: 'VIP',
    count: 30,
    gen: () => {
      const totalSpend = rand(15000, 40000);
      const totalOrders = rand(8, 20);
      const lastOrderDate = daysAgo(0, 30);
      return { totalSpend, totalOrders, lastOrderDate, tags: ['vip'] };
    },
  },
  {
    label: 'Lapsed',
    count: 60,
    gen: () => {
      const totalSpend = rand(3000, 10000);
      const totalOrders = rand(3, 8);
      const lastOrderDate = daysAgo(60, 120);
      return { totalSpend, totalOrders, lastOrderDate, tags: ['lapsed'] };
    },
  },
  {
    label: 'New',
    count: 50,
    gen: () => {
      const totalSpend = rand(500, 3000);
      const totalOrders = rand(1, 2);
      const lastOrderDate = daysAgo(0, 20);
      return { totalSpend, totalOrders, lastOrderDate, tags: ['new'] };
    },
  },
  {
    label: 'Repeat',
    count: 80,
    gen: () => {
      const totalSpend = rand(5000, 15000);
      const totalOrders = rand(3, 7);
      const lastOrderDate = daysAgo(0, 45);
      return { totalSpend, totalOrders, lastOrderDate, tags: ['repeat'] };
    },
  },
  {
    label: 'Dormant',
    count: 50,
    gen: () => {
      const totalSpend = rand(500, 5000);
      const totalOrders = rand(1, 3);
      const lastOrderDate = daysAgo(121, 300);
      return { totalSpend, totalOrders, lastOrderDate, tags: [] };
    },
  },
  {
    label: 'High-spend low-frequency',
    count: 30,
    gen: () => {
      const totalSpend = rand(10000, 30000);
      const totalOrders = rand(1, 4);
      const lastOrderDate = daysAgo(0, 60);
      return { totalSpend, totalOrders, lastOrderDate, tags: ['vip'] };
    },
  },
  {
    label: 'New (No Orders)',
    count: 20,
    gen: () => {
      return { totalSpend: 0, totalOrders: 0, lastOrderDate: null, tags: ['new'] };
    },
  },
];

// ── Main ────────────────────────────────────────────────────────────────
async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Create a .env file in crm-backend/');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Drop existing data
  await Customer.deleteMany({});
  await Order.deleteMany({});
  console.log('Cleared existing customers and orders');

  let totalCustomers = 0;
  let totalOrderDocs = 0;

  for (const seg of segments) {
    const customers = [];
    const orders = [];

    for (let i = 0; i < seg.count; i++) {
      const overrides = seg.gen();
      const orderCount = Math.min(overrides.totalOrders, rand(1, 5)); // 1–5 order docs
      const customerData = buildCustomer(overrides);

      // Insert customer first to get _id
      const customer = await Customer.create(customerData);

      if (orderCount > 0) {
        const customerOrders = buildOrders(
          customer._id,
          overrides.totalSpend,
          orderCount,
          overrides.lastOrderDate,
        );
        orders.push(...customerOrders);
      }
      totalCustomers++;
    }

    if (orders.length > 0) {
      await Order.insertMany(orders);
      totalOrderDocs += orders.length;
    }

    console.log(`  ✓ ${seg.label}: ${seg.count} customers, ${orders.length} orders`);
  }

  console.log(`\nSeeded ${totalCustomers} customers and ${totalOrderDocs} orders successfully`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
