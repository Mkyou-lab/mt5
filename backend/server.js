require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const WebSocket = require('ws');
const http = require('http');

// ============================================
// VALIDATE ENVIRONMENT VARIABLES
// ============================================
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'ENCRYPTION_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease set these in Railway Dashboard → Variables');
  process.exit(1);
}

// Validate ENCRYPTION_KEY format
if (process.env.ENCRYPTION_KEY.length !== 64) {
  console.error('❌ ENCRYPTION_KEY must be 64 hex characters');
  console.error('Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

console.log('✅ All environment variables validated');

// ============================================
// Continue with rest of server.js...
// ============================================

const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/auth');
const mt5Routes = require('./routes/mt5');
const tradingRoutes = require('./routes/trading');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  logger.info('MongoDB connected');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  logger.error('MongoDB connection error:', err);
  process.exit(1);
});

// WebSocket connections
const clients = new Map();

wss.on('connection', (ws, req) => {
  logger.info('New WebSocket connection');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'auth') {
        clients.set(data.userId, ws);
        ws.userId = data.userId;
        ws.send(JSON.stringify({ type: 'auth', status: 'connected' }));
      }
    } catch (error) {
      logger.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    if (ws.userId) {
      clients.delete(ws.userId);
    }
  });
});

// Broadcast function
global.broadcastToUser = (userId, data) => {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
  }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mt5', mt5Routes);
app.use('/api/trading', tradingRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    env: {
      nodeEnv: process.env.NODE_ENV,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasEncryptionKey: !!process.env.ENCRYPTION_KEY,
      hasMongoDB: !!process.env.MONGODB_URI
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'MK PRO Backend API',
    version: '1.0.0',
    status: 'running'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ MK PRO Backend running on port ${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`MK PRO Backend running on port ${PORT}`);
});
