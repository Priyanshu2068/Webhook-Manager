const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    statusCode: Number,
    success: Boolean,
    error: String,
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    webhook: { type: mongoose.Schema.Types.ObjectId, ref: 'Webhook', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    headers: { type: mongoose.Schema.Types.Mixed, default: {} },
    // received: stored, no target configured | delivered | failed
    status: { type: String, enum: ['received', 'delivered', 'failed'], default: 'received' },
    attempts: { type: [attemptSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
