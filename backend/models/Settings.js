const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
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
  symbols: [{
    type: String
  }],
  strategy: {
    type: String,
    enum: ['CANDLE_MOMENTUM', 'PRICE_ACTION', 'TREND_FOLLOWING', 'MARKET_STRUCTURE', 'ICT', 'HYBRID'],
    default: 'PRICE_ACTION'
  },
  timeframe: {
    type: String,
    enum: ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'],
    default: 'M15'
  },
  lotType: {
    type: String,
    enum: ['FIXED', 'AUTO'],
    default: 'AUTO'
  },
  fixedLot: {
    type: Number,
    default: 0.01
  },
  riskPercentage: {
    type: Number,
    default: 1,
    min: 0.1,
    max: 10
  },
  maxDailyLoss: {
    type: Number,
    default: 5
  },
  maxDrawdown: {
    type: Number,
    default: 10
  },
  maxOpenTrades: {
    type: Number,
    default: 3
  },
  maxTradesPerDay: {
    type: Number,
    default: 10
  },
  maxConsecutiveLosses: {
    type: Number,
    default: 3
  },
  maxSpread: {
    type: Number,
    default: 30
  },
  useStopLoss: {
    type: Boolean,
    default: true
  },
  useTakeProfit: {
    type: Boolean,
    default: true
  },
  useBreakEven: {
    type: Boolean,
    default: false
  },
  breakEvenPips: {
    type: Number,
    default: 10
  },
  useTrailingStop: {
    type: Boolean,
    default: false
  },
  trailingStopPips: {
    type: Number,
    default: 15
  },
  usePartialTP: {
    type: Boolean,
    default: false
  },
  partialTPPercent: {
    type: Number,
    default: 50
  },
  partialTPPips: {
    type: Number,
    default: 20
  },
  tradingSessions: {
    london: { type: Boolean, default: true },
    newYork: { type: Boolean, default: true },
    tokyo: { type: Boolean, default: false },
    sydney: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: false
  },
  magicNumber: {
    type: Number,
    default: () => Math.floor(100000 + Math.random() * 900000)
  }
});

module.exports = mongoose.model('Settings', settingsSchema);