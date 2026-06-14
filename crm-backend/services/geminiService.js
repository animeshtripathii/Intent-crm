// all gemini calls go through here. rotates keys and models on quota errors.
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const getKeys = () => {
  if (process.env.GEMINI_API_KEYS) {
    return process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(Boolean);
  }
  const numbered = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
  ].filter(Boolean);
  if (numbered.length > 0) return numbered;
  if (process.env.GEMINI_API_KEY) return [process.env.GEMINI_API_KEY.trim()];
  return [];
};

const KEYS = getKeys();
console.log(`Loaded ${KEYS.length} Gemini API key(s)`);

const MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-3.0-flash',
];

const isQuotaError = (err) => {
  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('exhausted') ||
    msg.includes('limit exceeded')
  );
};

const isModelError = (err) => {
  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('404') ||
    msg.includes('not found') ||
    msg.includes('deprecated') ||
    msg.includes('not supported')
  );
};

// tries every key on every model before giving up
// nested loop: model outer, key inner
const withRetry = async (prompt) => {
  if (KEYS.length === 0) {
    throw new Error('No Gemini API keys found — set GEMINI_API_KEYS in env');
  }

  for (let m = 0; m < MODELS.length; m++) {
    const model = MODELS[m];

    for (let k = 0; k < KEYS.length; k++) {
      try {
        console.log(`[Gemini] Trying key ${k + 1}/${KEYS.length}, model: ${model}`);
        const client = new GoogleGenAI({ apiKey: KEYS[k] });
        const response = await client.models.generateContent({
          model,
          contents: prompt,
        });
        console.log(`[Gemini] Success with key ${k + 1}, model: ${model}`);
        return response.text;
      } catch (err) {
        console.warn(
          `[Gemini] key ${k + 1}/${KEYS.length} model ${model} failed: ${err.message?.slice(0, 80)}`
        );
        if (!isQuotaError(err) && !isModelError(err)) {
          throw err;
        }
        await new Promise(r => setTimeout(r, 300));
      }
    }

    console.log(`[Gemini] All ${KEYS.length} keys exhausted on ${model} — trying next model`);
  }

  throw new Error(`All ${KEYS.length} keys × ${MODELS.length} models exhausted`);
};

// gemini wraps json in markdown sometimes. strip it before parsing.
export const extractJSON = (rawText) => {
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`No JSON found in Gemini response: ${rawText}`);
  }

  return JSON.parse(match[0]);
};

// turn plain english into mongodb filter keys
const SYSTEM_PROMPT_PARSE = `You are a CRM data assistant. Convert natural language marketing goals into a JSON filter object. The customer collection has these fields: totalSpend (number, INR), totalOrders (number), lastOrderDate (ISO date string), city (string), tags (array of strings: vip, lapsed, new, repeat). Return ONLY valid JSON with no explanation. Supported filter keys: minSpend, maxSpend, minOrders, maxOrders, daysSinceLastOrder, city, tags, minOrderAmount.`;

export const parseIntent = async (naturalLanguageIntent, attempt = 1) => {
  try {
    const retryNote = attempt > 1
      ? '\n\nIMPORTANT: Return STRICTLY valid JSON only. No markdown. No explanation. Just the JSON object.'
      : '';

    const prompt = `${SYSTEM_PROMPT_PARSE}\n\nUser intent: ${naturalLanguageIntent}${retryNote}`;
    const text = await withRetry(prompt);

    console.log(`RAW GEMINI (attempt ${attempt}):`, text);
    const parsed = extractJSON(text);
    console.log('PARSED FILTERS:', parsed);
    return parsed;

  } catch (err) {
    console.error(`parseIntent attempt ${attempt} failed:`, err.message);

    if (attempt < 2) {
      console.log('Retrying parseIntent with stricter prompt...');
      return parseIntent(naturalLanguageIntent, attempt + 1);
    }

    // both attempts failed — match all customers rather than crash
    console.error('parseIntent gave up — returning empty filters');
    return {};
  }
};

// short personalized whatsapp message per customer
export const draftMessage = async (customer, campaignGoal) => {
  const firstName = customer.name.split(' ')[0];
  const lastOrder = customer.lastOrderDate
    ? new Date(customer.lastOrderDate).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : 'N/A';

  const prompt = `You are a marketing copywriter for a D2C brand. Write a short personalized WhatsApp message under 160 characters. Tone: warm, friendly, direct. Always include the customer's first name.
Customer: ${firstName}
Last order: ${lastOrder}
Total spend: Rs ${customer.totalSpend}
Campaign goal: ${campaignGoal}
Return ONLY the message text, nothing else.`;

  try {
    const text = await withRetry(prompt);
    return text.trim();
  } catch (err) {
    console.error('draftMessage error:', err.message);
    return `Hey ${firstName}! We have something special for you — ${campaignGoal}`;
  }
};

// 2-3 sentence summary shown on the analytics page after campaign completes
export const generateInsight = async (stats, campaignName) => {
  const prompt = `You are a marketing analyst. Given campaign stats, write 2-3 insight sentences a marketer would find actionable. Be specific.

Campaign: ${campaignName}. Sent: ${stats.sent}. Delivered: ${stats.delivered}. Opened: ${stats.opened}. Read: ${stats.read || 0}. Clicked: ${stats.clicked}. Failed: ${stats.failed}.`;

  try {
    const text = await withRetry(prompt);
    return text.trim();
  } catch (err) {
    console.error('generateInsight error:', err.message);
    return 'Insight unavailable.';
  }
};
