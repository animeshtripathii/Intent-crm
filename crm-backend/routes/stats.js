import { Router } from 'express';
import mongoose from 'mongoose';
import Campaign from '../models/Campaign.js';
import Communication from '../models/Communication.js';
import { generateInsight } from '../services/geminiService.js';

const router = Router();

// ── GET /:id — Full stats for a campaign ─────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    // 1. Find campaign
    const campaign = await Campaign.findById(req.params.id).lean();
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // 2. Aggregate communication status breakdown
    const breakdown = await Communication.aggregate([
      { $match: { campaignId: new mongoose.Types.ObjectId(req.params.id) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // 3. Get 10 most recent communications with customer info
    const recentActivity = await Communication.find({ campaignId: req.params.id })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('customerId', 'name city')
      .lean();

    // 4. Generate AI insight if campaign is completed
    let insight = null;
    if (campaign.status === 'completed' && campaign.stats) {
      insight = await generateInsight(campaign.stats, campaign.name);
    }

    // 5. Return response
    res.json({
      campaign: {
        _id: campaign._id,
        name: campaign.name,
        status: campaign.status,
        stats: campaign.stats,
        audienceSize: campaign.audienceSize,
        createdAt: campaign.createdAt,
      },
      breakdown,
      recentActivity,
      ...(insight && { insight }),
    });
  } catch (err) {
    console.error('GET /api/stats/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
