const express = require('express');
const { db, auth } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth.middleware');
const router = express.Router();

// Middleware to check if user is admin
const verifyAdmin = async (req, res, next) => {
  try {
    const adminSnapshot = await db.ref(`ADMINS/${req.user.uid}`).once('value');
    if (!adminSnapshot.exists()) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify admin status' });
  }
};

// Get all patients
router.get('/patients', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const usersSnapshot = await db.ref('USERS').once('value');
    const users = usersSnapshot.val() || {};
    const rfidMappingSnapshot = await db.ref('RFID_MAPPING').once('value');
    const rfidMapping = rfidMappingSnapshot.val() || {};
    
    const patients = [];
    const seenUids = new Set();

    for (const [uid, userData] of Object.entries(users)) {
      if (!userData || typeof userData !== 'object') continue;
      
      // If this entry is an RFID-keyed duplicate of another mapped user, skip
      if (userData.rfid && rfidMapping[userData.rfid]?.userId && rfidMapping[userData.rfid]?.userId !== uid) {
        continue;
      }

      const profile = userData.profile || userData;
      const rfidNumber = profile.rfidNumber || profile.rfid || (rfidMapping[uid]?.userId ? uid : 'Not assigned');
      const firstName = profile.firstName || profile.first_name || (profile.name ? profile.name.split(' ')[0] : 'Patient');
      const lastName = profile.lastName || profile.last_name || (profile.name ? profile.name.split(' ').slice(1).join(' ') : (uid.length > 8 ? uid.slice(0, 6) : uid));
      const medicalId = profile.medicalId || profile.medical_id || undefined;
      const bloodType = profile.bloodType || undefined;

      seenUids.add(uid);
      patients.push({
        uid,
        email: profile.email || '',
        firstName,
        lastName,
        rfidNumber,
        dateOfBirth: profile.dateOfBirth || '',
        gender: profile.gender || '',
        phone: profile.phone || '',
        medicalId,
        bloodType,
        createdAt: profile.createdAt || profile.linkedAt || Date.now()
      });
    }
    
    res.json({ patients });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Create new patient (Admin)
router.post('/patients', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, gender, dateOfBirth, bloodType, medicalId, rfidNumber, emergencyContact, allergies, medicalHistory } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const newUid = 'pt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const finalMedicalId = medicalId || ('MB-' + Math.random().toString(36).substring(2, 8).toUpperCase());

    const profileData = {
      firstName,
      lastName,
      email: email || '',
      phone: phone || '',
      gender: gender || 'Not specified',
      dateOfBirth: dateOfBirth || '',
      bloodType: bloodType || '',
      medicalId: finalMedicalId,
      rfidNumber: rfidNumber || '',
      emergencyContact: emergencyContact || '',
      allergies: allergies || '',
      medicalHistory: medicalHistory || '',
      biometric_enrolled: false,
      fingerprint_registered: false,
      createdAt: Date.now(),
      createdBy: req.user.uid
    };

    if (rfidNumber) {
      const existing = await db.ref(`RFID_MAPPING/${rfidNumber}`).once('value');
      if (existing.exists() && existing.val().userId !== newUid) {
        return res.status(400).json({ error: 'This RFID card is already assigned to another patient' });
      }
      await db.ref(`RFID_MAPPING/${rfidNumber}`).set({
        userId: newUid,
        linkedAt: Date.now(),
        assignedBy: req.user.uid
      });
      await db.ref(`USERS/${rfidNumber}`).set({
        name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        rfid: rfidNumber,
        medical_id: finalMedicalId,
        biometric_enrolled: false,
        fingerprint_registered: false,
        linkedAt: Date.now()
      });
    }

    await db.ref(`USERS/${newUid}/profile`).set(profileData);

    res.json({
      success: true,
      message: 'Patient registered successfully',
      patient: { uid: newUid, ...profileData }
    });
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ error: 'Failed to create patient: ' + error.message });
  }
});

