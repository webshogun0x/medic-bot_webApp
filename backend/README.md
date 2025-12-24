# MediBot Backend API

Node.js backend for MediBot Health Monitoring System.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

**Firebase Setup:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Copy the values to your `.env` file

**OpenAI Setup:**
1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Add to `.env` as `OPENAI_API_KEY`

### 3. Run Server
```bash
# Development mode (auto-restart)
npm run dev

# Production mode
npm start
```

Server runs on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/link-rfid` - Link RFID to user account

### User Profile
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/medications` - Get medication reminders
- `POST /api/users/medications` - Add medication reminder

### Health Readings
- `GET /api/readings/latest` - Get latest reading
- `GET /api/readings/history?days=7` - Get reading history
- `GET /api/readings/analytics?days=30` - Get analytics

### AI Recommendations
- `POST /api/ai/generate` - Generate AI recommendations
- `GET /api/ai/history` - Get recommendation history

## Authentication
All endpoints except `/api/auth/*` require Bearer token in header:
```
Authorization: Bearer <firebase-id-token>
```
