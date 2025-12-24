const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth.middleware');
const { generateHealthRecommendations } = require('../services/ai.service');
const router = express.Router();

// Get AI recommendations
router.post('/generate', verifyToken, async (req, res) => {
  try {
    const profile = await db.ref(`USERS/${req.user.uid}/profile`).once('value');
    const userData = profile.val();
    const rfid = userData?.rfidNumber;
    
    if (!rfid) {
      return res.status(404).json({ error: 'RFID not linked' });
    }

    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const snapshot = await db.ref(`READINGS/${rfid}/history`)
      .orderByKey()
      .startAt(cutoffTime.toString())
      .once('value');

    const healthData = [];
    snapshot.forEach(child => {
      healthData.push({
        date: new Date(parseInt(child.key)).toLocaleDateString(),
        ...child.val()
      });
    });

    if (healthData.length === 0) {
      return res.status(400).json({ error: 'No health data available' });
    }

    const recommendations = await generateHealthRecommendations(userData, healthData);

    await db.ref(`USERS/${req.user.uid}/recommendations/${Date.now()}`).set({
      ...recommendations,
      generatedAt: Date.now()
    });

    res.json(recommendations);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get recommendation history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const snapshot = await db.ref(`USERS/${req.user.uid}/recommendations`)
      .orderByKey()
      .limitToLast(10)
      .once('value');

    const recommendations = [];
    snapshot.forEach(child => {
      recommendations.push({ id: child.key, ...child.val() });
    });

    res.json(recommendations.reverse());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
