# Groomy Paws - Dog Grooming Platform

A modern, production-ready dog grooming platform built with React, TypeScript, and Supabase. This application enables customers to manage their pets, book appointments, and communicate with staff, while providing admins with comprehensive tools to manage appointments, services, and customers.

## Features

### Customer Features
- **Account Management**: Create account, manage profile, and secure authentication
- **Pet Profiles**: Add multiple pets with detailed information (breed, size, grooming notes)
- **Service Browsing**: View all available grooming services with size-based pricing
- **Appointment Booking**: Multi-step booking process with date/time selection
- **Appointment History**: Track all past and upcoming appointments
- **Payment Management**: View payment status for appointments
- **Messaging**: Communicate with grooming staff (placeholder)

### Admin/Staff Features
- **Dashboard**: Overview of daily appointments, revenue, and customer metrics
- **Appointment Management**: View, filter, and update appointment statuses
- **Service Management**: Create, edit, and manage grooming services and pricing
- **Customer Management**: View all customers and their pet profiles
- **Reports**: Monthly revenue tracking and business insights

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Routing**: React Router v6
- **Backend**: Supabase (PostgreSQL database, Authentication, Row Level Security)
- **Icons**: Lucide React
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (database is already provisioned)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Environment variables are already configured in `.env` file with Supabase connection details.

3. Database schema and sample services are already set up.

### Running the Application

Development mode:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Production Setup (Ubuntu 22.04+)

An automated script (`deploy/setup-production.sh`) provisions a fresh server with the API, MySQL, and nginx reverse proxy:

1. Prepare a config file:
   ```bash
   cp deploy/production.env.example deploy/production.env
   # Edit deploy/production.env with your domain, DB creds, JWT secret, etc.
   ```
2. Copy the repo to your server (example):
   ```bash
   rsync -avz --delete . user@server:/opt/groomy-paws
   ```
3. SSH in and run the setup as root/sudo:
   ```bash
   ssh user@server
   cd /opt/groomy-paws
   sudo ENV_FILE=/opt/groomy-paws/deploy/production.env bash deploy/setup-production.sh
   ```

The script installs Node.js, nginx (and optionally MySQL + certbot), installs project deps, builds the Vite frontend, seeds the MySQL schema, writes production env files, creates a systemd unit (`groomy-paws-api` by default), and configures nginx to serve the SPA while proxying `/api` and `/uploads` to the Express server.

After it finishes:
- `sudo systemctl status groomy-paws-api` (API health)
- `journalctl -u groomy-paws-api -f` (API logs)
- `sudo nginx -t && sudo systemctl reload nginx`
- `sudo -u groomy node server/create-admin.js` to bootstrap an admin account

## Creating Test Accounts

Since the application uses Supabase authentication, you need to create accounts through the UI:

### Create an Admin Account:
1. Go to `/register`
2. Sign up with email and password
3. After registration, manually update the user's role in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
```

### Create a Customer Account:
1. Go to `/register`
2. Sign up with email and password
3. The account will automatically be assigned the 'customer' role

### Pre-populated Data

The database already includes:
- **6 grooming services** (Bath & Brush, Full Groom, Nail Trim, Teeth Cleaning, De-Shedding, Flea & Tick Treatment)
- **Size-based pricing** for main services (small, medium, large, xl)

## Database Structure

### Key Tables

- **users**: Customer, staff, and admin accounts
- **pets**: Pet profiles linked to customers
- **services**: Grooming services with pricing
- **service_prices**: Size-based pricing for services
- **appointments**: Scheduled grooming appointments
- **appointment_services**: Services included in each appointment
- **payments**: Payment tracking for appointments
- **conversations**: Message threads between customers and staff
- **messages**: Individual messages in conversations

### Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:
- Customers can only access their own data
- Staff and admins have broader access based on their roles
- All operations enforce authentication and ownership checks

## Project Structure

```
src/
├── components/
│   ├── DashboardLayout.tsx     # Shared layout for authenticated pages
│   └── ProtectedRoute.tsx      # Route protection wrapper
├── contexts/
│   └── AuthContext.tsx         # Authentication state management
├── lib/
│   └── supabase.ts            # Supabase client and type definitions
├── pages/
│   ├── LandingPage.tsx        # Public homepage
│   ├── LoginPage.tsx          # Login form
│   ├── RegisterPage.tsx       # Registration form
│   ├── customer/
│   │   ├── Dashboard.tsx      # Customer dashboard
│   │   ├── PetsPage.tsx       # Pet management
│   │   ├── BookAppointmentPage.tsx  # Appointment booking flow
│   │   ├── AppointmentsPage.tsx     # Appointment history
│   │   └── ProfilePage.tsx    # Profile settings
│   └── admin/
│       ├── AdminDashboard.tsx        # Admin overview
│       ├── AdminAppointments.tsx     # Appointment management
│       └── AdminServices.tsx         # Service management
├── App.tsx                    # Main app with routing
└── main.tsx                   # Application entry point
```

## Design System

### Colors
- **Primary**: Teal (#0d9488) - Used for CTAs, active states
- **Background**: White and Gray-50
- **Text**: Gray-900 (primary), Gray-600 (secondary)
- **Status Colors**: Green (confirmed), Yellow (pending), Blue (in progress), Red (cancelled)

### Typography
- **Headings**: Bold, Clear hierarchy
- **Body**: Regular weight, good line spacing
- **Font**: System font stack

### Components
- Rounded corners (lg: 0.5rem, 2xl: 1rem)
- Subtle shadows for elevation
- Consistent spacing using Tailwind's spacing scale
- Hover states on interactive elements

## Key Features Implementation

### Authentication Flow
1. Users register with email/password
2. Supabase Auth manages sessions
3. User profile created in `users` table
4. Role-based access control via RLS policies

### Appointment Booking Flow
1. Customer selects a pet
2. Chooses services (main + add-ons)
3. Price calculated based on pet size
4. Selects date and time
5. Confirms booking
6. Appointment and payment records created

### Admin Workflow
1. View dashboard metrics
2. Filter and search appointments
3. Update appointment statuses
4. Manage services and pricing
5. View customer information

## Future Enhancements

- **Stripe Integration**: Complete payment processing
- **Real-time Messaging**: WebSocket-based chat
- **Email Notifications**: Appointment reminders and confirmations
- **Calendar View**: Visual appointment scheduling
- **Photo Upload**: Pet profile pictures
- **Reports**: Advanced analytics and insights
- **Mobile App**: React Native wrapper

## Security Considerations

- All sensitive operations require authentication
- Row Level Security prevents unauthorized data access
- SQL injection protection via Supabase client
- Client-side validation + server-side enforcement
- Secure password storage via Supabase Auth

## Support

For issues or questions, please refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## License

Private - All rights reserved
