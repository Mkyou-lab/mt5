const express = require('express');
const router = express.Router();
const Trade = require('../models/Trade');
const MT5Account = require('../models/MT5Account');
const auth = require('../middleware/auth');

// Get dashboard stats
router.get('/stats/:accountId', auth, async (req, res) => {
  try {
    const accountId = req.params.accountId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get account info
    const account = await MT5Account.findOne({
      _id: accountId,
      userId: req.userId
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Open trades
    const openTrades = await Trade.find({
      userId: req.userId,
      mt5AccountId: accountId,
      status: 'OPEN'
    });

    // Today's trades
    const todayTrades = await Trade.find({
      userId: req.userId,
      mt5AccountId: accountId,
      openTime: { $gte: today }
    });

    // All closed trades
    const closedTrades = await Trade.find({
      userId: req.userId,
      mt5AccountId: accountId,
      status: 'CLOSED'
    });

    // Calculate stats
    const totalTrades = closedTrades.length;
    const winningTrades = closedTrades.filter(t => t.profit > 0).length;
    const losingTrades = closedTrades.filter(t => t.profit < 0).length;
    const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(2) : 0;

    const totalProfit = closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const todayProfit = todayTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const floatingPL = openTrades.reduce((sum, t) => sum + (t.profit || 0), 0);

    const grossProfit = closedTrades
      .filter(t => t.profit > 0)
      .reduce((sum, t) => sum + t.profit, 0);
    
    const grossLoss = Math.abs(closedTrades
      .filter(t => t.profit < 0)
      .reduce((sum, t) => sum + t.profit, 0));

    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : 0;

    // Calculate drawdown
    let peak = account.balance;
    let maxDrawdown = 0;
    let runningBalance = account.balance;

    closedTrades.sort((a, b) => new Date(a.closeTime) - new Date(b.closeTime));
    
    closedTrades.forEach(trade => {
      runningBalance += trade.profit;
      if (runningBalance > peak) {
        peak = runningBalance;
      }
      const drawdown = ((peak - runningBalance) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    res.json({
      account: {
        name: account.accountName,
        broker: account.broker,
        type: account.accountType,
        balance: account.balance,
        equity: account.equity,
        freeMargin: account.freeMargin,
        marginLevel: account.marginLevel,
        vpsStatus: account.vpsStatus
      },
      stats: {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate,
        totalProfit,
        todayProfit,
        floatingPL,
        profitFactor,
        maxDrawdown: maxDrawdown.toFixed(2),
        todayTrades: todayTrades.length,
        openPositions: openTrades.length
      },
      openTrades,
      recentTrades: closedTrades.slice(-10).reverse()
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get equity curve data
router.get('/equity/:accountId', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trades = await Trade.find({
      userId: req.userId,
      mt5AccountId: req.params.accountId,
      status: 'CLOSED',
      closeTime: { $gte: startDate }
    }).sort({ closeTime: 1 });

    const account = await MT5Account.findOne({
      _id: req.params.accountId,
      userId: req.userId
    });

    let runningBalance = account.balance;
    const equityCurve = [];

    trades.forEach(trade => {
      runningBalance += trade.profit;
      equityCurve.push({
        date: trade.closeTime,
        balance: runningBalance,
        profit: trade.profit
      });
    });

    res.json(equityCurve);
  } catch (error) {
    console.error('Equity curve error:', error);
    res.status(500).json({ error: 'Failed to fetch equity curve' });
  }
});

module.exports = router;