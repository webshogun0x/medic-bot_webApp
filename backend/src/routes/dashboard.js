const express = require('express');
const { db, initialized } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth.middleware');
const { calculateStats, getActivityLog } = require('../services/dashboard.service');
const router = express.Router();

// Check Firebase connection
router.use((req, res, next) => {
  if (!initialized || !db) {
    return res.status(503).json({ error: 'Firebase not initialized. Check server logs.' });
  }
  next();
});

// Get dashboard data (stats + activity log)
router.get('/data', verifyToken, async (req, res) => {
  try {
    // Get user profile
    const profile = await db.ref(`USERS/${req.user.uid}/profile`).once('value');
    const userData = profile.val();
    const rfid = userData?.rfidNumber;

    if (!rfid) {
      return res.status(404).json({ error: 'RFID not linked' });
    }

    // Get latest reading
    const latestSnapshot = await db.ref(`READINGS/${rfid}/latest`).once('value');
    const latestReading = latestSnapshot.val() || {};

    // Calculate stats from readings history
    const stats = await calculateStats(rfid);

    // Get recent activity log
    const activityLog = await getActivityLog(req.user.uid, 10);

    res.json({
      latest: latestReading,
      stats: {
        totalReadings: stats.totalReadings,
        newThisWeek: stats.newThisWeek,
        criticalAlerts: stats.criticalAlerts,
        healthScore: stats.healthScore
      },
      activity: activityLog,
      lastUpdated: stats.lastUpdated
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch dashboard data' });
  }
});

// Get chart data (last 7 days)
router.get('/chart-data', verifyToken, async (req, res) => {
  try {
    const profile = await db.ref(`USERS/${req.user.uid}/profile`).once('value');
    const userData = profile.val();
    const rfid = userData?.rfidNumber;

    if (!rfid) {
      return res.status(404).json({ error: 'RFID not linked' });
    }

    const historySnapshot = await db.ref(`READINGS/${rfid}/history`).once('value');
    const historyData = historySnapshot.val() || {};

    // Get last 7 readings
    const readings = Object.entries(historyData)
      .map(([timestamp, data]) => ({
        timestamp: parseInt(timestamp),
        date: new Date(parseInt(timestamp)).toLocaleDateString('en-US', { weekday: 'short' }),
        value: Math.round((data.heartRate || 0) + (data.spo2 || 0))
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-7);

    res.json(readings);
  } catch (error) {
    console.error('Chart data error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch chart data' });
  }
});

module.exports = router;
