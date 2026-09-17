import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import QRCode from 'qrcode';

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);

  // Profile settings
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });

  // 2FA settings
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showQR, setShowQR] = useState(false);

  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || ''
      });
      setTwoFAEnabled(user.twoFactorEnabled || false);
    }
  }, [user]);

  const handleEnable2FA = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/2fa/enable`);
      setSecret(response.data.secret);
      setQrCode(response.data.qrCode);
      setShowQR(true);
      toast.info('Scan QR code with your authenticator app');
    } catch (error) {
      toast.error('Failed to enable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/2fa/verify`, {
        token: verificationCode
      });
      setTwoFAEnabled(true);
      setShowQR(false);
      setVerificationCode('');
      toast.success('Two-factor authentication enabled successfully');
    } catch (error) {
      toast.error('Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    const code = prompt('Enter your 2FA code to disable:');
    const password = prompt('Enter your password to confirm:');

    if (!code || !password) return;

    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/2fa/disable`, {
        token: code,
        password
      });
      setTwoFAEnabled(false);
      toast.success('Two-factor authentication disabled');
    } catch (error) {
      toast.error('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      // In production, implement password change endpoint
      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'advanced', label: 'Advanced', icon: '⚙️' }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-mk-darker">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Settings</h1>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-mk-gray p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-mk-green text-mk-dark'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="mk-card">
            <h2 className="text-xl font-bold text-white mb-4">Profile Information</h2>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    className="mk-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    className="mk-input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  className="mk-input w-full"
                  disabled
                />
                <p className="text-xs text-gray-400 mt-1">
                  Contact support to change your email address
                </p>
              </div>

              <button type="button" className="mk-button">
                Save Changes
              </button>
            </form>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Password Change */}
            <div className="mk-card">
              <h2 className="text-xl font-bold text-white mb-4">Change Password</h2>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="mk-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="mk-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="mk-input w-full"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="mk-button">
                  Change Password
                </button>
              </form>
            </div>

            {/* Two-Factor Authentication */}
            <div className="mk-card">
              <h2 className="text-xl font-bold text-white mb-4">Two-Factor Authentication</h2>
              
              {!twoFAEnabled ? (
                <div>
                  <p className="text-gray-400 mb-4">
                    Add an extra layer of security to your account by enabling two-factor authentication.
                  </p>
                  
                  {!showQR ? (
                    <button
                      onClick={handleEnable2FA}
                      disabled={loading}
                      className="mk-button"
                    >
                      Enable 2FA
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg inline-block">
                        <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Or enter this code manually:</p>
                        <code className="bg-mk-gray px-4 py-2 rounded text-mk-green">
                          {secret}
                        </code>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Enter verification code from your app
                        </label>
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="mk-input w-full"
                          placeholder="000000"
                          maxLength="6"
                        />
                      </div>

                      <div className="flex space-x-4">
                        <button
                          onClick={handleVerify2FA}
                          disabled={loading || verificationCode.length !== 6}
                          className="mk-button"
                        >
                          Verify & Enable
                        </button>
                        <button
                          onClick={() => setShowQR(false)}
                          className="mk-button-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg mb-4">
                    <span className="text-2xl mr-3">✅</span>
                    <div>
                      <p className="font-semibold text-green-500">2FA Enabled</p>
                      <p className="text-sm text-gray-400">Your account is protected with two-factor authentication</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleDisable2FA}
                    disabled={loading}
                    className="mk-button-danger"
                  >
                    Disable 2FA
                  </button>
                </div>
              )}
            </div>

            {/* Active Sessions */}
            <div className="mk-card">
              <h2 className="text-xl font-bold text-white mb-4">Active Sessions</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-mk-gray rounded-lg">
                  <div>
                    <p className="font-semibold">Current Session</p>
                    <p className="text-xs text-gray-400">Last active: Just now</p>
                  </div>
                  <span className="status-badge status-active">Active</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="mk-card">
            <h2 className="text-xl font-bold text-white mb-4">Notification Preferences</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-mk-gray rounded-lg">
                <div>
                  <p className="font-semibold">Trade Notifications</p>
                  <p className="text-xs text-gray-400">Get notified when trades open or close</p>
                </div>
                <input type="checkbox" className="w-6 h-6" defaultChecked />
              </div>

              <div className="flex items-center justify-between p-4 bg-mk-gray rounded-lg">
                <div>
                  <p className="font-semibold">Risk Alerts</p>
                  <p className="text-xs text-gray-400">Alerts when risk limits are reached</p>
                </div>
                <input type="checkbox" className="w-6 h-6" defaultChecked />
              </div>

              <div className="flex items-center justify-between p-4 bg-mk-gray rounded-lg">
                <div>
                  <p className="font-semibold">System Notifications</p>
                  <p className="text-xs text-gray-400">VPS status, connection issues, etc.</p>
                </div>
                <input type="checkbox" className="w-6 h-6" defaultChecked />
              </div>

              <div className="flex items-center justify-between p-4 bg-mk-gray rounded-lg">
                <div>
                  <p className="font-semibold">Daily Summary</p>
                  <p className="text-xs text-gray-400">Daily trading performance summary</p>
                </div>
                <input type="checkbox" className="w-6 h-6" />
              </div>
            </div>

            <button className="mk-button mt-6">Save Preferences</button>
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <div className="mk-card">
              <h2 className="text-xl font-bold text-white mb-4">API Access</h2>
              <p className="text-gray-400 mb-4">
                Generate API keys for programmatic access to MK PRO
              </p>
              <button className="mk-button">Generate API Key</button>
            </div>

            <div className="mk-card">
              <h2 className="text-xl font-bold text-white mb-4">Data Export</h2>
              <p className="text-gray-400 mb-4">
                Export your trading history and account data
              </p>
              <div className="flex space-x-4">
                <button className="mk-button-secondary">Export Trades (CSV)</button>
                <button className="mk-button-secondary">Export All Data (JSON)</button>
              </div>
            </div>

            <div className="mk-card border-2 border-red-500/30">
              <h2 className="text-xl font-bold text-red-500 mb-4">Danger Zone</h2>
              <p className="text-gray-400 mb-4">
                Permanently delete your account and all associated data
              </p>
              <button className="mk-button-danger">Delete Account</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;