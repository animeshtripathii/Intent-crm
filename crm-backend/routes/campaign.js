// main campaign lifecycle endpoints. handles intent parsing, previews, and final dispatch.
import { Router } from 'express';
import Campaign from '../models/Campaign.js';
import { parseIntent, draftMessage } from '../services/geminiService.js';
import { getSegmentPreview, getMatchedCustomers } from '../services/segmentService.js';
import { dispatchCampaign } from '../services/dispatchService.js';

const router = Router();

const chunk = (arr, size) =>
  Array.from(
    { length: Math.ceil(arr.length / size) },
    (_, i) => arr.slice(i * size, i * size + size),
  );

router.post('/', async (req, res) => {
  try {
    const { naturalLanguageIntent, channel } = req.body;

    if (!naturalLanguageIntent) {
      return res.status(400).json({ error: 'naturalLanguageIntent is required' });
    }

    const filters = await parseIntent(naturalLanguageIntent);
    const isEmptyFilters = Object.keys(filters).length === 0;

    const { count, samples } = await getSegmentPreview(filters);

    // hit gemini 3 times in parallel for the preview samples
    const sampleMessages = await Promise.all(
      samples.map((customer) => draftMessage(customer, naturalLanguageIntent)),
    );

    const campaign = await Campaign.create({
      name: naturalLanguageIntent.slice(0, 80),
      naturalLanguageIntent,
      segmentFilters: filters,
      channel: channel || 'whatsapp',
      messageTemplate: sampleMessages[0] || '',
      audienceSize: count,
      status: 'draft',
    });

    const response = {
      campaignId: campaign._id,
      filters,
      segmentCount: count,
      sampleCustomers: samples,
      sampleMessages,
    };

    if (isEmptyFilters) {
      response.warning = 'AI could not extract specific filters — targeting ALL customers';
    }

    res.json(response);
  } catch (err) {
    console.error('POST /api/campaign error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/send', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    if (campaign.status !== 'draft') {
      return res.status(400).json({ error: 'Campaign already sent' });
    }

    // the user clicked approve. grab everyone matching the filters, draft their texts, and fire away.
    const customers = await getMatchedCustomers(campaign.segmentFilters);

    const batches = chunk(customers, 10);
    for (const batch of batches) {
      const messages = await Promise.all(
        batch.map((c) => draftMessage(c, campaign.naturalLanguageIntent)),
      );
      batch.forEach((c, i) => {
        c.personalizedMessage = messages[i];
      });
    }

    await dispatchCampaign(customers, campaign);

    res.json({ success: true, dispatched: customers.length });
  } catch (err) {
    console.error('POST /api/campaign/:id/send error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (_req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
