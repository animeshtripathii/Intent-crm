// entrypoint for the CRM to dispatch messages. completely asynchronous.
import { Router } from 'express';
import { simulateDelivery } from '../services/simulator.js';

const router = Router();

router.post('/', (req, res) => {
  // verify the shared secret from the CRM
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.CHANNEL_SERVICE_SECRET) {
    console.warn('Unauthorized request to /simulate');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { communicationId, recipientPhone, message, channel, crmReceiptUrl } = req.body;

  const missing = [];
  if (!communicationId)  missing.push('communicationId');
  if (!recipientPhone)   missing.push('recipientPhone');
  if (!message)          missing.push('message');
  if (!channel)          missing.push('channel');
  if (!crmReceiptUrl)    missing.push('crmReceiptUrl');

  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }

  // immediately release the connection so we don't block the CRM
  console.log(`Accepted simulation for communicationId: ${communicationId}`);
  res.status(200).json({ status: 'accepted', communicationId });

  // let the simulator run in the background
  simulateDelivery(communicationId, crmReceiptUrl);
});

export default router;
