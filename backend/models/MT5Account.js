const mongoose = require('mongoose');

const mt5AccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountName: {
    type: String,
    required: true
  },
  broker: {
    type: String,
    required: true
  },
  server: {
    type: String,
    required: true
  },
  login: {
    type: String,
    required: true
  },
  password: {
    iv: String,
    encryptedData: String,
    authTag: String
  },
  accountType: {
    type: String,
    enum: ['DEMO', 'LIVE'],
    default: 'DEMO'
  },
  isActive: {
    type: Boolean,
    default: false
  },
  vpsStatus: {
    type: String,
    enum: ['DISCONNECTED', 'CONNECTED', 'ERROR'],
    default: 'DISCONNECTED'
  },
  lastSync: {
    type: Date
  },
  balance: {
    type: Number,
    default: 0
  },
  equity: {
    type: Number,
    default: 0
  },
  freeMargin: {
    type: Number,
    default: 0
  },
  marginLevel: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MT5Account', mt5AccountSchema);