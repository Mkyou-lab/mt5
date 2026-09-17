const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const Trade = require('../models/Trade');
const MT5Account = require('../models/MT5Account');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const { sendNotification } = require('../services/notificationService');

// Get settings for MT5 account
router.get('/settings/:accountId', auth, async (req, res) => {
  try {
    const settings = await Settings.findOne({
      userId: req.userId,
      mt5AccountId: req.params.accountId
    });

    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    res.json(settings);
  } catch (error) {
    logger.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
router.put('/settings/:accountId', auth, async (req, res) => {
  try {
    const settings = await Settings.findOne({
      userId: req.userId,
      mt5AccountId: req.params.accountId
    });

    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    // Update allowed fields
    const allowedUpdates = [
      'symbols', 'strategy', 'timeframe', 'lotType', 'fixedLot',
      'riskPercentage', 'maxDailyLoss', 'maxDrawdown', 'maxOpenTrades',
      'maxTradesPerDay', 'maxConsecutiveLosses', 'maxSpread',
      'useStopLoss', 'useTakeProfit', 'useBreakEven', 'breakEvenPips',
      'useTrailingStop', 'trailingStopPips', 'usePartialTP',
      'partialTPPercent', 'partialTPPips', 'tradingSessions'
    ];

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        settings[key] = req.body[key];
      }
    });

    await settings.save();

    logger.info(`Settings updated for account ${req.params.accountId}`);

    res.json({
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Start trading
router.post('/start/:accountId', auth, async (req, res) => {
  try {
    const account = await MT5Account.findOne({
      _id: req.params.accountId,
      userId: req.userId
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const settings = await Settings.findOne({
      userId: req.userId,
      mt5AccountId: account._id
    });

    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    // Validation
    if (!settings.symbols || settings.symbols.length === 0) {
      return res.status(400).json({ error: 'Please select at least one symbol' });
    }

    if (account.accountType === 'LIVE') {
      // Extra confirmation for live trading
      const { confirmed } = req.body;
      if (!confirmed) {
        return res.status(400).json({ 
          requiresConfirmation: true,
          message: 'MK PRO IS ABOUT TO TRADE REAL MONEY. Please confirm.'
        });
      }
    }

    settings.isActive = true;
    await settings.save();

    account.isActive = true;
    await account.save();

    logger.info(`Trading started for account ${account.accountName}`);

    // Send notification
    await sendNotification(req.userId, {
      title: 'MK PRO Started',
      body: `Trading started on ${account.accountName}`,
      data: { accountId: account._id }
    });

    // Broadcast to VPS
    if (global.broadcastToUser) {
      global.broadcastToUser(req.userId.toString(), {
        type: 'trading_start',
        accountId: account._id
      });
    }

    res.json({ message: 'Trading started successfully' });
  } catch (error) {
    logger.error('Start trading error:', error);
    res.status(500).json({ error: 'Failed to start trading' });
  }
});

// Stop trading
router.post('/stop/:accountId', auth, async (req, res) => {
  try {
    const account = await MT5Account.findOne({
      _id: req.params.accountId,
      userId: req.userId
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const settings = await Settings.findOne({
      userId: req.userId,
      mt5AccountId: account._id
    });

    if (settings) {
      settings.isActive = false;
      await settings.save();
    }

    account.isActive = false;
    await account.save();

    logger.info(`Trading stopped for account ${account.accountName}`);

    // Send notification
    await sendNotification(req.userId, {
      title: 'MK PRO Stopped',
      body: `Trading stopped on ${account.accountName}`,
      data: { accountId: account._id }
    });

    // Broadcast to VPS
    if (global.broadcastToUser) {
      global.broadcastToUser(req.userId.toString(), {
        type: 'trading_stop',
        accountId: account._id
      });
    }

    res.json({ message: 'Trading stopped successfully' });
  } catch (error) {
    logger.error('Stop trading error:', error);
    res.status(500).json({ error: 'Failed to stop trading' });
  }
});

// Close all positions
router.post('/close-all/:accountId', auth, async (req, res) => {
  try {
    const account = await MT5Account.findOne({
      _id: req.params.accountId,
      userId: req.userId
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    logger.info(`Close all positions requested for account ${account.accountName}`);

    // Broadcast to VPS
    if (global.broadcastToUser) {
      global.broadcastToUser(req.userId.toString(), {
        type: 'close_all_positions',
        accountId: account._id
      });
    }

    res.json({ message: 'Close all command sent' });
  } catch (error) {
    logger.error('Close all error:', error);
    res.status(500).json({ error: 'Failed to close positions' });
  }
});

// Get open trades
router.get('/trades/open/:accountId', auth, async (req, res) => {
  try {
    const trades = await Trade.find({
      userId: req.userId,
      mt5AccountId: req.params.accountId,
      status: 'OPEN'
    }).sort({ openTime: -1 });

    res.json(trades);
  } catch (error) {
    logger.error('Get open trades error:', error);
    res.status(500).json({ error: 'Failed to fetch open trades' });
  }
});

// Get trade history
router.get('/trades/history/:accountId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, startDate, endDate } = req.query;

    const query = {
      userId: req.userId,
      mt5AccountId: req.params.accountId,
      status: 'CLOSED'
    };

    if (startDate || endDate) {
      query.closeTime = {};
      if (startDate) query.closeTime.$gte = new Date(startDate);
      if (endDate) query.closeTime.$lte = new Date(endDate);
    }

    const trades = await Trade.find(query)
      .sort({ closeTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Trade.countDocuments(query);

    res.json({
      trades,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    logger.error('Get trade history error:', error);
    res.status(500).json({ error: 'Failed to fetch trade history' });
  }
});

// Record new trade (from VPS)
router.post('/trades', auth, async (req, res) => {
  try {
    const {
      mt5AccountId,
      ticket,
      symbol,
      type,
      volume,
      openPrice,
      stopLoss,
      takeProfit,
      openTime,
      strategy,
      magicNumber,
      comment
    } = req.body;

    const trade = new Trade({
      userId: req.userId,
      mt5AccountId,
      ticket,
      symbol,
      type,
      volume,
      openPrice,
      stopLoss,
      takeProfit,
      openTime,
      strategy,
      magicNumber,
      comment,
      status: 'OPEN'
    });

    await trade.save();

    logger.info(`Trade opened: ${symbol} ${type} ${volume} lots`);

    // Send notification
    await sendNotification(req.userId, {
      title: 'Trade Opened',
      body: `${symbol} ${type} opened\nLot: ${volume}\nEntry: ${openPrice}\nSL: ${stopLoss}\nTP: ${takeProfit}`,
      data: { tradeId: trade._id }
    });

    // Broadcast
    if (global.broadcastToUser) {
      global.broadcastToUser(req.userId.toString(), {
        type: 'trade_opened',
        data: trade
      });
    }

    res.status(201).json(trade);
  } catch (error) {
    logger.error('Record trade error:', error);
    res.status(500).json({ error: 'Failed to record trade' });
  }
});

// Update trade (from VPS)
router.put('/trades/:ticket', auth, async (req, res) => {
  try {
    const {
      closePrice,
      closeTime,
      profit,
      commission,
      swap,
      status,
      stopLoss,
      takeProfit
    } = req.body;

    const trade = await Trade.findOne({
      userId: req.userId,
      ticket: req.params.ticket
    });

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    if (closePrice !== undefined) trade.closePrice = closePrice;
    if (closeTime !== undefined) trade.closeTime = closeTime;
    if (profit !== undefined) trade.profit = profit;
    if (commission !== undefined) trade.commission = commission;
    if (swap !== undefined) trade.swap = swap;
    if (status !== undefined) trade.status = status;
    if (stopLoss !== undefined) trade.stopLoss = stopLoss;
    if (takeProfit !== undefined) trade.takeProfit = takeProfit;

    await trade.save();

    // If trade closed, send notification
    if (status === 'CLOSED') {
      const result = profit > 0 ? 'PROFIT' : 'LOSS';
      await sendNotification(req.userId, {
        title: `Trade Closed - ${result}`,
        body: `${trade.symbol} ${trade.type} closed\nProfit: ${profit.toFixed(2)}`,
        data: { tradeId: trade._id }
      });
    }

    // Broadcast
    if (global.broadcastToUser) {
      global.broadcastToUser(req.userId.toString(), {
        type: 'trade_updated',
        data: trade
      });
    }

    res.json(trade);
  } catch (error) {
    logger.error('Update trade error:', error);
    res.status(500).json({ error: 'Failed to update trade' });
  }
});

module.exports = router;