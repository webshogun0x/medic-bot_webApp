require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - setup first
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint - no Firebase dependency
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: Date.now() });
});

// Load routes lazily to prevent blocking
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const readingsRoutes = require('./routes/readings');
const aiRoutes = require('./routes/ai-recommendations');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/readings', readingsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`MediBot Backend running on port ${PORT}`);
});