// Get patient details
router.get('/patients/:uid', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    
    let resolvedUid = uid;
    let userSnapshot = await db.ref(`USERS/${uid}`).once('value');
    let userData = userSnapshot.exists() ? userSnapshot.val() : null;

    // Check RFID_MAPPING if not directly found
    if (!userData) {
      const rfidMappingSnapshot = await db.ref(`RFID_MAPPING/${uid}`).once('value');
      if (rfidMappingSnapshot.exists()) {
        resolvedUid = rfidMappingSnapshot.val().userId;
        userSnapshot = await db.ref(`USERS/${resolvedUid}`).once('value');
        if (userSnapshot.exists()) userData = userSnapshot.val();
      }
    }

    // Check global USERS search if still not found
    if (!userData) {
      const allUsersSnapshot = await db.ref('USERS').once('value');
      if (allUsersSnapshot.exists()) {
        const allUsers = allUsersSnapshot.val();
        for (const [key, val] of Object.entries(allUsers)) {
          const u = val;
          if (key === uid || u?.profile?.rfidNumber === uid || u?.rfid === uid || u?.medicalId === uid || u?.profile?.medicalId === uid) {
            resolvedUid = key;
            userData = u;
            break;
          }
        }
      }
    }

    if (!userData) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const rawProfile = userData.profile || userData;
    const rfid = rawProfile.rfidNumber || rawProfile.rfid || (uid.length <= 16 && /^[A-Fa-f0-9]+$/.test(uid) ? uid : '');
    const profile = {
      firstName: rawProfile.firstName || rawProfile.first_name || (rawProfile.name ? rawProfile.name.split(' ')[0] : 'Patient'),
      lastName: rawProfile.lastName || rawProfile.last_name || (rawProfile.name ? rawProfile.name.split(' ').slice(1).join(' ') : 'Record'),
      email: rawProfile.email || '',
      phone: rawProfile.phone || '',
      gender: rawProfile.gender || 'Not specified',
      dateOfBirth: rawProfile.dateOfBirth || '',
      bloodType: rawProfile.bloodType || '',
      medicalId: rawProfile.medicalId || rawProfile.medical_id || ('MB-' + resolvedUid.slice(0, 6).toUpperCase()),
      rfidNumber: rfid || 'Not assigned',
      biometric_enrolled: Boolean(userData.biometric_enrolled || rawProfile.biometric_enrolled || userData.fingerprint_registered || rawProfile.fingerprint_registered),
      fingerprint_registered: Boolean(userData.fingerprint_registered || rawProfile.fingerprint_registered),
      createdAt: rawProfile.createdAt || rawProfile.linkedAt || Date.now()
    };

    const medicationsSnapshot = await db.ref(`USERS/${resolvedUid}/medications`).once('value');
    const medications = medicationsSnapshot.val() || {};

    // Get latest reading
    let latestReading = null;
    if (rfid && rfid !== 'Not assigned') {
      const readingSnapshot = await db.ref(`READINGS/${rfid}/latest`).once('value');
      latestReading = readingSnapshot.val();
    }
    if (!latestReading) {
      const globalSnapshot = await db.ref('READINGS/latest').once('value');
      latestReading = globalSnapshot.val();
    }

    res.json({
      profile,
      medications,
      latestReading
    });
  } catch (error) {
    console.error('Get patient details error:', error);
    res.status(500).json({ error: 'Failed to fetch patient details' });
  }
});

