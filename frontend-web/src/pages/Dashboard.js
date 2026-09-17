import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [stats, setStats] = useState(null);
  const [equityCurve, setEquityCurve] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchDashboardStats();
      fetchEquityCurve();
      
      // Refresh every 5 seconds
      const interval = setInterval(() => {
        fetchDashboardStats();
      }, 5000);

      return () => clearInterval(interval);
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

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/stats/${selectedAccount}`);
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setLoading(false);
    }
  };

  const fetchEquityCurve = async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/equity/${selectedAccount}?days=30`);
      setEquityCurve(response.data);
    } catch (error) {
      console.error('Failed to fetch equity curve:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-mk-green"></div>
          <p className="mt-4 text-mk-green">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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

  const chartData = {
    labels: equityCurve.map(point => new Date(point.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Account Equity',
        data: equityCurve.map(point => point.balance),
        borderColor: '#00ff88',
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#1a1f2e',
        titleColor: '#00ff88',
        bodyColor: '#fff',
        borderColor: '#00ff88',
        borderWidth: 1,
      }
    },
    scales: {
      y: {
        grid: {
          color: '#2a3142'
        },
        ticks: {
          color: '#a0aec0'
        }
      },
      x: {
        grid: {
          color: '#2a3142'
        },
        ticks: {
          color: '#a0aec0'
        }
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-mk-darker">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <div className="flex items-center space-x-4">
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
            
            {stats?.account && (
              <span className={`status-badge ${
                stats.account.vpsStatus === 'CONNECTED' ? 'status-connected' : 'status-disconnected'
              }`}>
                {stats.account.vpsStatus}
              </span>
            )}
          </div>
        </div>

        {/* Account Stats */}
        {stats?.account && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="stat-card">
              <p className="stat-label">Balance</p>
              <p className="stat-value">${stats.account.balance.toFixed(2)}</p>
            </div>

            <div className="stat-card">
              <p className="stat-label">Equity</p>
              <p className="stat-value">${stats.account.equity.toFixed(2)}</p>
            </div>

            <div className="stat-card">
              <p className="stat-label">Free Margin</p>
              <p className="stat-value">${stats.account.freeMargin.toFixed(2)}</p>
            </div>

            <div className="stat-card">
              <p className="stat-label">Margin Level</p>
              <p className="stat-value">{stats.account.marginLevel.toFixed(2)}%</p>
            </div>
          </div>
        )}

        {/* Trading Stats */}
        {stats?.stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="stat-card">
              <p className="stat-label">Total Profit</p>
              <p className={`stat-value ${stats.stats.totalProfit >= 0 ? 'profit' : 'loss'}`}>
                ${stats.stats.totalProfit.toFixed(2)}
              </p>
            </div>

            <div className="stat-card">
              <p className="stat-label">Today's P/L</p>
              <p className={`stat-value ${stats.stats.todayProfit >= 0 ? 'profit' : 'loss'}`}>
                ${stats.stats.todayProfit.toFixed(2)}
              </p>
            </div>

            <div className="stat-card">
              <p className="stat-label">Win Rate</p>
              <p className="stat-value">{stats.stats.winRate}%</p>
            </div>

            <div className="stat-card">
              <p className="stat-label">Open Positions</p>
              <p className="stat-value">{stats.stats.openPositions}</p>
            </div>

            <div className="stat-card">
              <p className="stat-label">Total Trades</p>
              <p className="stat-value">{stats.stats.totalTrades}</p>
            </div>

            <div className="stat-card">
              <p className="stat-label">Profit Factor</p>
              <p className="stat-value">{stats.stats.profitFactor}</p>
            </div>

            <div className="stat-card">
              <p className="stat-label">Max Drawdown</p>
              <p className="stat-value loss">{stats.stats.maxDrawdown}%</p>
            </div>

            <div className="stat-card">
              <p className="stat-label">Today's Trades</p>
              <p className="stat-value">{stats.stats.todayTrades}</p>
            </div>
          </div>
        )}

        {/* Equity Curve */}
        <div className="mk-card mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Equity Curve (30 Days)</h2>
          <div style={{ height: '300px' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Open Positions */}
        {stats?.openTrades && stats.openTrades.length > 0 && (
          <div className="mk-card mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Open Positions</h2>
            <div className="overflow-x-auto">
              <table className="mk-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Type</th>
                    <th>Volume</th>
                    <th>Entry</th>
                    <th>Current</th>
                    <th>SL</th>
                    <th>TP</th>
                    <th>P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.openTrades.map((trade) => (
                    <tr key={trade._id}>
                      <td className="font-semibold">{trade.symbol}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          trade.type === 'BUY' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {trade.type}
                        </span>
                      </td>
                      <td>{trade.volume}</td>
                      <td>{trade.openPrice.toFixed(5)}</td>
                      <td>-</td>
                      <td>{trade.stopLoss?.toFixed(5) || '-'}</td>
                      <td>{trade.takeProfit?.toFixed(5) || '-'}</td>
                      <td className={trade.profit >= 0 ? 'profit' : 'loss'}>
                        ${trade.profit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Trades */}
        {stats?.recentTrades && stats.recentTrades.length > 0 && (
          <div className="mk-card">
            <h2 className="text-xl font-bold text-white mb-4">Recent Trades</h2>
            <div className="overflow-x-auto">
              <table className="mk-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Symbol</th>
                    <th>Type</th>
                    <th>Volume</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentTrades.map((trade) => (
                    <tr key={trade._id}>
                      <td>{new Date(trade.closeTime).toLocaleString()}</td>
                      <td className="font-semibold">{trade.symbol}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          trade.type === 'BUY' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {trade.type}
                        </span>
                      </td>
                      <td>{trade.volume}</td>
                      <td>{trade.openPrice.toFixed(5)}</td>
                      <td>{trade.closePrice.toFixed(5)}</td>
                      <td className={trade.profit >= 0 ? 'profit font-semibold' : 'loss font-semibold'}>
                        ${trade.profit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;