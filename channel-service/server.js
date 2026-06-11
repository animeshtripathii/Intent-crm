import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import simulateRoutes from './routes/simulate.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'channel-service' });
});

// Routes
app.use('/simulate', simulateRoutes);

app.listen(PORT, () => {
  console.log(`Channel Service running on port ${PORT}`);
});