// Assign RFID to patient
router.post('/patients/:uid/assign-rfid', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { rfidNumber } = req.body;
    
    if (!rfidNumber) {
      return res.status(400).json({ error: 'RFID number is required' });
    }
    
    // Validate RFID format
    const rfidRegex = /^[A-Za-z0-9]{8,16}$/;
    if (!rfidRegex.test(rfidNumber)) {
      return res.status(400).json({ error: 'Invalid RFID format. RFID should be 8-16 alphanumeric characters' });
    }
    
    // Check if RFID already exists
    const existingRFID = await db.ref(`RFID_MAPPING/${rfidNumber}`).once('value');
    if (existingRFID.exists() && existingRFID.val().userId !== uid) {
      return res.status(400).json({ error: 'This RFID card is already assigned to another patient' });
    }
    
    // Check if patient exists
    const profileSnapshot = await db.ref(`USERS/${uid}/profile`).once('value');
    if (!profileSnapshot.exists()) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const profile = profileSnapshot.val();
    
    // Remove old RFID mapping if exists
    const oldRfid = profile.rfidNumber;
    if (oldRfid) {
      await db.ref(`RFID_MAPPING/${oldRfid}`).remove();
    }
    
    // Assign new RFID
    await db.ref(`USERS/${uid}/profile`).update({
      rfidNumber,
      rfidAssignedAt: Date.now(),
      rfidAssignedBy: req.user.uid
    });
    
    await db.ref(`RFID_MAPPING/${rfidNumber}`).set({
      userId: uid,
      linkedAt: Date.now(),
      assignedBy: req.user.uid
    });
    
    // Log activity
    await logAdminActivity(req.user.uid, 'RFID_ASSIGNED', {
      patientUid: uid,
      patientName: `${profile.firstName} ${profile.lastName}`,
      rfidNumber,
      oldRfid: oldRfid || 'None'
    });
    
    res.json({
      success: true,
      message: 'RFID card assigned successfully'
    });
  } catch (error) {
    console.error('Assign RFID error:', error);
    res.status(500).json({ error: 'Failed to assign RFID card' });
  }
});

// Get dashboard statistics
router.get('/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const usersSnapshot = await db.ref('USERS').once('value');
    const users = usersSnapshot.val() || {};
    
    const totalPatients = Object.keys(users).length;
    
    // Count patients with RFID
    let patientsWithRFID = 0;
    let patientsWithoutRFID = 0;
    
    for (const userData of Object.values(users)) {
      const profile = userData.profile || {};
      if (profile.rfidNumber) {
        patientsWithRFID++;
      } else {
        patientsWithoutRFID++;
      }
    }
    
    // Get total readings count (approximate)
    const readingsSnapshot = await db.ref('READINGS').once('value');
    const readings = readingsSnapshot.val() || {};
    let totalReadings = 0;
    
    for (const rfidData of Object.values(readings)) {
      if (rfidData.history) {
        totalReadings += Object.keys(rfidData.history).length;
      }
    }
    
    res.json({
      totalPatients,
      patientsWithRFID,
      patientsWithoutRFID,
      totalReadings
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get all readings (recent activity)
router.get('/recent-readings', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const readingsSnapshot = await db.ref('READINGS').once('value');
    const readings = readingsSnapshot.val() || {};
    
    const recentReadings = [];
    
    for (const [rfid, rfidData] of Object.entries(readings)) {
      if (rfidData.latest) {
        // Get user info
        const mappingSnapshot = await db.ref(`RFID_MAPPING/${rfid}`).once('value');
        const mapping = mappingSnapshot.val();
        
        let patientName = 'Unknown';
        if (mapping && mapping.userId) {
          const profileSnapshot = await db.ref(`USERS/${mapping.userId}/profile`).once('value');
          const profile = profileSnapshot.val();
          if (profile) {
            patientName = `${profile.firstName} ${profile.lastName}`;
          }
        }
        
        recentReadings.push({
          rfid,
          patientName,
          ...rfidData.latest,
          timestamp: rfidData.latest.timestamp || Date.now()
        });
      }
    }
    
    // Sort by timestamp descending
    recentReadings.sort((a, b) => b.timestamp - a.timestamp);
    
    res.json({ readings: recentReadings.slice(0, limit) });
  } catch (error) {
    console.error('Get recent readings error:', error);
    res.status(500).json({ error: 'Failed to fetch recent readings' });
  }
});

// Search patients
router.get('/search', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const query = req.query.q?.toLowerCase() || '';
    
    if (!query) {
      return res.json({ patients: [] });
    }
    
    const usersSnapshot = await db.ref('USERS').once('value');
    const users = usersSnapshot.val() || {};
    
    const results = [];
    for (const [uid, userData] of Object.entries(users)) {
      const profile = userData.profile || {};
      const fullName = `${profile.firstName} ${profile.lastName}`.toLowerCase();
      const email = (profile.email || '').toLowerCase();
      const rfid = (profile.rfidNumber || '').toLowerCase();
      
      if (fullName.includes(query) || email.includes(query) || rfid.includes(query)) {
        results.push({
          uid,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          rfidNumber: profile.rfidNumber || 'Not assigned'
        });
      }
    }
    
    res.json({ patients: results });
  } catch (error) {
    console.error('Search patients error:', error);
    res.status(500).json({ error: 'Failed to search patients' });
  }
});

