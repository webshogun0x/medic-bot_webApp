const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

async function addMockData() {
  const rfid = '1234567890';
  const now = Date.now();
  
  // Add mock readings
  const mockReadings = [
    { spo2: 98, heartRate: 72, systolic: 120, diastolic: 80, temperature: 36.5 },
    { spo2: 97, heartRate: 75, systolic: 118, diastolic: 78, temperature: 36.7 },
    { spo2: 99, heartRate: 68, systolic: 122, diastolic: 82, temperature: 36.4 }
  ];

  for (let i = 0; i < mockReadings.length; i++) {
    const timestamp = now - (i * 24 * 60 * 60 * 1000); // Each day back
    await db.ref(`READINGS/${rfid}/history/${timestamp}`).set(mockReadings[i]);
  }

  // Set latest reading
  await db.ref(`READINGS/${rfid}/latest`).set({
    ...mockReadings[0],
    timestamp: now
  });

  console.log('Mock data added successfully!');
  process.exit(0);
}

addMockData().catch(console.error);