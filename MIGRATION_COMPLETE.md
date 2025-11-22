# MySQL Migration Complete! 🎉

The application has been successfully migrated from Supabase (PostgreSQL) to MySQL.

## What Changed

### Backend
- ✅ Created Express.js API server (`server/`)
- ✅ MySQL database schema (`mysql/schema.sql`)
- ✅ JWT authentication system
- ✅ REST API endpoints for all resources
- ✅ Role-based access control

### Frontend
- ✅ Removed Supabase dependencies
- ✅ Created API client (`src/lib/api.ts`)
- ✅ Updated AuthContext to use JWT tokens
- ✅ Updated all components to use API endpoints
- ✅ Removed session dependency

## Setup Instructions

### 1. Database Setup
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE groomy_paws;
USE groomy_paws;

# Run schema
mysql -u root -p groomy_paws < mysql/schema.sql
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MySQL credentials
npm run dev
```

### 3. Frontend Setup
```bash
# Install dependencies (Supabase removed)
npm install

# Create .env file
cp .env.example .env
# Edit .env - set VITE_API_URL=http://localhost:3001/api

# Start frontend
npm run dev
```

## Environment Variables

### Backend (`server/.env`)
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=groomy_paws
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:3001/api
```

## API Endpoints

All endpoints are prefixed with `/api`:

- **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- **Users**: `/api/users/profile`, `/api/users` (admin)
- **Pets**: `/api/pets` (GET, POST, PUT, DELETE)
- **Services**: `/api/services` (GET, POST, PUT)
- **Appointments**: `/api/appointments` (GET, POST, PUT)

## Key Differences

1. **Authentication**: JWT tokens instead of Supabase Auth
2. **Database**: MySQL instead of PostgreSQL
3. **API**: All database operations go through REST API
4. **Security**: Application-level security instead of RLS

## Testing

1. Start backend: `cd server && npm run dev`
2. Start frontend: `npm run dev`
3. Register a new account or login
4. Test all features

## Notes

- The backend server must be running for the frontend to work
- JWT tokens are stored in localStorage
- All API calls include authentication headers automatically
- Admin endpoints require admin role in JWT token

