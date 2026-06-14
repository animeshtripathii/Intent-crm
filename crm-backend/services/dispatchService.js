import Communication from '../models/Communication.js';
import Campaign from '../models/Campaign.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chunk = (arr, size) =>
  Array.from(
    { length: Math.ceil(arr.length / size) },
    (_, i) => arr.slice(i * size, i * size + size),
  );

export const dispatchCampaign = async (customers, campaign) => {
  const channelServiceUrl = process.env.CHANNEL_SERVICE_URL;

  // Step 1: Create all Communication documents upfront (status: 'sent')
  const communications = await Communication.insertMany(
    customers.map((customer) => ({
      campaignId: campaign._id,
      customerId: customer._id,
      personalizedMessage: customer.personalizedMessage,
      channel: campaign.channel,
      status: 'sent',
      statusHistory: [{ status: 'sent', timestamp: new Date() }],
      sentAt: new Date(),
    })),
  );

  // Step 2: Update campaign status to 'sending' and set audienceSize
  await Campaign.findByIdAndUpdate(campaign._id, {
    status: 'sending',
    audienceSize: customers.length,
    'stats.sent': customers.length,
  });

  // Step 3: Batch dispatch — 10 concurrent at a time
  const batches = chunk(communications, 10);

  for (const batch of batches) {
    await Promise.all(
      batch.map(async (comm) => {
        const customer = customers.find(
          (c) => c._id.toString() === comm.customerId.toString(),
        );
        try {
          await fetch(`${channelServiceUrl}/simulate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.CHANNEL_SERVICE_SECRET,
            },
            body: JSON.stringify({
              communicationId: comm._id.toString(),
              recipientPhone: customer.phone,
              message: comm.personalizedMessage,
              channel: comm.channel,
              crmReceiptUrl: `${process.env.CRM_PUBLIC_URL || 'http://localhost:5000'}/api/receipt`,
            }),
          });
        } catch (err) {
          console.error(`Dispatch failed for comm ${comm._id}:`, err.message);
        }
      }),
    );
    await sleep(100); // small pause between batches
  }

  console.log(`Dispatched ${communications.length} messages in ${batches.length} batches`);
  return communications;
};
