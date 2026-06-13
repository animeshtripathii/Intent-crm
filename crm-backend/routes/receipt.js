import { Router } from 'express';
import mongoose from 'mongoose';
import Communication from '../models/Communication.js';
import Campaign from '../models/Campaign.js';

const router = Router();

// ── POST / — Ingest delivery callbacks from channel service ──────────────
router.post('/', async (req, res) => {
  try {
    const { communicationId, status, timestamp } = req.body;

    // 1. Validate
    if (!communicationId || !status) {
      return res.status(400).json({ error: 'communicationId and status are required' });
    }

    // 2. Find communication
    const comm = await Communication.findById(communicationId);
    if (!comm) {
      return res.status(404).json({ error: 'Communication not found' });
    }

    // 3. Update communication
    await Communication.findByIdAndUpdate(communicationId, {
      status,
      $push: { statusHistory: { status, timestamp: timestamp || new Date() } },
      updatedAt: new Date(),
    }, { new: true });

    console.log(`Receipt: commId ${communicationId} → ${status}`);

    // 4. Update parent campaign stats
    const incField = `stats.${status}`;
    await Campaign.findByIdAndUpdate(comm.campaignId, {
      $inc: { [incField]: 1 },
    });

    // 5. Check if campaign is completed (all comms moved past 'sent')
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

    // 6. Respond
    res.json({ success: true, communicationId, status });
  } catch (err) {
    console.error('POST /api/receipt error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
