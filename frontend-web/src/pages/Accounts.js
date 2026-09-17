import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    accountName: '',
    broker: '',
    server: '',
    login: '',
    password: '',
    accountType: 'DEMO'
  });
  const [editingAccount, setEditingAccount] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/mt5/accounts`);
      setAccounts(response.data);
    } catch (error) {
      toast.error('Failed to fetch accounts');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingAccount) {
        await axios.put(`${API_URL}/mt5/accounts/${editingAccount._id}`, formData);
        toast.success('Account updated successfully');
      } else {
        await axios.post(`${API_URL}/mt5/accounts`, formData);
        toast.success('Account added successfully');
      }

      setFormData({
        accountName: '',
        broker: '',
        server: '',
        login: '',
        password: '',
        accountType: 'DEMO'
      });
      setShowAddForm(false);
      setEditingAccount(null);
      fetchAccounts();
    } catch (error) {
      const message = error.response?.data?.error || 'Operation failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      accountName: account.accountName,
      broker: account.broker,
      server: account.server,
      login: account.login,
      password: '',
      accountType: account.accountType
    });
    setShowAddForm(true);
  };

  const handleDelete = async (accountId) => {
    if (window.confirm('Are you sure you want to delete this account? This will also delete all associated settings and trade history.')) {
      try {
        await axios.delete(`${API_URL}/mt5/accounts/${accountId}`);
        toast.success('Account deleted');
        fetchAccounts();
      } catch (error) {
        toast.error('Failed to delete account');
      }
    }
  };

  const handleTestConnection = async (accountId) => {
    toast.info('Testing connection...');
    // In production, this would test the MT5 connection
    setTimeout(() => {
      toast.success('Connection test would run here');
    }, 1000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-mk-darker">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">MT5 Accounts</h1>
            <p className="text-gray-400">Manage your MetaTrader 5 broker accounts</p>
          </div>
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingAccount(null);
              setFormData({
                accountName: '',
                broker: '',
                server: '',
                login: '',
                password: '',
                accountType: 'DEMO'
              });
            }}
            className="mk-button"
          >
            + Add MT5 Account
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="mk-card mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                {editingAccount ? 'Edit Account' : 'Add New Account'}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingAccount(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    className="mk-input w-full"
                    placeholder="My Trading Account"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Account Type *
                  </label>
                  <select
                    value={formData.accountType}
                    onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                    className="mk-select w-full"
                    required
                  >
                    <option value="DEMO">Demo Account</option>
                    <option value="LIVE">Live Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Broker *
                  </label>
                  <input
                    type="text"
                    value={formData.broker}
                    onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                    className="mk-input w-full"
                    placeholder="e.g., IC Markets, FTMO, etc."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    MT5 Server *
                  </label>
                  <input
                    type="text"
                    value={formData.server}
                    onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                    className="mk-input w-full"
                    placeholder="e.g., ICMarkets-Demo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    MT5 Login *
                  </label>
                  <input
                    type="text"
                    value={formData.login}
                    onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                    className="mk-input w-full"
                    placeholder="12345678"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    MT5 Password *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mk-input w-full"
                    placeholder={editingAccount ? "Leave blank to keep current" : "••••••••"}
                    required={!editingAccount}
                  />
                  {editingAccount && (
                    <p className="text-xs text-gray-400 mt-1">
                      Leave blank to keep current password
                    </p>
                  )}
                </div>
              </div>

              {formData.accountType === 'LIVE' && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">
                    ⚠️ This is a LIVE account. Real money will be at risk when trading.
                  </p>
                </div>
              )}

              <div className="flex space-x-4">
                <button type="submit" disabled={loading} className="mk-button flex-1">
                  {loading ? 'Saving...' : editingAccount ? 'Update Account' : 'Add Account'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingAccount(null);
                  }}
                  className="mk-button-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Accounts List */}
        {accounts.length === 0 ? (
          <div className="mk-card text-center py-12">
            <p className="text-xl text-gray-400 mb-4">No MT5 accounts configured</p>
            <p className="text-gray-500 mb-6">Add your first MT5 account to start trading</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mk-button"
            >
              + Add MT5 Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {accounts.map((account) => (
              <div key={account._id} className="mk-card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {account.accountName}
                    </h3>
                    <p className="text-gray-400 text-sm">{account.broker}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`status-badge ${
                      account.accountType === 'LIVE' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'
                    }`}>
                      {account.accountType}
                    </span>
                    <span className={`status-badge ${
                      account.vpsStatus === 'CONNECTED' ? 'status-connected' : 'status-disconnected'
                    }`}>
                      {account.vpsStatus}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Balance</p>
                    <p className="text-lg font-semibold text-mk-green">
                      ${account.balance.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Equity</p>
                    <p className="text-lg font-semibold text-white">
                      ${account.equity.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Free Margin</p>
                    <p className="text-lg font-semibold text-white">
                      ${account.freeMargin.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Margin Level</p>
                    <p className="text-lg font-semibold text-white">
                      {account.marginLevel.toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="border-t border-mk-gray pt-4">
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-400">Server:</span>
                      <span className="text-white ml-2">{account.server}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Login:</span>
                      <span className="text-white ml-2">{account.login}</span>
                    </div>
                  </div>

                  {account.lastSync && (
                    <p className="text-xs text-gray-500 mb-4">
                      Last sync: {new Date(account.lastSync).toLocaleString()}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleTestConnection(account._id)}
                      className="mk-button-secondary text-sm py-2 px-4"
                    >
                      🔌 Test Connection
                    </button>
                    <button
                      onClick={() => handleEdit(account)}
                      className="mk-button-secondary text-sm py-2 px-4"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(account._id)}
                      className="mk-button-danger text-sm py-2 px-4"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-mk-gray rounded-lg border border-mk-green/20">
          <h3 className="text-sm font-semibold text-mk-green mb-2">🔒 Security Notice</h3>
          <p className="text-xs text-gray-400">
            Your MT5 credentials are encrypted using industry-standard AES-256 encryption.
            Passwords are never stored in plain text and are only decrypted when needed by
            the trading engine on your secure VPS.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Accounts;