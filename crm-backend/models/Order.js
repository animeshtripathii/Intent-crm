import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  amount:     { type: Number, required: true },
  category:   { type: String, required: true, enum: ['coffee', 'fashion', 'beauty', 'electronics', 'home', 'fitness'] },
  items:      [{ type: String }],
  createdAt:  { type: Date, default: Date.now },
});

export default mongoose.model('Order', orderSchema);
