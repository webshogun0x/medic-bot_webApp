# Quick Start Commands

## Initial Setup (One Time Only)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
```

### Mobile App
```bash
cd mobile-app
npm install
# Edit src/config/firebase.js
# Edit src/services/api.service.js (API_URL)
```

---

## Daily Development

### Start Backend Server
```bash
cd backend
npm run dev
```
Server runs on: http://localhost:3000

### Start Mobile App
```bash
cd mobile-app
npm start
```
Scan QR code with Expo Go app

---

## Useful Commands

### Backend

**Install dependencies:**
```bash
npm install
```

**Start development server (auto-restart):**
```bash
npm run dev
```

**Start production server:**
```bash
npm start
```

**Test API health:**
```bash
curl http://localhost:3000/health
```

### Mobile App

**Install dependencies:**
```bash
npm install
```

**Start Expo:**
```bash
npm start
```

**Run on Android emulator:**
```bash
npm run android
```

**Run on iOS simulator (Mac only):**
```bash
npm run ios
```

**Clear cache and restart:**
```bash
expo start -c
```

**Build for production:**
```bash
expo build:android
expo build:ios
```

---

## Testing API Endpoints

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-01",
    "gender": "Male"
  }'
```

### Link RFID
```bash
curl -X POST http://localhost:3000/api/auth/link-rfid \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_HERE",
    "rfidNumber": "1234567890"
  }'
```

### Get Latest Reading (requires auth token)
```bash
curl http://localhost:3000/api/readings/latest \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Find Your Computer's IP Address

### Windows
```cmd
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter

### Mac
```bash
ifconfig | grep inet
```
Look for 192.168.x.x

### Linux
```bash
hostname -I
```

---

## Troubleshooting Commands

### Backend

**Reset node_modules:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Check if port 3000 is in use:**
```bash
# Mac/Linux
lsof -i :3000

# Windows
netstat -ano | findstr :3000
```

**Kill process on port 3000:**
```bash
# Mac/Linux
kill -9 $(lsof -t -i:3000)

# Windows
taskkill /PID <PID> /F
```

### Mobile App

**Reset Expo cache:**
```bash
expo start -c
```

**Reset node_modules:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Clear watchman (Mac/Linux):**
```bash
watchman watch-del-all
```

---

## Git Commands (Optional)

### Initialize repository
```bash
git init
git add .
git commit -m "Initial commit: MediBot mobile system"
```

### Create .gitignore
Already created! Excludes:
- node_modules/
- .env
- .expo/
- build files

---

## Environment Variables Reference

### Backend (.env)
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
PORT=3000
NODE_ENV=development
```

### Mobile App (src/config/firebase.js)
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "project.firebaseapp.com",
  databaseURL: "https://project.firebaseio.com",
  projectId: "project-id",
  storageBucket: "project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Mobile App (src/services/api.service.js)
```javascript
const API_URL = 'http://192.168.1.100:3000/api'; // Local
// const API_URL = 'https://your-backend.com/api'; // Production
```

---

## Quick Health Check

### 1. Backend Running?
```bash
curl http://localhost:3000/health
```
Expected: `{"status":"OK","timestamp":...}`

### 2. Firebase Connected?
Check Firebase Console → Realtime Database for data

### 3. Mobile App Connected?
Pull down on dashboard to refresh - should see data

### 4. OpenAI Working?
Generate AI recommendation in app - should return advice

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "Cannot find module" | `rm -rf node_modules && npm install` |
| "Port 3000 in use" | Kill process or change PORT in .env |
| "Network Error" in app | Check API_URL has correct IP |
| "Firebase error" | Verify credentials in .env and firebase.js |
| "OpenAI error" | Check API key and billing setup |
| Charts not showing | Ensure health data exists in Firebase |
| Expo won't start | `expo start -c` to clear cache |

---

## Production Deployment

### Backend (Heroku Example)
```bash
cd backend
heroku create medibot-backend
heroku config:set FIREBASE_PROJECT_ID=xxx
heroku config:set OPENAI_API_KEY=xxx
git push heroku main
```

### Mobile App
```bash
cd mobile-app
expo build:android
# Follow prompts to build APK
```

---

## Support Resources

- **Backend README:** `backend/README.md`
- **Mobile README:** `mobile-app/README.md`
- **Setup Guide:** `SETUP_GUIDE.md`
- **Main README:** `README.md`

---

## Development Workflow

1. Start backend: `cd backend && npm run dev`
2. Start mobile app: `cd mobile-app && npm start`
3. Make changes to code
4. Save files (auto-reload in both)
5. Test on phone via Expo Go
6. Commit changes: `git add . && git commit -m "message"`

**Happy coding! 🚀**
