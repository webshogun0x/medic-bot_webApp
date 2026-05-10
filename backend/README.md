# MediBot Backend API

Node.js + Express API for the MediBot health monitoring system.

## Setup

```bash
npm install
npm run dev
```

Runs on `http://localhost:3000`

## Environment Variables

Create `.env` file:
```
FIREBASE_PROJECT_ID=medic-bot-health-monitor
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_DATABASE_URL=...
GROQ_API_KEY=your-groq-api-key
PORT=3000
NODE_ENV=development
```

## Project Structure

```
src/
├── config/
│   └── firebase.js           # Firebase initialization
├── middleware/
│   └── auth.middleware.js    # JWT verification
├── routes/
│   ├── auth.js              # Authentication endpoints
│   ├── users.js             # User profile endpoints
│   ├── readings.js          # Health readings endpoints
│   └── ai-recommendations.js # AI endpoints
├── services/
│   └── ai.service.js        # Groq AI integration
└── server.js                # Express server
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/link-rfid` - Link RFID to user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/medications` - Get medications
- `POST /api/users/medications` - Add medication

### Readings
- `GET /api/readings/latest` - Get latest health reading
- `GET /api/readings/history?days=7` - Get reading history
- `GET /api/readings/analytics?days=30` - Get analytics

### AI Recommendations
- `POST /api/ai/generate` - Generate health recommendations
- `GET /api/ai/history` - Get recommendation history

## Technologies

- Express.js
- Firebase (Auth & Realtime DB)
- Groq AI API
- Node.js

## Development

```bash
npm run dev  # Runs with nodemon for auto-reload
```