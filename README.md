# MediBot Health Monitoring System

A comprehensive health monitoring system with ESP32 hardware integration, Node.js backend, and React web dashboard.

## Project Structure

```
medibot-mobile-system/
├── backend/              # Node.js Express API
│   ├── src/
│   │   ├── config/      # Firebase configuration
│   │   ├── middleware/  # Authentication middleware
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic (AI, etc.)
│   │   └── server.js    # Express server
│   ├── .env             # Environment variables
│   └── package.json
│
└── web-dashboard/       # React + Tailwind web app
    ├── src/
    │   ├── services/    # API client
    │   ├── Dashboard.tsx # Main dashboard component
    │   └── App.tsx
    ├── .env             # Environment variables
    └── package.json
```

## Quick Start

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:3000`

### Web Dashboard Setup

```bash
cd web-dashboard
npm install
npm start
```

Web app runs on `http://localhost:3001`

## Environment Variables

### Backend (.env)
```
FIREBASE_PROJECT_ID=medic-bot-health-monitor
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_DATABASE_URL=...
GROQ_API_KEY=your-groq-api-key
PORT=3000
NODE_ENV=development
```

### Web Dashboard (.env)
```
PORT=3001
REACT_APP_API_URL=http://localhost:3000/api
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

## Features

✅ Real-time health monitoring
✅ AI-powered health recommendations (Groq)
✅ Firebase real-time database
✅ Responsive web dashboard
✅ Health analytics and trends
✅ Medication reminders
✅ User authentication

## Tech Stack

**Backend:**
- Node.js + Express
- Firebase (Auth & Realtime DB)
- Groq AI API

**Frontend:**
- React + TypeScript
- Tailwind CSS
- Recharts (data visualization)
- Lucide React (icons)
- Axios (HTTP client)

## Development

Both services run in development mode with hot reload:

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Web Dashboard
cd web-dashboard && npm start
```

Access the dashboard at `http://localhost:3001`