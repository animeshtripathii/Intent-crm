// realistic async simulation of a messaging pipeline with drop-off funnels
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// send webhook back to the CRM. includes exponential backoff just in case the CRM is swamped.
async function callbackToCRM(url, communicationId, status, attempt = 1) {
  console.log(`Callback attempt ${attempt} for commId ${communicationId}: status ${status}`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CHANNEL_SERVICE_SECRET,
      },
      body: JSON.stringify({ communicationId, status, timestamp: new Date() }),
    });

    if (res.status >= 500 && attempt < 3) {
      const wait = 2000 * attempt;
      console.log(`  ↳ 5xx response, retrying in ${wait}ms…`);
      await sleep(wait);
      return callbackToCRM(url, communicationId, status, attempt + 1);
    }

    if (!res.ok) {
      console.error(`  ↳ Callback failed with HTTP ${res.status}`);
    }
  } catch (err) {
    if (attempt < 3) {
      const wait = 2000 * attempt;
      console.log(`  ↳ Network error, retrying in ${wait}ms… (${err.message})`);
      await sleep(wait);
      return callbackToCRM(url, communicationId, status, attempt + 1);
    }
    console.error(`  ↳ Callback permanently failed: ${err.message}`);
  }
}

export async function simulateDelivery(communicationId, crmReceiptUrl) {
  const rand = () => Math.random();
  const randBetween = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

  await sleep(randBetween(2000, 5000));

  // 88% delivered, 12% fail — realistic whatsapp delivery rates
  if (rand() < 0.12) {
    await callbackToCRM(crmReceiptUrl, communicationId, 'failed');
    return;
  }

  await callbackToCRM(crmReceiptUrl, communicationId, 'delivered');

  await sleep(randBetween(5000, 15000));

  // roughly half of people open it
  if (rand() >= 0.45) {
    return;
  }

  await callbackToCRM(crmReceiptUrl, communicationId, 'opened');

  await sleep(randBetween(3000, 8000));

  // most who open it actually read it
  if (rand() >= 0.70) {
    return;
  }

  await callbackToCRM(crmReceiptUrl, communicationId, 'read');

  await sleep(randBetween(15000, 30000));

  // decent click-through rate for those who read
  if (rand() >= 0.35) {
    return;
  }

  await callbackToCRM(crmReceiptUrl, communicationId, 'clicked');
}
