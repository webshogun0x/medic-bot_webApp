# Complete Setup Guide - MediBot Mobile System

## Part 1: Install Required Software

### 1.1 Install Node.js
1. Go to https://nodejs.org/
2. Download LTS version (v20.x recommended)
3. Run installer and follow prompts
4. Verify installation:
   ```bash
   node --version
   npm --version
   ```

### 1.2 Install VS Code (Recommended)
1. Go to https://code.visualstudio.com/
2. Download and install
3. Install extensions:
   - "React Native Tools"
   - "ES7+ React/Redux/React-Native snippets"
   - "Prettier - Code formatter"

### 1.3 Install Expo CLI
```bash
npm install -g expo-cli
```

### 1.4 Install Expo Go on Your Phone
- Android: https://play.google.com/store/apps/details?id=host.exp.exponent
- iOS: https://apps.apple.com/app/expo-go/id982107779

---

## Part 2: Firebase Setup

### 2.1 Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Enter project name: "medibot-health"
4. Disable Google Analytics (optional)
5. Click "Create project"

### 2.2 Enable Firebase Authentication
1. In Firebase Console, click "Authentication"
2. Click "Get started"
3. Click "Email/Password"
4. Enable "Email/Password"
5. Click "Save"

### 2.3 Setup Realtime Database
1. Click "Realtime Database" in sidebar
2. Click "Create Database"
3. Choose location (closest to you)
4. Start in "Test mode" (we'll secure it later)
5. Click "Enable"

### 2.4 Get Firebase Credentials for Mobile App
1. Click gear icon → "Project settings"
2. Scroll to "Your apps"
3. Click web icon (</>)
4. Register app name: "MediBot Mobile"
5. Copy the firebaseConfig object
6. Paste into `mobile-app/src/config/firebase.js`

### 2.5 Get Firebase Admin Credentials for Backend
1. In Project Settings, click "Service accounts"
2. Click "Generate new private key"
3. Click "Generate key" (downloads JSON file)
4. Open the JSON file and copy:
   - `project_id` → FIREBASE_PROJECT_ID
   - `client_email` → FIREBASE_CLIENT_EMAIL
   - `private_key` → FIREBASE_PRIVATE_KEY
5. Get database URL from Realtime Database page
6. Paste all into `backend/.env`

---

## Part 3: OpenAI Setup

### 3.1 Create OpenAI Account
1. Go to https://platform.openai.com/signup
2. Create account
3. Add payment method (required for API access)

### 3.2 Get API Key
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name it "MediBot Backend"
4. Copy the key (you won't see it again!)
5. Paste into `backend/.env` as OPENAI_API_KEY

**Cost Estimate:** ~$0.01-0.03 per AI recommendation

---

## Part 4: Backend Setup

### 4.1 Install Dependencies
```bash
cd medibot-mobile-system/backend
npm install
```

### 4.2 Configure Environment
```bash
cp .env.example .env
```

Edit `.env` file:
```
FIREBASE_PROJECT_ID=medibot-health
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@medibot-health.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://medibot-health-default-rtdb.firebaseio.com
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
PORT=3000
```

### 4.3 Start Backend Server
```bash
npm run dev
```

You should see: "MediBot Backend running on port 3000"

### 4.4 Test Backend
Open browser: http://localhost:3000/health
Should see: `{"status":"OK","timestamp":1234567890}`

---

## Part 5: Mobile App Setup

### 5.1 Install Dependencies
```bash
cd medibot-mobile-system/mobile-app
npm install
```

### 5.2 Configure Firebase
Edit `src/config/firebase.js`:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "medibot-health.firebaseapp.com",
  databaseURL: "https://medibot-health-default-rtdb.firebaseio.com",
  projectId: "medibot-health",
  storageBucket: "medibot-health.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxxxxxxxxxx"
};
```

### 5.3 Configure Backend API URL

**For Local Testing:**
1. Find your computer's IP address:
   - Windows: Open CMD → `ipconfig` → Look for "IPv4 Address"
   - Mac: Open Terminal → `ifconfig | grep inet` → Look for 192.168.x.x
   - Linux: `hostname -I`

2. Edit `src/services/api.service.js`:
```javascript
const API_URL = 'http://192.168.1.100:3000/api'; // Replace with YOUR IP
```

**For Production:**
```javascript
const API_URL = 'https://your-backend-url.com/api';
```

### 5.4 Start Mobile App
```bash
npm start
```

A QR code will appear in terminal.

### 5.5 Run on Your Phone
1. Open "Expo Go" app on your phone
2. Scan the QR code
3. App will load on your phone

**Important:** Phone and computer must be on same WiFi network!

---

## Part 6: Testing the Complete System

### 6.1 Test User Registration
1. Open mobile app
2. Tap "Don't have an account? Register"
3. Fill in all fields including RFID number
4. Tap "Register"
5. Should see "Account created successfully!"

### 6.2 Verify Firebase Data
1. Go to Firebase Console → Realtime Database
2. You should see:
   ```
   USERS/
     {userId}/
       profile/
         - email, firstName, lastName, etc.
   RFID_MAPPING/
     {rfidNumber}/
       - userId
   ```

### 6.3 Test with ESP32 Device
1. Use ESP32 device to record health data
2. Scan your RFID card
3. Complete fingerprint verification
4. Enter health readings
5. Tap "Save"

### 6.4 View Data in Mobile App
1. Login to mobile app
2. Pull down to refresh
3. Should see your latest readings
4. Tap "View Trends & Analytics" to see charts
5. Tap "Get AI Health Advice" to generate recommendations

---

## Part 7: Troubleshooting

### Backend Issues

**"Cannot find module"**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

**"Firebase error"**
- Check .env file has correct credentials
- Ensure private key is wrapped in quotes
- Verify database URL is correct

**"OpenAI error"**
- Verify API key is correct
- Check you have credits in OpenAI account
- Ensure billing is set up

### Mobile App Issues

**"Network Error"**
- Verify backend is running (`npm run dev`)
- Check API_URL has correct IP address
- Ensure phone and computer on same WiFi
- Try pinging your computer from phone

**"Firebase error"**
- Check firebase.js has correct config
- Verify Firebase Authentication is enabled
- Check Realtime Database rules allow read/write

**"Expo error"**
```bash
cd mobile-app
rm -rf node_modules package-lock.json
npm install
expo start -c  # Clear cache
```

**Charts not showing**
- Ensure you have health data in Firebase
- Check RFID is linked to your account
- Verify readings exist in READINGS/{rfid}/history

---

## Part 8: Next Steps

### Secure Firebase Database
Edit Realtime Database Rules:
```json
{
  "rules": {
    "USERS": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "READINGS": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "RFID_MAPPING": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### Deploy Backend
- Heroku: https://www.heroku.com/
- Railway: https://railway.app/
- Render: https://render.com/

### Build Mobile App
```bash
cd mobile-app
expo build:android  # For Android
expo build:ios      # For iOS (requires Mac + Apple Developer account)
```

### Add Push Notifications
- Configure Firebase Cloud Messaging
- Implement notification scheduling
- Test medication reminders

---

## Support & Resources

- **Firebase Docs:** https://firebase.google.com/docs
- **Expo Docs:** https://docs.expo.dev/
- **React Native Docs:** https://reactnative.dev/
- **OpenAI API Docs:** https://platform.openai.com/docs

## Estimated Costs

- **Firebase:** Free tier (up to 100 concurrent connections)
- **OpenAI:** ~$0.01-0.03 per AI recommendation
- **Hosting:** $0-10/month (depending on provider)

**Total:** ~$5-20/month for moderate usage

---

## Success Checklist

- [ ] Node.js installed
- [ ] Expo CLI installed
- [ ] Expo Go app on phone
- [ ] Firebase project created
- [ ] Firebase Authentication enabled
- [ ] Realtime Database created
- [ ] Firebase credentials configured
- [ ] OpenAI API key obtained
- [ ] Backend dependencies installed
- [ ] Backend .env configured
- [ ] Backend server running
- [ ] Mobile app dependencies installed
- [ ] Mobile app Firebase configured
- [ ] Mobile app API URL configured
- [ ] Mobile app running on phone
- [ ] User registration tested
- [ ] ESP32 data sync tested
- [ ] Dashboard displaying data
- [ ] Charts showing trends
- [ ] AI recommendations working

**You're all set! 🎉**
