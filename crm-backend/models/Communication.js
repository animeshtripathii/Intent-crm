import mongoose from 'mongoose';

const communicationSchema = new mongoose.Schema({
  campaignId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
  customerId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  personalizedMessage: { type: String },
  channel:             { type: String, enum: ['whatsapp', 'sms', 'email', 'rcs'] },
  status:              { type: String, enum: ['sent', 'delivered', 'failed', 'opened', 'read', 'clicked'], default: 'sent' },
  statusHistory: [{
    status:    { type: String },
    timestamp: { type: Date, default: Date.now },
  }],
  sentAt:    { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Communication', communicationSchema);
