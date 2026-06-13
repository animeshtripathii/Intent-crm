import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

// ── Setup ────────────────────────────────────────────────────────────────
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ── Safe JSON Extractor ──────────────────────────────────────────────────
export const extractJSON = (rawText) => {
  // Strip markdown code fences
  let cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Find the first { ... } block
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`No JSON object found in Gemini response: ${rawText}`);
  }

  return JSON.parse(match[0]);
};

// ── Parse Natural Language Intent → Filter Object ────────────────────────
const SYSTEM_PROMPT_PARSE = `You are a CRM data assistant. Convert natural language marketing goals into a JSON filter object. The customer collection has these fields: totalSpend (number, INR), totalOrders (number), lastOrderDate (ISO date string), city (string), tags (array of strings: vip, lapsed, new, repeat). Return ONLY valid JSON with no explanation. Supported filter keys: minSpend, maxSpend, minOrders, maxOrders, daysSinceLastOrder, city, tags, minOrderAmount.`;

export const parseIntent = async (naturalLanguageIntent) => {
  try {
    const prompt = `${SYSTEM_PROMPT_PARSE}\n\nUser intent: ${naturalLanguageIntent}`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const text = response.text;
    console.log('RAW GEMINI:', text);
    const parsed = extractJSON(text);
    console.log('PARSED FILTERS:', parsed);
    return parsed;
  } catch (err) {
    console.error('parseIntent error:', err.message);
    return {};
  }
};

// ── Draft Personalised Message ───────────────────────────────────────────
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
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    return response.text.trim();
  } catch (err) {
    console.error('draftMessage error:', err.message);
    return `Hey ${firstName}! We have something special for you. Check it out — ${campaignGoal}`;
  }
};

// ── Generate Campaign Insight ────────────────────────────────────────────
export const generateInsight = async (stats, campaignName) => {
  const systemPrompt = `You are a marketing analyst. Given campaign stats, write 2-3 insight sentences a marketer would find actionable. Be specific.`;

  const userPrompt = `Campaign: ${campaignName}. Sent: ${stats.sent}. Delivered: ${stats.delivered}. Opened: ${stats.opened}. Clicked: ${stats.clicked}. Failed: ${stats.failed}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `${systemPrompt}\n\n${userPrompt}`,
    });
    return response.text.trim();
  } catch (err) {
    console.error('generateInsight error:', err.message);
    return 'Insight unavailable.';
  }
};