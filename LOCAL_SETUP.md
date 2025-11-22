# Local Development Setup Guide

This guide will help you set up the application with your local MySQL test database.

## Step 1: Prepare Your Local MySQL Database

### Option A: Use Existing Database
If you already have a MySQL database you want to use:

1. Connect to MySQL:
   ```bash
   mysql -u root -p
   ```

2. Create the database (if it doesn't exist):
   ```sql
   CREATE DATABASE IF NOT EXISTS groomy_paws;
   USE groomy_paws;
   ```

3. Run the schema:
   ```bash
   mysql -u root -p groomy_paws < mysql/schema.sql
   ```

### Option B: Create New Test Database
If you want to create a fresh test database:

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS groomy_paws;"

# Run schema
mysql -u root -p groomy_paws < mysql/schema.sql
```

## Step 2: Configure Backend Server

1. Navigate to server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your local MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root                    # Your MySQL username
   DB_PASSWORD=your_password       # Your MySQL password (leave empty if no password)
   DB_NAME=groomy_paws             # Your database name
   PORT=3001
   JWT_SECRET=dev-secret-key-change-in-production
   ```

## Step 3: Start Backend Server

```bash
npm run dev
```

The server should start on `http://localhost:3001`

## Step 4: Configure Frontend

1. Go back to project root:
   ```bash
   cd ..
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env`:
   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

4. Install dependencies (if not already done):
   ```bash
   npm install
   ```

## Step 5: Start Frontend

```bash
npm run dev
```

The frontend should start on `http://localhost:5173` (or similar Vite port)

## Step 6: Test the Setup

1. Open your browser to the frontend URL
2. Try registering a new account
3. Login with your account
4. Test creating a pet and booking an appointment

## Troubleshooting

### Database Connection Issues

If you get connection errors:

1. **Check MySQL is running:**
   ```bash
   # macOS
   brew services list | grep mysql
   
   # Linux
   sudo systemctl status mysql
   ```

2. **Test connection manually:**
   ```bash
   mysql -u root -p -e "SHOW DATABASES;"
   ```

3. **Verify database exists:**
   ```bash
   mysql -u root -p -e "SHOW DATABASES LIKE 'groomy_paws';"
   ```

4. **Check table creation:**
   ```bash
   mysql -u root -p groomy_paws -e "SHOW TABLES;"
   ```

### Port Already in Use

If port 3001 is already in use:

1. Change `PORT` in `server/.env` to another port (e.g., `3002`)
2. Update `VITE_API_URL` in frontend `.env` to match

### CORS Issues

If you see CORS errors, make sure:
- Backend server is running
- Frontend `.env` has the correct `VITE_API_URL`
- Both are running on localhost

## Quick Start Commands

```bash
# Terminal 1 - Backend
cd server
npm install
cp .env.example .env
# Edit .env with your MySQL credentials
npm run dev

# Terminal 2 - Frontend  
npm install
cp .env.example .env
# Edit .env - set VITE_API_URL=http://localhost:3001/api
npm run dev
```

## Database Schema Verification

After running the schema, verify tables were created:

```sql
USE groomy_paws;
SHOW TABLES;

-- Should show:
-- users
-- pets
-- services
-- service_prices
-- appointments
-- appointment_services
-- payments
-- conversations
-- messages
```

## Next Steps

Once local development is working:
1. Test all features thoroughly
2. When ready for production, update `.env` files with production credentials
3. Deploy backend server to your hosting provider
4. Update frontend `VITE_API_URL` to point to production API

