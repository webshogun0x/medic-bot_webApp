const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth.middleware');
const { logActivity } = require('../services/dashboard.service');
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
    const { firstName, lastName, medicalId, emergencyContact, bloodType, allergies, medications, medicalHistory, phone, rfidNumber } = req.body;
    
    // Validate emergency contact (phone number)
    if (emergencyContact) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(emergencyContact)) {
        return res.status(400).json({ 
          error: 'Invalid emergency contact format',
          message: 'Please provide a valid phone number'
        });
      }
    }

    // Validate phone
    if (phone) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ 
          error: 'Invalid phone format',
          message: 'Please provide a valid phone number'
        });
      }
    }
    
    const updateData = {
      updatedAt: Date.now()
    };
    
    // Only update fields that are provided
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (medicalId !== undefined) updateData.medicalId = medicalId;
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
    if (bloodType !== undefined) updateData.bloodType = bloodType;
    if (allergies !== undefined) updateData.allergies = allergies;
    if (medications !== undefined) updateData.medications = medications;
    if (medicalHistory !== undefined) updateData.medicalHistory = medicalHistory;
    if (phone !== undefined) updateData.phone = phone;
    
    await db.ref(`USERS/${req.user.uid}/profile`).update(updateData);

    res.json({ 
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      error: 'Failed to update profile',
      message: 'Please try again in a moment.'
    });
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
    
    // Validate required fields
    if (!name || !frequency || !time) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Please provide medication name, frequency, and time'
      });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return res.status(400).json({ 
        error: 'Invalid time format',
        message: 'Please use HH:MM format (e.g., 08:00)'
      });
    }
    
    const medRef = db.ref(`USERS/${req.user.uid}/medications`).push();
    
    await medRef.set({
      name,
      dosage: dosage || '',
      frequency,
      time,
      active: true,
      createdAt: Date.now()
    });

    // Auto-log activity
    await logActivity(req.user.uid, {
      type: 'medication_added',
      description: `Medication added: ${name} ${dosage} ${frequency}`,
      value: { medId: medRef.key, name, dosage, frequency }
    }).catch(err => console.log('Activity log error (non-critical):', err.message));

    res.json({ 
      success: true, 
      id: medRef.key,
      message: 'Medication reminder added successfully'
    });
  } catch (error) {
    console.error('Add medication error:', error);
    res.status(500).json({ 
      error: 'Failed to add medication',
      message: 'Please try again in a moment.'
    });
  }
});

// Delete medication reminder
router.delete('/medications/:id', verifyToken, async (req, res) => {
  try {
    const medId = req.params.id;
    
    // Check if medication exists
    const medSnapshot = await db.ref(`USERS/${req.user.uid}/medications/${medId}`).once('value');
    if (!medSnapshot.exists()) {
      return res.status(404).json({ 
        error: 'Medication not found',
        message: 'This medication reminder does not exist'
      });
    }
    
    await db.ref(`USERS/${req.user.uid}/medications/${medId}`).remove();
    
    // Auto-log activity
    await logActivity(req.user.uid, {
      type: 'medication_removed',
      description: `Medication removed (ID: ${medId})`,
      value: { medId }
    }).catch(err => console.log('Activity log error (non-critical):', err.message));

    res.json({ 
      success: true,
      message: 'Medication reminder deleted successfully'
    });
  } catch (error) {
    console.error('Delete medication error:', error);
    res.status(500).json({ 
      error: 'Failed to delete medication',
      message: 'Please try again in a moment.'
    });
  }
});

// Change password
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Invalid password',
        message: 'New password must be at least 6 characters long'
      });
    }

    const { auth } = require('../config/firebase');
    await auth.updateUser(req.user.uid, {
      password: newPassword
    });

    res.json({ 
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      error: 'Failed to change password',
      message: 'Please try again in a moment.'
    });
  }
});

// Delete account
router.delete('/account', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Get user's RFID to remove mapping
    const profileSnapshot = await db.ref(`USERS/${userId}/profile`).once('value');
    const profile = profileSnapshot.val();
    
    if (profile && profile.rfidNumber) {
      await db.ref(`RFID_MAPPING/${profile.rfidNumber}`).remove();
    }
    
    // Delete all user data from database
    await db.ref(`USERS/${userId}`).remove();
    
    // Delete user from Firebase Auth
    const { auth } = require('../config/firebase');
    await auth.deleteUser(userId);

    res.json({ 
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      error: 'Failed to delete account',
      message: 'Please try again in a moment.'
    });
  }
});

module.exports = router;
