const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * POST a delivery status callback to the CRM backend with exponential backoff.
 * Retries up to 3 times on 5xx responses (attempt 1 = 2s, attempt 2 = 4s).
 */
async function callbackToCRM(url, communicationId, status, attempt = 1) {
  console.log(`Callback attempt ${attempt} for commId ${communicationId}: status ${status}`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

/**
 * Simulate an async delivery pipeline:
 *   sent → delivered (88%) or failed (12%)
 *         → opened (45%)
 *              → read (70% of opened)
 *                   → clicked (35% of read)
 *
 * Each stage waits a random delay, then calls back to the CRM receipt endpoint.
 */
export async function simulateDelivery(communicationId, crmReceiptUrl) {
  const rand = () => Math.random();
  const randBetween = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

  // ── Stage 1: delivered or failed (2–5 s) ───────────────────────────
  await sleep(randBetween(2000, 5000));

  if (rand() < 0.12) {
    await callbackToCRM(crmReceiptUrl, communicationId, 'failed');
    return; // stop
  }

  await callbackToCRM(crmReceiptUrl, communicationId, 'delivered');

  // ── Stage 2: opened (5–15 s) ──────────────────────────────────────
  await sleep(randBetween(5000, 15000));

  if (rand() >= 0.45) {
    return; // not opened — stop
  }

  await callbackToCRM(crmReceiptUrl, communicationId, 'opened');

  // ── Stage 3: read (3–8 s after opened) ───────────────────────────
  await sleep(randBetween(3000, 8000));

  if (rand() >= 0.70) {
    return; // not read — stop (skip clicked too)
  }

  await callbackToCRM(crmReceiptUrl, communicationId, 'read');

  // ── Stage 4: clicked (15–30 s after read) ────────────────────────
  await sleep(randBetween(15000, 30000));

  if (rand() >= 0.35) {
    return; // not clicked — stop
  }

  await callbackToCRM(crmReceiptUrl, communicationId, 'clicked');
}
