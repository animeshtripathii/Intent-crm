// all gemini calls go through here. extractJSON handles the markdown-wrapping quirk that gemini-2.0-flash has sometimes.
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

// rotates across multiple keys so we don't blow the free tier quota
const getKeys = () => {
  // comma-separated list takes priority
  if (process.env.GEMINI_API_KEYS) {
    return process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(Boolean);
  }
  // numbered keys fallback
  const numbered = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
  ].filter(Boolean);
  if (numbered.length > 0) return numbered;
  // single key last resort
  if (process.env.GEMINI_API_KEY) return [process.env.GEMINI_API_KEY.trim()];
  return [];
};

const keys = getKeys();
console.log(`Loaded ${keys.length} Gemini API key(s)`);
let currentKeyIndex = 0;

const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-8b',
];
let currentModelIndex = 0;

const getCurrentModel = () => MODELS[currentModelIndex];

const rotateModel = () => {
  currentModelIndex = (currentModelIndex + 1) % MODELS.length;
  console.log(`[Gemini] Switched to model: ${MODELS[currentModelIndex]}`);
};

const getClient = () => {
  if (keys.length === 0) throw new Error('No Gemini API keys configured. Set GEMINI_API_KEYS.');
  return new GoogleGenAI({ apiKey: keys[currentKeyIndex] });
};

const switchKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  console.log(`[Gemini API] Switched to key index ${currentKeyIndex}`);
};

const withRetry = async (prompt) => {
  const totalAttempts = keys.length * MODELS.length;
  let attempts = 0;

  while (attempts < totalAttempts) {
    try {
      const client = getClient();
      const model = getCurrentModel();
      console.log(`[Gemini] Attempting with key ${currentKeyIndex + 1}, model: ${model}`);
      
      const response = await client.models.generateContent({
        model,
        contents: prompt,
      });
      return response.text;
    } catch (err) {
      const isQuota = err.message?.includes('429') ||
                      err.message?.includes('quota') ||
                      err.message?.includes('RESOURCE_EXHAUSTED') ||
                      err.message?.includes('rate') ||
                      err.message?.includes('limit');

      const isModelGone = err.message?.includes('404') ||
                          err.message?.includes('not found') ||
                          err.message?.includes('deprecated');

      if (isQuota || isModelGone) {
        console.warn(`[Gemini] Failed (key ${currentKeyIndex + 1}, model: ${getCurrentModel()}): ${err.message.slice(0, 80)}`);
        // try next key first
        switchKey();
        // if we've gone through all keys, rotate model too
        if (currentKeyIndex === 0) {
          rotateModel();
        }
        attempts++;
        await new Promise(r => setTimeout(r, 500));
      } else {
        // non-quota error — throw immediately
        throw err;
      }
    }
  }
  throw new Error('All Gemini keys and models exhausted');
};

// gemini wraps json in markdown sometimes. strip it before parsing.
export const extractJSON = (rawText) => {
  let cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`No JSON object found in Gemini response: ${rawText}`);
  }

  return JSON.parse(match[0]);
};

// turn plain english into mongodb filter keys
const SYSTEM_PROMPT_PARSE = `You are a CRM data assistant. Convert natural language marketing goals into a JSON filter object. The customer collection has these fields: totalSpend (number, INR), totalOrders (number), lastOrderDate (ISO date string), city (string), tags (array of strings: vip, lapsed, new, repeat). Return ONLY valid JSON with no explanation. Supported filter keys: minSpend, maxSpend, minOrders, maxOrders, daysSinceLastOrder, city, tags, minOrderAmount.`;

export const parseIntent = async (naturalLanguageIntent, attempt = 1) => {
  try {
    const retryNote = attempt > 1
      ? '\n\nIMPORTANT: Your previous response could not be parsed as JSON. Return STRICTLY valid JSON only. No markdown. No explanation. Just the JSON object.'
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

    // gemini gave garbage twice in a row, fallback to empty filters so the app doesn't crash
    console.error('parseIntent failed after 2 attempts — returning empty filters');
    return {};
  }
};

// drafts short, personalized whatsapp messages per customer based on campaign intent
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
    return `Hey ${firstName}! We have something special for you. Check it out — ${campaignGoal}`;
  }
};

// creates a 2-3 sentence summary for the analytics dashboard
export const generateInsight = async (stats, campaignName) => {
  const systemPrompt = `You are a marketing analyst. Given campaign stats, write 2-3 insight sentences a marketer would find actionable. Be specific.`;

  const userPrompt = `Campaign: ${campaignName}. Sent: ${stats.sent}. Delivered: ${stats.delivered}. Opened: ${stats.opened}. Clicked: ${stats.clicked}. Failed: ${stats.failed}.`;

  try {
    const text = await withRetry(`${systemPrompt}\n\n${userPrompt}`);
    return text.trim();
  } catch (err) {
    console.error('generateInsight error:', err.message);
    return 'Insight unavailable.';
  }
};
