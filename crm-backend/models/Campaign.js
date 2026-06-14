import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  name:                  { type: String, required: true },
  naturalLanguageIntent: { type: String, required: true },
  segmentFilters:        { type: mongoose.Schema.Types.Mixed },
  channel:               { type: String, enum: ['whatsapp', 'sms', 'email', 'rcs'], default: 'whatsapp' },
  messageTemplate:       { type: String },
  audienceSize:          { type: Number, default: 0 },
  status:                { type: String, enum: ['draft', 'sending', 'sent', 'completed'], default: 'draft' },
  stats: {
    sent:      { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    failed:    { type: Number, default: 0 },
    opened:    { type: Number, default: 0 },
    read:      { type: Number, default: 0 },
    clicked:   { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Campaign', campaignSchema);
