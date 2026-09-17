const express = require('express');
const router = express.Router();
const MT5Account = require('../models/MT5Account');
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const Encryption = require('../config/encryption');
const logger = require('../utils/logger');

// Get all MT5 accounts for user
router.get('/accounts', auth, async (req, res) => {
  try {
    const accounts = await MT5Account.find({ userId: req.userId }).select('-password');
    res.json(accounts);
  } catch (error) {
    logger.error('Get MT5 accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Add MT5 account
router.post('/accounts', auth, async (req, res) => {
  try {
    const { accountName, broker, server, login, password, accountType } = req.body;

    // Validation
    if (!accountName || !broker || !server || !login || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Encrypt password
    const encryptedPassword = Encryption.encrypt(password);

    // Create account
    const mt5Account = new MT5Account({
      userId: req.userId,
      accountName,
      broker,
      server,
      login,
      password: encryptedPassword,
      accountType: accountType || 'DEMO'
    });

    await mt5Account.save();

    // Create default settings
    const settings = new Settings({
      userId: req.userId,
      mt5AccountId: mt5Account._id
    });

    await settings.save();

    logger.info(`MT5 account added: ${accountName} for user ${req.userId}`);

    res.status(201).json({
      message: 'MT5 account added successfully',
      account: {
        id: mt5Account._id,
        accountName: mt5Account.accountName,
        broker: mt5Account.broker,
        server: mt5Account.server,
        login: mt5Account.login,
        accountType: mt5Account.accountType
      }
    });
  } catch (error) {
    logger.error('Add MT5 account error:', error);
    res.status(500).json({ error: 'Failed to add MT5 account' });
  }
});

// Update MT5 account
router.put('/accounts/:id', auth, async (req, res) => {
  try {
    const { accountName, broker, server, login, password, accountType } = req.body;

    const account = await MT5Account.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Update fields
    if (accountName) account.accountName = accountName;
    if (broker) account.broker = broker;
    if (server) account.server = server;
    if (login) account.login = login;
    if (accountType) account.accountType = accountType;

    if (password) {
      account.password = Encryption.encrypt(password);
    }

    await account.save();

    res.json({
      message: 'Account updated successfully',
      account: {
        id: account._id,
        accountName: account.accountName,
        broker: account.broker,
        server: account.server,
        login: account.login,
        accountType: account.accountType
      }
    });
  } catch (error) {
    logger.error('Update MT5 account error:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// Delete MT5 account
router.delete('/accounts/:id', auth, async (req, res) => {
  try {
    const account = await MT5Account.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Delete associated settings
    await Settings.deleteMany({ mt5AccountId: account._id });

    // Delete account
    await MT5Account.deleteOne({ _id: account._id });

    logger.info(`MT5 account deleted: ${account.accountName}`);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    logger.error('Delete MT5 account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Get MT5 account credentials (for VPS engine)
router.post('/accounts/:id/credentials', auth, async (req, res) => {
  try {
    const account = await MT5Account.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Decrypt password
    const decryptedPassword = Encryption.decrypt(account.password);

    res.json({
      broker: account.broker,
      server: account.server,
      login: account.login,
      password: decryptedPassword
    });
  } catch (error) {
    logger.error('Get credentials error:', error);
    res.status(500).json({ error: 'Failed to get credentials' });
  }
});

// Update account status (from VPS)
router.post('/accounts/:id/status', auth, async (req, res) => {
  try {
    const { vpsStatus, balance, equity, freeMargin, marginLevel } = req.body;

    const account = await MT5Account.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    account.vpsStatus = vpsStatus;
    account.balance = balance;
    account.equity = equity;
    account.freeMargin = freeMargin;
    account.marginLevel = marginLevel;
    account.lastSync = new Date();

    await account.save();

    // Broadcast to connected clients
    if (global.broadcastToUser) {
      global.broadcastToUser(req.userId.toString(), {
        type: 'account_update',
        data: {
          accountId: account._id,
          vpsStatus,
          balance,
          equity,
          freeMargin,
          marginLevel
        }
      });
    }

    res.json({ message: 'Status updated' });
  } catch (error) {
    logger.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

module.exports = router;