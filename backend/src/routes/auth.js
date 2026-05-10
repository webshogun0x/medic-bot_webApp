const express = require('express');
const jwt = require('jsonwebtoken');
const { db, auth } = require('../config/firebase');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET environment variable is not set!');
  process.exit(1);
}
const JWT_EXPIRY = '7d'; // Token expires in 7 days

// Validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const validateRFID = (rfid) => {
  // RFID should be alphanumeric, 8-16 characters
  const rfidRegex = /^[A-Za-z0-9]{8,16}$/;
  return !rfid || rfidRegex.test(rfid);
};

// Register user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, dateOfBirth, gender, rfidNumber } = req.body;

    // Input validation
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (!password || !validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'Please provide your first and last name' });
    }

    if (rfidNumber && !validateRFID(rfidNumber)) {
      return res.status(400).json({ error: 'Invalid RFID format. RFID should be 8-16 alphanumeric characters' });
    }

    // Check if RFID already exists
    if (rfidNumber) {
      const existingRFID = await db.ref(`RFID_MAPPING/${rfidNumber}`).once('value');
      if (existingRFID.exists()) {
        return res.status(400).json({ error: 'This RFID card is already registered to another account' });
      }
    }

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`
    });

    await db.ref(`USERS/${userRecord.uid}/profile`).set({
      email,
      firstName,
      lastName,
      dateOfBirth: dateOfBirth || '',
      gender: gender || '',
      rfidNumber: rfidNumber || '',
      createdAt: Date.now()
    });

    // Link RFID if provided
    if (rfidNumber) {
      await db.ref(`RFID_MAPPING/${rfidNumber}`).set({ 
        userId: userRecord.uid,
        linkedAt: Date.now()
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { uid: userRecord.uid, email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({ 
      success: true, 
      userId: userRecord.uid, 
      token,
      message: rfidNumber 
        ? 'Account created successfully! Your RFID card has been linked.' 
        : 'Account created successfully! You can link your RFID card later in settings.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // User-friendly error messages
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'This email is already registered. Please sign in instead.' });
    }
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({ error: 'Password is too weak. Please use a stronger password.' });
    }
    
    res.status(500).json({ error: 'Failed to create account. Please try again later.' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Verify user exists
    const userRecord = await auth.getUserByEmail(email);
    
    // Check if user is admin
    const adminSnapshot = await db.ref(`ADMINS/${userRecord.uid}`).once('value');
    const isAdmin = adminSnapshot.exists();
    
    // Generate JWT token
    const token = jwt.sign(
      { uid: userRecord.uid, email, isAdmin },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({ 
      success: true, 
      userId: userRecord.uid, 
      token,
      isAdmin
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Invalid email or password. Please try again.' });
  }
});

// Link RFID to user account
router.post('/link-rfid', async (req, res) => {
  try {
    const { userId, rfidNumber } = req.body;

    if (!userId || !rfidNumber) {
      return res.status(400).json({ error: 'User ID and RFID number are required' });
    }

    if (!validateRFID(rfidNumber)) {
      return res.status(400).json({ error: 'Invalid RFID format. RFID should be 8-16 alphanumeric characters' });
    }

    // Check if RFID already exists
    const existingRFID = await db.ref(`RFID_MAPPING/${rfidNumber}`).once('value');
    if (existingRFID.exists() && existingRFID.val().userId !== userId) {
      return res.status(400).json({ error: 'This RFID card is already registered to another account' });
    }

    // Check if RFID has readings in the system
    const readingsExist = await db.ref(`READINGS/${rfidNumber}/latest`).once('value');
    
    await db.ref(`USERS/${userId}/profile`).update({ 
      rfidNumber,
      rfidLinkedAt: Date.now()
    });
    await db.ref(`RFID_MAPPING/${rfidNumber}`).set({ 
      userId,
      linkedAt: Date.now()
    });

    res.json({ 
      success: true,
      message: readingsExist.exists() 
        ? 'RFID card linked successfully! Your health readings are now available.' 
        : 'RFID card linked successfully! Visit a MediBot station to record your first reading.'
    });
  } catch (error) {
    console.error('RFID linking error:', error);
    res.status(500).json({ error: 'Failed to link RFID card. Please try again.' });
  }
});

module.exports = router;