// Make user an admin
router.post('/make-admin', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId, email } = req.body;
    
    if (!userId && !email) {
      return res.status(400).json({ error: 'User ID or email is required' });
    }
    
    let targetUserId = userId;
    
    // If email provided, get user by email
    if (email && !userId) {
      const userRecord = await auth.getUserByEmail(email);
      targetUserId = userRecord.uid;
    }
    
    // Check if already admin
    const adminSnapshot = await db.ref(`ADMINS/${targetUserId}`).once('value');
    if (adminSnapshot.exists()) {
      return res.status(400).json({ error: 'User is already an admin' });
    }
    
    // Get user profile
    const profileSnapshot = await db.ref(`USERS/${targetUserId}/profile`).once('value');
    if (!profileSnapshot.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const profile = profileSnapshot.val();
    
    // Add to admins
    await db.ref(`ADMINS/${targetUserId}`).set({
      email: profile.email,
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      role: 'admin',
      createdAt: Date.now(),
      createdBy: req.user.uid
    });
    
    // Log activity
    await logAdminActivity(req.user.uid, 'ADMIN_ADDED', {
      newAdminUid: targetUserId,
      newAdminName: `${profile.firstName} ${profile.lastName}`,
      newAdminEmail: profile.email
    });
    
    res.json({
      success: true,
      message: `${profile.firstName} ${profile.lastName} is now an admin`
    });
  } catch (error) {
    console.error('Make admin error:', error);
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'User with this email not found' });
    }
    res.status(500).json({ error: 'Failed to make user an admin' });
  }
});

// Remove admin privileges
router.delete('/remove-admin/:userId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Prevent removing yourself
    if (userId === req.user.uid) {
      return res.status(400).json({ error: 'You cannot remove your own admin privileges' });
    }
    
    // Check if user is admin
    const adminSnapshot = await db.ref(`ADMINS/${userId}`).once('value');
    if (!adminSnapshot.exists()) {
      return res.status(404).json({ error: 'User is not an admin' });
    }
    
    const adminData = adminSnapshot.val();
    
    await db.ref(`ADMINS/${userId}`).remove();
    
    // Log activity
    await logAdminActivity(req.user.uid, 'ADMIN_REMOVED', {
      removedAdminUid: userId,
      removedAdminName: `${adminData.firstName} ${adminData.lastName}`,
      removedAdminEmail: adminData.email
    });
    
    res.json({
      success: true,
      message: 'Admin privileges removed successfully'
    });
  } catch (error) {
    console.error('Remove admin error:', error);
    res.status(500).json({ error: 'Failed to remove admin privileges' });
  }
});

// Get all admins
router.get('/admins', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const adminsSnapshot = await db.ref('ADMINS').once('value');
    const admins = adminsSnapshot.val() || {};
    
    const adminList = [];
    for (const [uid, adminData] of Object.entries(admins)) {
      adminList.push({
        uid,
        ...adminData
      });
    }
    
    res.json({ admins: adminList });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// Log admin activity
const logAdminActivity = async (adminUid, action, details) => {
  try {
    await db.ref('ADMIN_LOGS').push({
      adminUid,
      action,
      details,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to log admin activity:', error);
  }
};

// Get admin activity logs
router.get('/activity-logs', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logsSnapshot = await db.ref('ADMIN_LOGS').limitToLast(limit).once('value');
    const logs = logsSnapshot.val() || {};
    
    const logsList = [];
    for (const [logId, logData] of Object.entries(logs)) {
      // Get admin info
      const adminSnapshot = await db.ref(`ADMINS/${logData.adminUid}`).once('value');
      const admin = adminSnapshot.val();
      
      logsList.push({
        id: logId,
        ...logData,
        adminName: admin ? `${admin.firstName} ${admin.lastName}` : 'Unknown',
        adminEmail: admin ? admin.email : 'Unknown'
      });
    }
    
    // Sort by timestamp descending
    logsList.sort((a, b) => b.timestamp - a.timestamp);
    
    res.json({ logs: logsList });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

module.exports = router;
