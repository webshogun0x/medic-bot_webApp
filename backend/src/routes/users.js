const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth.middleware');
const router = express.Router();

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const snapshot = await db.ref(`USERS/${req.user.uid}/profile`).once('value');
    res.json(snapshot.val());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { medicalId, emergencyContact, bloodType, allergies, medications, medicalHistory } = req.body;
    
    await db.ref(`USERS/${req.user.uid}/profile`).update({
      medicalId,
      emergencyContact,
      bloodType,
      allergies,
      medications,
      medicalHistory,
      updatedAt: Date.now()
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get medication reminders
router.get('/medications', verifyToken, async (req, res) => {
  try {
    const snapshot = await db.ref(`USERS/${req.user.uid}/medications`).once('value');
    res.json(snapshot.val() || []);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add medication reminder
router.post('/medications', verifyToken, async (req, res) => {
  try {
    const { name, dosage, frequency, time } = req.body;
    const medRef = db.ref(`USERS/${req.user.uid}/medications`).push();
    
    await medRef.set({
      name,
      dosage,
      frequency,
      time,
      active: true,
      createdAt: Date.now()
    });

    res.json({ success: true, id: medRef.key });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
