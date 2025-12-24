const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth.middleware');
const router = express.Router();

// Get latest reading
router.get('/latest', verifyToken, async (req, res) => {
  try {
    const profile = await db.ref(`USERS/${req.user.uid}/profile`).once('value');
    const rfid = profile.val()?.rfidNumber;
    
    if (!rfid) {
      return res.status(404).json({ error: 'RFID not linked' });
    }

    const snapshot = await db.ref(`READINGS/${rfid}/latest`).once('value');
    res.json(snapshot.val());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get reading history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const profile = await db.ref(`USERS/${req.user.uid}/profile`).once('value');
    const rfid = profile.val()?.rfidNumber;
    
    if (!rfid) {
      return res.status(404).json({ error: 'RFID not linked' });
    }

    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const snapshot = await db.ref(`READINGS/${rfid}/history`)
      .orderByKey()
      .startAt(cutoffTime.toString())
      .once('value');

    const readings = [];
    snapshot.forEach(child => {
      readings.push({ timestamp: child.key, ...child.val() });
    });

    res.json(readings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get analytics
router.get('/analytics', verifyToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const profile = await db.ref(`USERS/${req.user.uid}/profile`).once('value');
    const rfid = profile.val()?.rfidNumber;
    
    if (!rfid) {
      return res.status(404).json({ error: 'RFID not linked' });
    }

    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const snapshot = await db.ref(`READINGS/${rfid}/history`)
      .orderByKey()
      .startAt(cutoffTime.toString())
      .once('value');

    const readings = [];
    snapshot.forEach(child => {
      readings.push(child.val());
    });

    const analytics = {
      spo2: { avg: 0, min: 100, max: 0 },
      heartRate: { avg: 0, min: 200, max: 0 },
      systolic: { avg: 0, min: 200, max: 0 },
      diastolic: { avg: 0, min: 200, max: 0 },
      temperature: { avg: 0, min: 50, max: 0 }
    };

    readings.forEach(r => {
      ['spo2', 'heartRate', 'systolic', 'diastolic', 'temperature'].forEach(key => {
        const val = parseFloat(r[key]);
        if (!isNaN(val)) {
          analytics[key].avg += val;
          analytics[key].min = Math.min(analytics[key].min, val);
          analytics[key].max = Math.max(analytics[key].max, val);
        }
      });
    });

    Object.keys(analytics).forEach(key => {
      analytics[key].avg = (analytics[key].avg / readings.length).toFixed(1);
    });

    res.json({ analytics, totalReadings: readings.length });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
