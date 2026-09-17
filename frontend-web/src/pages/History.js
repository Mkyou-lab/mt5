import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const History = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    symbol: '',
    type: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchTradeHistory();
    }
  }, [selectedAccount, pagination.page, filters]);

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

  const fetchTradeHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 50,
        ...filters
      });

      const response = await axios.get(
        `${API_URL}/trading/trades/history/${selectedAccount}?${params}`
      );

      setTrades(response.data.trades);
      setPagination({
        page: response.data.currentPage,
        totalPages: response.data.totalPages,
        total: response.data.total
      });
    } catch (error) {
      console.error('Failed to fetch trade history:', error);
      toast.error('Failed to fetch trade history');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, page: 1 });
  };

  const exportToCSV = () => {
    if (trades.length === 0) {
      toast.error('No trades to export');
      return;
    }

    const headers = ['Date', 'Symbol', 'Type', 'Volume', 'Entry', 'Exit', 'SL', 'TP', 'Profit', 'Strategy'];
    const rows = trades.map(trade => [
      new Date(trade.closeTime).toLocaleString(),
      trade.symbol,
      trade.type,
      trade.volume,
      trade.openPrice,
      trade.closePrice,
      trade.stopLoss || '-',
      trade.takeProfit || '-',
      trade.profit.toFixed(2),
      trade.strategy || '-'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mkpro-trades-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast.success('Trade history exported');
  };

  const calculateStats = () => {
    if (trades.length === 0) return null;

    const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
    const winners = trades.filter(t => t.profit > 0);
    const losers = trades.filter(t => t.profit < 0);
    const winRate = (winners.length / trades.length * 100).toFixed(2);
    const avgWin = winners.length > 0 
      ? (winners.reduce((sum, t) => sum + t.profit, 0) / winners.length).toFixed(2)
      : 0;
    const avgLoss = losers.length > 0
      ? (losers.reduce((sum, t) => sum + t.profit, 0) / losers.length).toFixed(2)
      : 0;

    return {
      totalProfit,
      winners: winners.length,
      losers: losers.length,
      winRate,
      avgWin,
      avgLoss
    };
  };

  const stats = calculateStats();

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-mk-darker">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Trade History</h1>
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
          
          <button onClick={exportToCSV} className="mk-button">
            📥 Export CSV
          </button>
        </div>

        {/* Statistics Summary */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="stat-card">
              <p className="stat-label">Total Trades</p>
              <p className="stat-value">{trades.length}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Total P/L</p>
              <p className={`stat-value ${stats.totalProfit >= 0 ? 'profit' : 'loss'}`}>
                ${stats.totalProfit.toFixed(2)}
              </p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Winners</p>
              <p className="stat-value profit">{stats.winners}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Losers</p>
              <p className="stat-value loss">{stats.losers}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Win Rate</p>
              <p className="stat-value">{stats.winRate}%</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Avg Win/Loss</p>
              <p className="stat-value text-sm">
                <span className="profit">${stats.avgWin}</span> / 
                <span className="loss">${stats.avgLoss}</span>
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mk-card mb-6">
          <h2 className="text-lg font-bold text-white mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="mk-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="mk-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Symbol</label>
              <input
                type="text"
                value={filters.symbol}
                onChange={(e) => handleFilterChange('symbol', e.target.value)}
                placeholder="e.g., XAUUSD"
                className="mk-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="mk-select w-full"
              >
                <option value="">All</option>
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
          </div>
          
          <button
            onClick={() => {
              setFilters({ startDate: '', endDate: '', symbol: '', type: '' });
              setPagination({ ...pagination, page: 1 });
            }}
            className="mk-button-secondary mt-4"
          >
            Clear Filters
          </button>
        </div>

        {/* Trade History Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-mk-green"></div>
          </div>
        ) : trades.length === 0 ? (
          <div className="mk-card text-center py-12">
            <p className="text-xl text-gray-400">No trades found</p>
          </div>
        ) : (
          <>
            <div className="mk-card overflow-x-auto">
              <table className="mk-table">
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th>Symbol</th>
                    <th>Type</th>
                    <th>Volume</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>SL</th>
                    <th>TP</th>
                    <th>Duration</th>
                    <th>Profit/Loss</th>
                    <th>Strategy</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => {
                    const duration = trade.closeTime && trade.openTime
                      ? Math.round((new Date(trade.closeTime) - new Date(trade.openTime)) / 60000)
                      : 0;

                    return (
                      <tr key={trade._id}>
                        <td className="text-sm">
                          {new Date(trade.closeTime).toLocaleString()}
                        </td>
                        <td className="font-semibold">{trade.symbol}</td>
                        <td>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            trade.type === 'BUY' 
                              ? 'bg-green-500/20 text-green-500' 
                              : 'bg-red-500/20 text-red-500'
                          }`}>
                            {trade.type}
                          </span>
                        </td>
                        <td>{trade.volume}</td>
                        <td>{trade.openPrice.toFixed(5)}</td>
                        <td>{trade.closePrice.toFixed(5)}</td>
                        <td>{trade.stopLoss ? trade.stopLoss.toFixed(5) : '-'}</td>
                        <td>{trade.takeProfit ? trade.takeProfit.toFixed(5) : '-'}</td>
                        <td className="text-sm text-gray-400">{duration}m</td>
                        <td className={`font-semibold ${trade.profit >= 0 ? 'profit' : 'loss'}`}>
                          ${trade.profit.toFixed(2)}
                        </td>
                        <td className="text-sm text-gray-400">
                          {trade.strategy || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 mt-6">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="mk-button-secondary"
                >
                  Previous
                </button>
                
                <span className="text-gray-400">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                  className="mk-button-secondary"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default History;