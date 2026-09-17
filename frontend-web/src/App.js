import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Trading from './pages/Trading';
import Settings from './pages/Settings';
import History from './pages/History';
import Accounts from './pages/Accounts';

import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

import { AuthProvider } from './contexts/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App bg-mk-darker min-h-screen text-white font-mono">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/" element={
              <PrivateRoute>
                <div className="flex flex-col h-screen">
                  <Navbar />
                  <Dashboard />
                </div>
              </PrivateRoute>
            } />
            
            <Route path="/trading" element={
              <PrivateRoute>
                <div className="flex flex-col h-screen">
                  <Navbar />
                  <Trading />
                </div>
              </PrivateRoute>
            } />
            
            <Route path="/accounts" element={
              <PrivateRoute>
                <div className="flex flex-col h-screen">
                  <Navbar />
                  <Accounts />
                </div>
              </PrivateRoute>
            } />
            
            <Route path="/settings" element={
              <PrivateRoute>
                <div className="flex flex-col h-screen">
                  <Navbar />
                  <Settings />
                </div>
              </PrivateRoute>
            } />
            
            <Route path="/history" element={
              <PrivateRoute>
                <div className="flex flex-col h-screen">
                  <Navbar />
                  <History />
                </div>
              </PrivateRoute>
            } />
          </Routes>
          
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            theme="dark"
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;