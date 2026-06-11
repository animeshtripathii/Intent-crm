import { Router } from 'express';

const router = Router();

// POST /api/receipt — ingest delivery callbacks from channel service
router.post('/', (_req, res) => {
  res.json({ message: 'TODO: ingest delivery receipt from channel service', status: 200 });
});

export default router;
