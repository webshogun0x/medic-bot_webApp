# MediBot Web Application - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ installed
- Firebase project created
- Groq API key obtained

---

## 📦 Backend Setup

### 1. Navigate to backend directory
```bash
cd medibot-webapp/backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `FIREBASE_PROJECT_ID` - From Firebase Console
- `FIREBASE_CLIENT_EMAIL` - From Firebase Service Account
- `FIREBASE_PRIVATE_KEY` - From Firebase Service Account (keep the \n)
- `FIREBASE_DATABASE_URL` - Your Firebase Realtime Database URL
- `GROQ_API_KEY` - From https://console.groq.com

### 4. Start backend server
```bash
npm start
```

Backend will run on `http://localhost:3000`

---

## 🎨 Frontend Setup

### 1. Navigate to frontend directory
```bash
cd medibot-webapp/web-dashboard
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure API URL (if needed)
Create `.env` file:
```env
REACT_APP_API_URL=http://localhost:3000/api
```

### 4. Start frontend
```bash
npm start
```

Frontend will run on `http://localhost:3001`

---

## ✅ Verify Installation

### Backend Health Check
```bash
curl http://localhost:3000/health
```

Should return:
```json
{"status":"OK","timestamp":1234567890}
```

### Test Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "firstName": "Test",
    "lastName": "User",
    "rfidNumber": "ABC12345"
  }'
```

Should return JWT token and success message.

---

## 🔧 Common Issues

### Issue: "JWT_SECRET environment variable is not set"
**Solution**: Make sure `.env` file exists and has `JWT_SECRET` set

### Issue: "Firebase not initialized"
**Solution**: Check Firebase credentials in `.env` file

### Issue: "CORS error"
**Solution**: Backend and frontend must run on different ports (3000 and 3001)

### Issue: "RFID already registered"
**Solution**: Use a different RFID number or check Firebase database

---

## 📱 Testing the Application

### 1. Register a New User
- Open `http://localhost:3001`
- Click "Sign Up"
- Fill in details with RFID number
- Submit

### 2. Link RFID (if not done during registration)
- Go to Profile page
- RFID field shows current status
- Use backend API to link if needed

### 3. Simulate Health Reading (ESP32 not connected)
Use this curl command to add a reading:
```bash
curl -X POST http://localhost:3000/api/readings/record \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "heartRate": 75,
    "spo2": 98,
    "systolic": 120,
    "diastolic": 80,
    "temperature": 36.5
  }'
```

### 4. View Dashboard
- Refresh dashboard to see new reading
- Check analytics page for trends
- Try AI recommendations

### 5. Test Medications
- Add a medication reminder
- Delete a medication
- Verify success messages appear

---

## 🎯 All Fixed Features

✅ AI responses are clean (no prompt leakage)
✅ RFID validation works
✅ JWT tokens generated on registration
✅ Medications can be deleted
✅ Analytics handles zero readings
✅ Dashboard shows real data
✅ Loading spinners appear
✅ Empty states show helpful messages
✅ Success notifications appear
✅ Error messages are user-friendly
✅ Refresh button works
✅ RFID displays in profile
✅ Consistent date formatting

---

## 📊 Database Structure

### Firebase Realtime Database
```
{
  "USERS": {
    "{uid}": {
      "profile": {
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "rfidNumber": "ABC12345",
        "bloodType": "O+",
        "emergencyContact": "+1234567890",
        "allergies": "None",
        "medicalHistory": "None"
      },
      "medications": {
        "{medId}": {
          "name": "Aspirin",
          "dosage": "500mg",
          "frequency": "Once daily",
          "time": "08:00",
          "active": true
        }
      },
      "recommendations": {},
      "chat-history": {},
      "activity-log": {}
    }
  },
  "READINGS": {
    "{rfidNumber}": {
      "latest": {
        "heartRate": 75,
        "spo2": 98,
        "systolic": 120,
        "diastolic": 80,
        "temperature": 36.5,
        "timestamp": 1234567890
      },
      "history": {
        "{timestamp}": {
          "heartRate": 75,
          "spo2": 98,
          "systolic": 120,
          "diastolic": 80,
          "temperature": 36.5
        }
      }
    }
  },
  "RFID_MAPPING": {
    "{rfidNumber}": {
      "userId": "{uid}",
      "linkedAt": 1234567890
    }
  }
}
```

---

## 🔐 Security Notes

1. **Never commit `.env` file** - It contains secrets
2. **Use strong JWT_SECRET** - Minimum 32 characters
3. **HTTPS in production** - Use SSL certificates
4. **Rate limiting** - Consider adding rate limiting middleware
5. **Input sanitization** - Already implemented for basic fields

---

## 📞 Support

If you encounter issues:
1. Check backend logs: `npm start` output
2. Check browser console: F12 → Console tab
3. Verify environment variables are set correctly
4. Test backend endpoints with curl
5. Check Firebase database rules

---

## 🎉 You're All Set!

The application is now ready to use with all 19 fixes applied. Enjoy your improved MediBot web application!
