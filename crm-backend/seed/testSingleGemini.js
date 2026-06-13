import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { parseIntent } from '../services/geminiService.js';
import { getSegmentPreview } from '../services/segmentService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function runTest() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const prompt = "Target customers who bought fashion items worth over 3000 rupees";
  console.log(`\nMARKETER INTENT: "${prompt}"`);
  
  const filters = await parseIntent(prompt);
  console.log("PARSED FILTERS:", JSON.stringify(filters, null, 2));
  
  const preview = await getSegmentPreview(filters);
  console.log(`MATCHED COUNT: ${preview.count}`);
  console.log(`SAMPLE CUSTOMERS:`, preview.samples.map(c => `${c.name} (Spend: Rs ${c.totalSpend}, City: ${c.city})`));

  await mongoose.disconnect();
}

runTest().catch(console.error);
