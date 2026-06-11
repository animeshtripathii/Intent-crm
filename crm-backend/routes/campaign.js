import { Router } from 'express';

const router = Router();

// POST /api/campaign — create and fire a campaign
router.post('/', (_req, res) => {
  res.json({ message: 'TODO: create and fire a campaign', status: 200 });
});

// GET /api/campaign — list all campaigns
router.get('/', (_req, res) => {
  res.json({ message: 'TODO: list all campaigns', status: 200 });
});

export default router;
