const mongoose = require('mongoose');
const crypto = require('crypto');

const webhookSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    // Optional downstream URL events are forwarded to (delivery target).
    targetUrl: { type: String, trim: true, default: '' },
    // Secret token embedded in the public ingestion URL.
    token: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(16).toString('hex'),
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Webhook', webhookSchema);
