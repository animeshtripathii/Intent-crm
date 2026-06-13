import Customer from '../models/Customer.js';
import Order from '../models/Order.js';

// ── Build MongoDB Query from Filters ─────────────────────────────────────
export const buildQuery = async (filters) => {
  if (!filters || Object.keys(filters).length === 0) return {};

  const query = {};

  // totalSpend range
  if (filters.minSpend !== undefined || filters.maxSpend !== undefined) {
    query.totalSpend = {};
    if (filters.minSpend !== undefined) query.totalSpend.$gte = filters.minSpend;
    if (filters.maxSpend !== undefined) query.totalSpend.$lte = filters.maxSpend;
  }

  // totalOrders range
  if (filters.minOrders !== undefined || filters.maxOrders !== undefined) {
    query.totalOrders = {};
    if (filters.minOrders !== undefined) query.totalOrders.$gte = filters.minOrders;
    if (filters.maxOrders !== undefined) query.totalOrders.$lte = filters.maxOrders;
  }

  // lastOrderDate — customers who haven't ordered in N days
  if (filters.daysSinceLastOrder !== undefined) {
    const days = typeof filters.daysSinceLastOrder === 'object'
      ? (filters.daysSinceLastOrder.$gte || filters.daysSinceLastOrder.$lte || 60)
      : filters.daysSinceLastOrder;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    query.lastOrderDate = { $lte: cutoff };
  }

  // city — exact match
  if (filters.city) {
    query.city = filters.city;
  }

  // tags — match any of the supplied tags
  if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }

  // category & minOrderAmount filters (requires orders query)
  if (filters.category || filters.minOrderAmount !== undefined) {
    const orderQuery = {};
    if (filters.category) {
      orderQuery.category = filters.category;
    }
    if (filters.minOrderAmount !== undefined) {
      orderQuery.amount = { $gte: filters.minOrderAmount };
    }

    const matchingOrders = await Order.find(orderQuery).select('customerId').lean();
    const customerIds = matchingOrders.map((o) => o.customerId);

    // Apply customerIds filter to query
    query._id = { $in: customerIds };
  }

  return query;
};

// ── Get All Matched Customers ────────────────────────────────────────────
export const getMatchedCustomers = async (filters) => {
  const query = await buildQuery(filters);
  const customers = await Customer.find(query).lean();
  console.log(`Segment matched ${customers.length} customers for filters: ${JSON.stringify(filters)}`);
  return customers;
};

// ── Preview: Count + 3 Samples ───────────────────────────────────────────
export const getSegmentPreview = async (filters) => {
  const query = await buildQuery(filters);
  const [count, samples] = await Promise.all([
    Customer.countDocuments(query),
    Customer.find(query).limit(3).lean(),
  ]);
  return { count, samples };
};
