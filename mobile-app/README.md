# MediBot Mobile App

React Native mobile application for MediBot Health Monitoring System.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Firebase
Edit `src/config/firebase.js` and add your Firebase credentials:
- Get credentials from Firebase Console → Project Settings → General

### 3. Update API URL
Edit `src/services/api.service.js`:
- Change `API_URL` to your backend server address
- For local testing: Use your computer's IP address (e.g., `http://192.168.1.100:3000/api`)
- For production: Use your deployed backend URL

### 4. Run the App

**Start Expo:**
```bash
npm start
```

**Run on Android:**
```bash
npm run android
```

**Run on iOS (Mac only):**
```bash
npm run ios
```

**Test on Physical Device:**
1. Install "Expo Go" app from Play Store/App Store
2. Scan QR code from terminal
3. App will load on your phone

## Features

### 1. User Registration
- Create account with email/password
- Enter personal details (name, DOB, gender)
- Manually register RFID number (written on card)
- Complete medical profile

### 2. Dashboard
- View latest health readings
- Color-coded status indicators
- Pull to refresh data
- Quick access to all features

### 3. Analytics & Trends
- View health data over time (7/30/90 days)
- Interactive line charts for SpO2, heart rate, BP
- Statistical summaries (avg, min, max)
- Export data (future feature)

### 4. AI Recommendations
- Generate personalized health advice
- Risk assessment based on readings
- Lifestyle and dietary recommendations
- Medical advice alerts

### 5. Medication Reminders
- Add medication schedules
- Set dosage and frequency
- Push notifications (requires setup)

## Offline Support
- Health data cached locally
- View last synced readings offline
- Auto-sync when connection restored

## Troubleshooting

**"Network Error":**
- Check backend server is running
- Verify API_URL in api.service.js
- Ensure phone and computer on same network (for local testing)

**"Firebase Error":**
- Verify firebase.js configuration
- Check Firebase project settings
- Ensure Firebase Authentication is enabled

**Charts not displaying:**
- Ensure you have health data in Firebase
- Visit MediBot station to record readings
- Check RFID is linked to your account
