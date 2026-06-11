import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './db.js';
import campaignRoutes from './routes/campaign.js';
import receiptRoutes from './routes/receipt.js';
import statsRoutes from './routes/stats.js';
import customersRoutes from './routes/customers.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'crm-backend', timestamp: new Date() });
});

// Routes
app.use('/api/campaign', campaignRoutes);
app.use('/api/receipt', receiptRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/customers', customersRoutes);

// Start
const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`CRM Backend running on port ${PORT}`);
  });
};

start();
