import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  phone:          { type: String, required: true },
  email:          { type: String, required: true },
  city:           { type: String, required: true },
  totalOrders:    { type: Number, default: 0 },
  totalSpend:     { type: Number, default: 0 },
  lastOrderDate:  { type: Date },
  tags:           [{ type: String, enum: ['vip', 'lapsed', 'new', 'repeat'] }],
  createdAt:      { type: Date, default: Date.now },
});

export default mongoose.model('Customer', customerSchema);
