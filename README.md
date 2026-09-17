# MK PRO - Professional Forex Trading System

🚀 Complete automated trading system for MetaTrader 5

## Features

- ✅ Multiple trading strategies
- ✅ Advanced risk management
- ✅ Real-time monitoring
- ✅ Cross-platform (Web, iOS, Android)
- ✅ VPS-ready MT5 automation
- ✅ Secure encrypted credentials

## Tech Stack

**Backend:** Node.js, Express, MongoDB, WebSocket  
**Frontend:** React, TailwindCSS, Chart.js  
**Mobile:** React Native, Expo  
**Trading Engine:** MQL5, MetaTrader 5  
**Deployment:** Railway (Backend), Vercel (Frontend)

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- MetaTrader 5
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/mk-pro.git
cd mk-pro

# Install backend
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
npm run dev

# Install frontend
cd ../frontend-web
npm install
cp .env.example .env
# Edit .env with backend URL
npm start

# Install mobile (optional)
cd ../mobile
npm install
expo start
