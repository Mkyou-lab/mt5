const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mt5AccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MT5Account',
    required: true
  },
  ticket: {
    type: Number,
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  volume: {
    type: Number,
    required: true
  },
  openPrice: {
    type: Number,
    required: true
  },
  closePrice: {
    type: Number
  },
  stopLoss: {
    type: Number
  },
  takeProfit: {
    type: Number
  },
  profit: {
    type: Number,
    default: 0
  },
  commission: {
    type: Number,
    default: 0
  },
  swap: {
    type: Number,
    default: 0
  },
  openTime: {
    type: Date,
    required: true
  },
  closeTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'PENDING'],
    default: 'OPEN'
  },
  strategy: {
    type: String
  },
  reason: {
    type: String
  },
  magicNumber: {
    type: Number
  },
  comment: {
    type: String
  }
});

tradeSchema.index({ userId: 1, mt5AccountId: 1 });
tradeSchema.index({ ticket: 1 });
tradeSchema.index({ openTime: -1 });

module.exports = mongoose.model('Trade', tradeSchema);