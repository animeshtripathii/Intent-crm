// translates parsed JSON filters into raw MongoDB queries.
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';

// dynamic query builder — skips keys that aren't provided
export const buildQuery = async (filters) => {
  if (!filters || Object.keys(filters).length === 0) return {};

  const query = {};

  if (filters.minSpend !== undefined || filters.maxSpend !== undefined) {
    query.totalSpend = {};
    if (filters.minSpend !== undefined) query.totalSpend.$gte = filters.minSpend;
    if (filters.maxSpend !== undefined) query.totalSpend.$lte = filters.maxSpend;
  }

  if (filters.minOrders !== undefined || filters.maxOrders !== undefined) {
    query.totalOrders = {};
    if (filters.minOrders !== undefined) query.totalOrders.$gte = filters.minOrders;
    if (filters.maxOrders !== undefined) query.totalOrders.$lte = filters.maxOrders;
  }

  if (filters.daysSinceLastOrder !== undefined) {
    const days = typeof filters.daysSinceLastOrder === 'object'
      ? (filters.daysSinceLastOrder.$gte || filters.daysSinceLastOrder.$lte || 60)
      : filters.daysSinceLastOrder;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    query.lastOrderDate = { $lte: cutoff };
  }

  if (filters.city) {
    query.city = filters.city;
  }

  if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }

  // join required — find matching orders first, then extract customer IDs
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

    query._id = { $in: customerIds };
  }

  return query;
};

export const getMatchedCustomers = async (filters) => {
  const query = await buildQuery(filters);
  const customers = await Customer.find(query).lean();
  console.log(`Segment matched ${customers.length} customers for filters: ${JSON.stringify(filters)}`);
  return customers;
};

// quick preview for the UI — returns total count and just 3 sample docs
export const getSegmentPreview = async (filters) => {
  const query = await buildQuery(filters);
  const [count, samples] = await Promise.all([
    Customer.countDocuments(query),
    Customer.find(query).limit(3).lean(),
  ]);
  return { count, samples };
};
