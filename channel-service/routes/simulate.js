import { Router } from 'express';
import { simulateDelivery } from '../services/simulator.js';

const router = Router();

// POST /simulate — accept a message for simulated delivery
router.post('/', (req, res) => {
  const { communicationId, recipientPhone, message, channel, crmReceiptUrl } = req.body;

  // Validate all required fields
  const missing = [];
  if (!communicationId)  missing.push('communicationId');
  if (!recipientPhone)   missing.push('recipientPhone');
  if (!message)          missing.push('message');
  if (!channel)          missing.push('channel');
  if (!crmReceiptUrl)    missing.push('crmReceiptUrl');

  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }

  // Respond immediately — fire-and-forget
  console.log(`Accepted simulation for communicationId: ${communicationId}`);
  res.status(200).json({ status: 'accepted', communicationId });

  // Kick off async delivery pipeline (not awaited)
  simulateDelivery(communicationId, crmReceiptUrl);
});

export default router;
