import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const Trading = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const strategies = [
    'CANDLE_MOMENTUM',
    'PRICE_ACTION',
    'TREND_FOLLOWING',
    'MARKET_STRUCTURE',
    'ICT',
    'HYBRID'
  ];

  const timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchSettings();
    }
  }, [selectedAccount]);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/mt5/accounts`);
      setAccounts(response.data);
      
      if (response.data.length > 0) {
        setSelectedAccount(response.data[0]._id);
      }
    } catch (error) {
      toast.error('Failed to fetch accounts');
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/trading/settings/${selectedAccount}`);
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleStartTrading = async () => {
    const account = accounts.find(a => a._id === selectedAccount);
    
    if (account?.accountType === 'LIVE') {
      setShowConfirmation(true);
    } else {
      await startTrading(false);
    }
  };

  const startTrading = async (confirmed = false) => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/trading/start/${selectedAccount}`, {
        confirmed
      });
      
      toast.success('Trading started successfully!');
      setShowConfirmation(false);
      fetchSettings();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to start trading';
      
      if (error.response?.data?.requiresConfirmation) {
        setShowConfirmation(true);
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStopTrading = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/trading/stop/${selectedAccount}`);
      toast.success('Trading stopped');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to stop trading');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAll = async () => {
    if (window.confirm('Are you sure you want to close all positions?')) {
      setLoading(true);
      try {
        await axios.post(`${API_URL}/trading/close-all/${selectedAccount}`);
        toast.success('Close all command sent');
      } catch (error) {
        toast.error('Failed to close positions');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpdateSettings = async (updates) => {
    try {
      await axios.put(`${API_URL}/trading/settings/${selectedAccount}`, updates);
      toast.success('Settings updated');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  if (!selectedAccount) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-xl text-gray-400 mb-4">No MT5 accounts found</p>
          <button
            onClick={() => window.location.href = '/accounts'}
            className="mk-button"
          >
            Add MT5 Account
          </button>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-mk-green"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-mk-darker">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Trading Control</h1>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="mk-select"
          >
            {accounts.map((account) => (
              <option key={account._id} value={account._id}>
                {account.accountName} ({account.broker})
              </option>
            ))}
          </select>
        </div>

        {/* Control Buttons */}
        <div className="mk-card mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Trading Status</h2>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className={`status-badge ${settings.isActive ? 'status-active' : 'status-paused'}`}>
                {settings.isActive ? 'ACTIVE' : 'STOPPED'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {!settings.isActive ? (
              <button
                onClick={handleStartTrading}
                disabled={loading}
                className="mk-button"
              >
                ▶️ START TRADING
              </button>
            ) : (
              <button
                onClick={handleStopTrading}
                disabled={loading}
                className="mk-button-danger"
              >
                ⏹️ STOP TRADING
              </button>
            )}

            <button
              onClick={handleCloseAll}
              disabled={loading}
              className="mk-button-danger"
            >
              ❌ CLOSE ALL
            </button>

            <button
              onClick={fetchSettings}
              className="mk-button-secondary"
            >
              🔄 REFRESH
            </button>
          </div>
        </div>

        {/* Strategy Configuration */}
        <div className="mk-card mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Strategy Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Strategy
              </label>
              <select
                value={settings.strategy}
                onChange={(e) => handleUpdateSettings({ strategy: e.target.value })}
                className="mk-select w-full"
              >
                {strategies.map(strategy => (
                  <option key={strategy} value={strategy}>
                    {strategy.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Timeframe
              </label>
              <select
                value={settings.timeframe}
                onChange={(e) => handleUpdateSettings({ timeframe: e.target.value })}
                className="mk-select w-full"
              >
                {timeframes.map(tf => (
                  <option key={tf} value={tf}>{tf}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lot Type
              </label>
              <select
                value={settings.lotType}
                onChange={(e) => handleUpdateSettings({ lotType: e.target.value })}
                className="mk-select w-full"
              >
                <option value="AUTO">Auto (Risk %)</option>
                <option value="FIXED">Fixed Lot</option>
              </select>
            </div>

            {settings.lotType === 'AUTO' ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Risk Percentage: {settings.riskPercentage}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={settings.riskPercentage}
                  onChange={(e) => handleUpdateSettings({ riskPercentage: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fixed Lot Size
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={settings.fixedLot}
                  onChange={(e) => handleUpdateSettings({ fixedLot: parseFloat(e.target.value) })}
                  className="mk-input w-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Risk Management */}
        <div className="mk-card mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Risk Management</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Daily Loss: {settings.maxDailyLoss}%
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={settings.maxDailyLoss}
                onChange={(e) => handleUpdateSettings({ maxDailyLoss: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Drawdown: {settings.maxDrawdown}%
              </label>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={settings.maxDrawdown}
                onChange={(e) => handleUpdateSettings({ maxDrawdown: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Open Trades: {settings.maxOpenTrades}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={settings.maxOpenTrades}
                onChange={(e) => handleUpdateSettings({ maxOpenTrades: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Trades Per Day: {settings.maxTradesPerDay}
              </label>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={settings.maxTradesPerDay}
                onChange={(e) => handleUpdateSettings({ maxTradesPerDay: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Consecutive Losses: {settings.maxConsecutiveLosses}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={settings.maxConsecutiveLosses}
                onChange={(e) => handleUpdateSettings({ maxConsecutiveLosses: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Spread (pips): {settings.maxSpread}
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.maxSpread}
                onChange={(e) => handleUpdateSettings({ maxSpread: parseInt(e.target.value) })}
                className="mk-input w-full"
              />
            </div>
          </div>
        </div>

        {/* Trade Management */}
        <div className="mk-card">
          <h2 className="text-xl font-bold text-white mb-4">Trade Management</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-mk-gray rounded-lg">
              <div>
                <p className="font-semibold">Use Stop Loss</p>
                <p className="text-xs text-gray-400">Automatically set stop loss on trades</p>
              </div>
              <input
                type="checkbox"
                checked={settings.useStopLoss}
                onChange={(e) => handleUpdateSettings({ useStopLoss: e.target.checked })}
                className="w-6 h-6"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-mk-gray rounded-lg">
              <div>
                <p className="font-semibold">Use Take Profit</p>
                <p className="text-xs text-gray-400">Automatically set take profit on trades</p>
              </div>
              <input
                type="checkbox"
                checked={settings.useTakeProfit}
                onChange={(e) => handleUpdateSettings({ useTakeProfit: e.target.checked })}
                className="w-6 h-6"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-mk-gray rounded-lg">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold">Use Break Even</p>
                    <p className="text-xs text-gray-400">Move SL to entry after profit</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.useBreakEven}
                    onChange={(e) => handleUpdateSettings({ useBreakEven: e.target.checked })}
                    className="w-6 h-6"
                  />
                </div>
                {settings.useBreakEven && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-400">
                      Break Even Pips: {settings.breakEvenPips}
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      value={settings.breakEvenPips}
                      onChange={(e) => handleUpdateSettings({ breakEvenPips: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-mk-gray rounded-lg">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold">Use Trailing Stop</p>
                    <p className="text-xs text-gray-400">Follow price with stop loss</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.useTrailingStop}
                    onChange={(e) => handleUpdateSettings({ useTrailingStop: e.target.checked })}
                    className="w-6 h-6"
                  />
                </div>
                {settings.useTrailingStop && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-400">
                      Trailing Stop Pips: {settings.trailingStopPips}
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={settings.trailingStopPips}
                      onChange={(e) => handleUpdateSettings({ trailingStopPips: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-mk-gray rounded-lg">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold">Use Partial Take Profit</p>
                    <p className="text-xs text-gray-400">Close part of position at profit</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.usePartialTP}
                    onChange={(e) => handleUpdateSettings({ usePartialTP: e.target.checked })}
                    className="w-6 h-6"
                  />
                </div>
                {settings.usePartialTP && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="text-xs text-gray-400">
                        Close %: {settings.partialTPPercent}%
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        step="10"
                        value={settings.partialTPPercent}
                        onChange={(e) => handleUpdateSettings({ partialTPPercent: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">
                        At Pips: {settings.partialTPPips}
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={settings.partialTPPips}
                        onChange={(e) => handleUpdateSettings({ partialTPPips: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-mk-dark p-8 rounded-lg max-w-md border-2 border-red-500">
              <h3 className="text-2xl font-bold text-red-500 mb-4">⚠️ WARNING</h3>
              <p className="text-white mb-6">
                MK PRO IS ABOUT TO TRADE REAL MONEY on your LIVE account.
              </p>
              <p className="text-gray-400 mb-6 text-sm">
                Trading carries significant risk. You could lose all your capital. 
                Make sure you understand the risks and have tested your strategy thoroughly.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => startTrading(true)}
                  className="mk-button-danger flex-1"
                >
                  I Understand - Start Trading
                </button>
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="mk-button-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Trading;