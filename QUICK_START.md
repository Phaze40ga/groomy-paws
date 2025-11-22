# Quick Start - Local MySQL Database

## 1. Set Up Database

Run the schema on your local MySQL database:

```bash
mysql -u root -p your_database_name < mysql/schema.sql
```

Or if you want to create a new database:

```bash
mysql -u root -p
```

Then in MySQL:
```sql
CREATE DATABASE IF NOT EXISTS groomy_paws;
USE groomy_paws;
SOURCE mysql/schema.sql;
```

## 2. Configure Backend

```bash
cd server
npm install
```

Create `server/.env` file:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=groomy_paws
PORT=3001
JWT_SECRET=dev-secret-key-change-in-production
```

Start backend:
```bash
npm run dev
```

## 3. Configure Frontend

Create `.env` file in project root:
```env
VITE_API_URL=http://localhost:3001/api
```

Start frontend:
```bash
npm run dev
```

## That's it! 🎉

Your app should now be running with your local MySQL database.

