# MySQL Migration Guide

This guide will help you migrate from Supabase (PostgreSQL) to MySQL.

## Overview

The migration involves:
1. Setting up MySQL database
2. Running the backend API server
3. Updating frontend to use the API instead of Supabase

## Step 1: Set Up MySQL Database

1. Install MySQL (if not already installed)
2. Create the database:
```sql
CREATE DATABASE groomy_paws;
USE groomy_paws;
```

3. Run the schema:
```bash
mysql -u root -p groomy_paws < mysql/schema.sql
```

## Step 2: Set Up Backend API Server

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update `.env` with your MySQL credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=groomy_paws
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

5. Start the server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## Step 3: Update Frontend

The frontend needs to be updated to use the API instead of Supabase. This involves:

1. Remove Supabase dependencies
2. Add API client library (axios or fetch)
3. Update all database calls to use API endpoints
4. Update authentication to use JWT tokens

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users` - Get all users (admin/staff)

### Pets
- `GET /api/pets` - Get user's pets
- `GET /api/pets/:id` - Get single pet
- `POST /api/pets` - Create pet
- `PUT /api/pets/:id` - Update pet
- `DELETE /api/pets/:id` - Delete pet

### Services
- `GET /api/services` - Get all services
- `GET /api/services/:id/prices` - Get service prices
- `POST /api/services` - Create service (admin)
- `PUT /api/services/:id` - Update service (admin)
- `POST /api/services/:id/prices` - Add price (admin)

### Appointments
- `GET /api/appointments` - Get appointments
- `GET /api/appointments/:id` - Get single appointment
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment (admin/staff)

## Key Differences from Supabase

1. **Authentication**: Uses JWT tokens instead of Supabase Auth
2. **Database Access**: All queries go through API, not direct database access
3. **RLS**: Row-level security is handled in application code, not database
4. **UUIDs**: MySQL uses CHAR(36) instead of PostgreSQL UUID type
5. **Timestamps**: Uses DATETIME instead of timestamptz

## Next Steps

1. Update frontend `src/lib/supabase.ts` to use API client
2. Update `src/contexts/AuthContext.tsx` to use JWT authentication
3. Update all components that use Supabase client
4. Test all functionality

