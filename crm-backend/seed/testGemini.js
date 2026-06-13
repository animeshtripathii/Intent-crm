import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { parseIntent } from '../services/geminiService.js';
import { getSegmentPreview } from '../services/segmentService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const TEST_PROMPTS = [
  "Customers who spent over Rs 5000 but haven't bought in 60 days",
  "Target customers who bought fashion items worth over 3000 rupees",
  "Reach VIP customers in Delhi with a loyalty reward",
  "Send to all customers with more than 5 orders",
  "Win back customers who haven't bought coffee in the last 30 days"
];

async function runTest() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is undefined!");
    process.exit(1);
  }
  
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  for (const prompt of TEST_PROMPTS) {
    console.log(`\n=============================================`);
    console.log(`MARKETER INTENT: "${prompt}"`);
    console.log(`=============================================`);
    
    const filters = await parseIntent(prompt);
    console.log("PARSED FILTERS:", JSON.stringify(filters, null, 2));
    
    const preview = await getSegmentPreview(filters);
    console.log(`MATCHED COUNT: ${preview.count}`);
    console.log(`SAMPLE CUSTOMERS:`, preview.samples.map(c => `${c.name} (Spend: Rs ${c.totalSpend}, City: ${c.city}, Tags: ${c.tags.join(', ') || 'none'})`));
  }

  await mongoose.disconnect();
  console.log("\nDisconnected from MongoDB");
}

runTest().catch(console.error);
