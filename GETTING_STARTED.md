# Getting Started with Groomy Paws

## Quick Start

1. **Install Dependencies** (if not already installed):
   ```bash
   npm install --include=dev
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Access the Application**:
   Open your browser to `http://localhost:5173`

## Creating Test Accounts

### Method 1: Register Through UI

1. Navigate to `/register`
2. Fill out the registration form
3. Your account will be created with the `customer` role by default

### Method 2: Create Admin Account

To create an admin account:

1. First, register normally through the UI
2. Then, update the user role in the database using Supabase:

```sql
-- Replace with your actual email
UPDATE users
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### Method 3: Create Staff Account

Similar to admin:

```sql
-- Replace with your actual email
UPDATE users
SET role = 'staff'
WHERE email = 'staff-email@example.com';
```

## Pre-populated Data

The application comes with:

- **6 Grooming Services**:
  - Bath & Brush ($45 base, 60 min)
  - Full Groom ($75 base, 90 min)
  - Nail Trim ($15, 15 min)
  - Teeth Cleaning ($35, 30 min)
  - De-Shedding Treatment ($30, 45 min) - Add-on
  - Flea & Tick Treatment ($25, 20 min) - Add-on

- **Size-based Pricing**:
  - Small: 80% of base price
  - Medium: 100% of base price (base)
  - Large: 130% of base price
  - XL: 160% of base price

## Testing the Application

### As a Customer:

1. **Register** a new customer account
2. **Add a Pet**:
   - Navigate to "My Pets"
   - Click "Add Pet"
   - Fill in details (name, breed, size, etc.)

3. **Book an Appointment**:
   - Click "Book Appointment"
   - Select your pet
   - Choose services
   - Pick a date and time
   - Confirm booking

4. **View Appointments**:
   - Navigate to "Appointments"
   - See upcoming and past appointments
   - View appointment details

5. **Update Profile**:
   - Navigate to "Profile"
   - Update your information

### As an Admin/Staff:

1. **Create an admin account** (see above)
2. **Sign in** with admin credentials
3. **View Dashboard**:
   - See today's appointments
   - View weekly bookings
   - Check monthly revenue
   - See customer count

4. **Manage Appointments**:
   - Navigate to "Appointments"
   - Filter by status
   - Search for specific appointments
   - Update appointment statuses (pending → confirmed → in_progress → completed)

5. **Manage Services**:
   - Navigate to "Services"
   - Add new services
   - Edit existing services
   - Set pricing and duration

## Key User Flows

### Booking Flow (Customer):
```
1. Login → 2. Add Pet → 3. Book Appointment
→ 4. Select Pet → 5. Choose Services → 6. Pick Date/Time
→ 7. Confirm → 8. View Appointments
```

### Appointment Management (Admin):
```
1. Login → 2. View Dashboard → 3. Go to Appointments
→ 4. Find Appointment → 5. Update Status → 6. View Updated List
```

### Service Management (Admin):
```
1. Login → 2. Go to Services → 3. Add/Edit Service
→ 4. Set Price & Duration → 5. Save → 6. Service Available for Booking
```

## Application Structure

```
Customer Area:
- Dashboard: Overview with quick actions
- My Pets: Pet profile management
- Book Appointment: Multi-step booking wizard
- Appointments: View all appointments
- Profile: Account settings
- Payments: Payment history (placeholder)
- Messages: Customer support chat (placeholder)

Admin/Staff Area:
- Dashboard: Business metrics and overview
- Appointments: Full appointment management
- Customers: Customer list (placeholder)
- Services: Service and pricing management
- Messages: Admin chat interface (placeholder)
```

## Troubleshooting

### Can't Sign In
- Ensure you've registered an account first
- Check that email and password are correct
- Verify Supabase environment variables are set

### Can't Book Appointment
- Ensure you have at least one pet added
- Check that services are active in the database
- Verify you're selecting a future date

### Admin Panel Not Accessible
- Verify your user role is set to 'admin' or 'staff' in the database
- Sign out and sign back in after role change

### Build Errors
- Run `npm install --include=dev` to ensure all dependencies are installed
- Clear node_modules and reinstall if issues persist
- Check that all environment variables are set

## Environment Variables

Ensure your `.env` file contains:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

These should already be configured if you're using the provided setup.

## Next Steps

After testing the core features:

1. **Stripe Integration**: Add real payment processing
2. **Real-time Messaging**: Implement WebSocket-based chat
3. **Email Notifications**: Send appointment reminders
4. **Calendar View**: Visual appointment scheduling
5. **Reports**: Add more detailed analytics
6. **Mobile App**: Wrap in React Native/Capacitor

## Support

For technical issues:
- Check the console for error messages
- Verify database connections
- Review Supabase logs
- Check browser network tab for API errors

Enjoy using Groomy Paws!
