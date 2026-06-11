import { Router } from 'express';

const router = Router();

// GET /api/stats/:id — return stats for a specific campaign
router.get('/:id', (_req, res) => {
  res.json({ message: 'TODO: return campaign stats by id', status: 200 });
});

export default router;
