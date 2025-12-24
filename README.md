# MediBot Health Monitoring System - Mobile & Backend

Complete mobile application and backend API for the MediBot Health Monitoring System.

## Project Structure

```
medibot-mobile-system/
├── backend/              # Node.js Express API
│   ├── src/
│   │   ├── config/      # Firebase configuration
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic (AI, etc.)
│   │   ├── middleware/  # Authentication
│   │   └── server.js    # Main server
│   └── package.json
│
└── mobile-app/          # React Native Expo App
    ├── src/
    │   ├── screens/     # App screens
    │   ├── components/  # Reusable components
    │   ├── services/    # API calls
    │   ├── context/     # State management
    │   ├── navigation/  # Navigation setup
    │   └── config/      # Firebase config
    └── App.js
```

## Quick Start Guide

### Prerequisites
- Node.js v18+ installed
- Firebase project created
- OpenAI API key (for AI recommendations)
- Expo CLI installed: `npm install -g expo-cli`

### Step 1: Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

Backend runs on `http://localhost:3000`

### Step 2: Setup Mobile App

```bash
cd mobile-app
npm install
# Edit src/config/firebase.js with Firebase credentials
# Edit src/services/api.service.js with backend URL
npm start
```

Scan QR code with Expo Go app on your phone.

## System Architecture

### Data Flow
```
[ESP32 Device] → [Firebase Realtime DB] ← [Backend API] ← [Mobile App]
                                              ↓
                                        [OpenAI API]
```

### User Journey

1. **Registration (Mobile App)**
   - User creates account with email/password
   - Enters personal details and medical history
   - Manually enters RFID number (written on card)
   - RFID linked to user account in Firebase

2. **Health Check (Physical Device)**
   - User scans RFID at ESP32 station
   - Fingerprint verification
   - Health sensors collect data (SpO2, HR, BP, temp)
   - Data saved to Firebase

3. **View Data (Mobile App)**
   - Dashboard shows latest readings
   - Color-coded health status
   - Historical trends and charts
   - Analytics over 7/30/90 days

4. **AI Recommendations (Mobile App)**
   - User requests AI analysis
   - Backend fetches health history
   - OpenAI generates personalized advice
   - Risk assessment and recommendations displayed

5. **Medication Reminders (Mobile App)**
   - Add medication schedules
   - Set reminders with notifications

## Firebase Database Structure

```
USERS/
  {userId}/
    profile/
      - email, firstName, lastName, dateOfBirth, gender
      - rfidNumber, medicalId, emergencyContact
      - bloodType, allergies, medications, medicalHistory
    medications/
      {medicationId}/
        - name, dosage, frequency, time, active
    recommendations/
      {timestamp}/
        - riskLevel, insights, recommendations, medicalAdvice

RFID_MAPPING/
  {rfidNumber}/
    - userId

READINGS/
  {rfidNumber}/
    latest/
      - spo2, heartRate, systolic, diastolic, temperature, bmi, timestamp
    history/
      {timestamp}/
        - spo2, heartRate, systolic, diastolic, temperature, bmi
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/link-rfid` - Link RFID to account

### User Profile
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/medications` - Get medication reminders
- `POST /api/users/medications` - Add medication

### Health Readings
- `GET /api/readings/latest` - Get latest reading
- `GET /api/readings/history?days=7` - Get history
- `GET /api/readings/analytics?days=30` - Get analytics

### AI Recommendations
- `POST /api/ai/generate` - Generate AI recommendations
- `GET /api/ai/history` - Get recommendation history

## Configuration

### Backend Environment Variables (.env)
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
OPENAI_API_KEY=your-openai-api-key
PORT=3000
```

### Mobile App Configuration
- `src/config/firebase.js` - Firebase credentials
- `src/services/api.service.js` - Backend API URL

## Features

### Mobile App
✅ User registration with RFID linking
✅ Real-time health dashboard
✅ Interactive charts and analytics
✅ AI-powered health recommendations
✅ Medication reminders
✅ Offline data caching
✅ Pull-to-refresh data sync

### Backend API
✅ Firebase Authentication
✅ RESTful API endpoints
✅ OpenAI integration for AI recommendations
✅ Health data analytics
✅ Secure token-based authentication

## Development Tips

### Testing Locally
1. Start backend: `cd backend && npm run dev`
2. Get your computer's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Update mobile app API_URL to `http://YOUR_IP:3000/api`
4. Start mobile app: `cd mobile-app && npm start`
5. Scan QR code with Expo Go

### Debugging
- Backend logs: Check terminal running `npm run dev`
- Mobile logs: Shake device → "Debug Remote JS"
- Firebase data: Firebase Console → Realtime Database

## Deployment

### Backend (Example: Heroku)
```bash
cd backend
heroku create medibot-backend
heroku config:set FIREBASE_PROJECT_ID=xxx OPENAI_API_KEY=xxx
git push heroku main
```

### Mobile App
```bash
cd mobile-app
expo build:android  # For Android APK
expo build:ios      # For iOS (requires Apple Developer account)
```

## Next Steps

1. ✅ Complete Firebase setup
2. ✅ Get OpenAI API key
3. ✅ Test backend endpoints
4. ✅ Configure mobile app
5. ✅ Test on physical device
6. 🔄 Add push notifications
7. 🔄 Implement data export (PDF/CSV)
8. 🔄 Add family account support

## Support

For issues or questions:
1. Check README files in backend/ and mobile-app/
2. Verify Firebase and OpenAI configurations
3. Ensure all dependencies installed
4. Check network connectivity

## License

MIT License - MediBot Health Monitoring System
