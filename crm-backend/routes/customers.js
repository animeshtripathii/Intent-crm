import { Router } from 'express';
import Customer from '../models/Customer.js';

const router = Router();

// GET /api/customers — return first 20 customers for preview
router.get('/', async (_req, res) => {
  try {
    const customers = await Customer.find().limit(20);
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
