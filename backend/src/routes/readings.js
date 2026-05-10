const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth.middleware');
const { logActivity } = require('../services/dashboard.service');
const router = express.Router();

// Create or update a reading (POST endpoint to accept new readings)
router.post('/record', verifyToken, async (req, res) => {
  try {
    const { heartRate, spo2, systolic, diastolic, temperature } = req.body;
    const profile = await db.ref(`USERS/${req.user.uid}/profile`).once('value');
    const rfid = profile.val()?.rfidNumber;
    
    if (!rfid) {
      return res.status(404).json({ error: 'RFID not linked' });
    }

    const timestamp = Date.now();
    const readingData = { heartRate, spo2, systolic, diastolic, temperature, timestamp };

    // Save to latest and history
    await db.ref(`READINGS/${rfid}/latest`).set(readingData);
    await db.ref(`READINGS/${rfid}/history/${timestamp}`).set(readingData);

    // Auto-log activity
    await logActivity(req.user.uid, {
      type: 'reading_taken',
      description: `New health reading recorded - HR: ${heartRate}, SpO2: ${spo2}%`,
      value: readingData
    }).catch(err => console.log('Activity log error (non-critical):', err.message));

    res.json({ success: true, timestamp });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get latest reading
router.get('/latest', verifyToken, async (req, res) => {
  try {
    const profile = await db.ref(`USERS/${req.user.uid}/profile`).once('value');
    const rfid = profile.val()?.rfidNumber;
    
    if (!rfid) {
      return res.status(404).json({ 
        error: 'RFID card not linked',
        message: 'Please link your RFID card in your profile settings to view your health readings.'
      });
    }

    const snapshot = await db.ref(`READINGS/${rfid}/latest`).once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({ 
        error: 'No readings found',
        message: 'Visit a MediBot station to record your first health reading.'
      });
    }
    
    res.json(snapshot.val());
  } catch (error) {
    console.error('Error fetching latest reading:', error);
    res.status(500).json({ 
      error: 'Unable to retrieve your latest reading',
      message: 'Please try again in a moment.'
    });
  }
});

// Get reading history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const profile = await db.ref(`USERS/${req.user.uid}/profile`).once('value');
    const rfid = profile.val()?.rfidNumber;
    
    if (!rfid) {
      return res.status(404).json({ 
        error: 'RFID card not linked',
        message: 'Please link your RFID card in your profile settings to view your history.'
      });
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
    console.error('Error fetching history:', error);
    res.status(500).json({ 
      error: 'Unable to retrieve your reading history',
      message: 'Please try again in a moment.'
    });
  }
});

// Get analytics
router.get('/analytics', verifyToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const profile = await db.ref(`USERS/${req.user.uid}/profile`).once('value');
    const rfid = profile.val()?.rfidNumber;
    
    if (!rfid) {
      return res.status(404).json({ 
        error: 'RFID card not linked',
        message: 'Please link your RFID card in your profile settings to view analytics.'
      });
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

    // Fix division by zero issue
    if (readings.length === 0) {
      return res.json({ 
        analytics: {
          spo2: { avg: 0, min: 0, max: 0 },
          heartRate: { avg: 0, min: 0, max: 0 },
          systolic: { avg: 0, min: 0, max: 0 },
          diastolic: { avg: 0, min: 0, max: 0 },
          temperature: { avg: 0, min: 0, max: 0 }
        },
        totalReadings: 0,
        message: 'No readings available for the selected period'
      });
    }

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
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      error: 'Unable to calculate analytics',
      message: 'Please try again in a moment.'
    });
  }
});

module.exports = router;
