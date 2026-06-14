// webhook endpoint for the channel service. heavily trafficked, needs to be fast and idempotent.
import { Router } from 'express';
import mongoose from 'mongoose';
import Communication from '../models/Communication.js';
import Campaign from '../models/Campaign.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { communicationId, status, timestamp } = req.body;

    // block unauthorized requests, channel service must send the shared secret
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.CHANNEL_SERVICE_SECRET) {
      console.warn('Unauthorized callback attempt to /api/receipt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!communicationId || !status) {
      return res.status(400).json({ error: 'communicationId and status are required' });
    }

    const comm = await Communication.findById(communicationId);
    if (!comm) {
      return res.status(404).json({ error: 'Communication not found' });
    }

    // idempotency lock — network retries might send the same status twice, don't double-count them
    const alreadyProcessed = comm.statusHistory.some(
      (h) => h.status === status,
    );
    if (alreadyProcessed) {
      console.log(`Duplicate callback ignored: commId ${communicationId} → ${status}`);
      return res.status(200).json({ success: true, duplicate: true });
    }

    await Communication.findByIdAndUpdate(communicationId, {
      status,
      $push: { statusHistory: { status, timestamp: timestamp || new Date() } },
      updatedAt: new Date(),
    }, { new: true });

    // increment the right counter — receipt.js handles all 5 status types
    const incField = `stats.${status}`;
    await Campaign.findByIdAndUpdate(comm.campaignId, {
      $inc: { [incField]: 1 },
    });

    // if there are no 'sent' comms left, the whole campaign is finished
    if (status === 'delivered' || status === 'failed') {
      const pendingCount = await Communication.countDocuments({
        campaignId: comm.campaignId,
        status: 'sent',
      });

      if (pendingCount === 0) {
        await Campaign.findByIdAndUpdate(comm.campaignId, {
          status: 'completed',
        });
        console.log(`Campaign ${comm.campaignId} marked as completed`);
      }
    }

    res.json({ success: true, communicationId, status });
  } catch (err) {
    console.error('POST /api/receipt error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
