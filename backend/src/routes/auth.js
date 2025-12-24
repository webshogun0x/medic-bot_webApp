const express = require('express');
const { db, auth } = require('../config/firebase');
const router = express.Router();

// Register user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, dateOfBirth, gender } = req.body;

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`
    });

    await db.ref(`USERS/${userRecord.uid}/profile`).set({
      email,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      createdAt: Date.now()
    });

    res.json({ success: true, userId: userRecord.uid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Link RFID to user account
router.post('/link-rfid', async (req, res) => {
  try {
    const { userId, rfidNumber } = req.body;

    await db.ref(`USERS/${userId}/profile`).update({ rfidNumber });
    await db.ref(`RFID_MAPPING/${rfidNumber}`).set({ userId });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
