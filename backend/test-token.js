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

// Generate custom token for testing
async function generateTestToken() {
  try {
    const uid = 'test-user-123';
    const customToken = await admin.auth().createCustomToken(uid);
    console.log('Custom Token:', customToken);
    console.log('\nUse this token to get ID token via Firebase Auth REST API');
    console.log('POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=YOUR_API_KEY');
    console.log('Body: {"token":"' + customToken + '","returnSecureToken":true}');
  } catch (error) {
    console.error('Error:', error);
  }
}

generateTestToken();