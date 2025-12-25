const mongoose = require('mongoose');

const EmailVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true }, // 6 haneli string
  expiresAt: { type: Date, required: true },
  isUsed: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('EmailVerification', EmailVerificationSchema);

