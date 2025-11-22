# Demo Accounts for Groomy Paws

## Your Admin Account (Already Set Up)

**Admin Account:**
- **Email:** `danny@enviomedia.com`
- **Password:** (your existing password)
- **Role:** Admin (already configured)
- **Access:** Full admin dashboard

Try logging in now - your account has been set up with admin privileges!

---

## Create a Customer Account for Testing

To test the customer experience, register a new account:

### Customer Demo Account
Visit the **Register** page and create:
- **Email:** `customer@groomypaws.com`
- **Password:** `Demo123!`
- **Name:** `Sarah Customer`
- **Phone:** `555-987-6543`
- **Address:** `456 Customer Avenue`

This will give you a customer account to test booking appointments.

---

## What's Already Set Up

### Pre-Loaded Services
The database has 6 grooming services ready:

**Main Services:**
1. **Full Grooming** (90 min)
   - Small: $45
   - Medium: $65
   - Large: $85
   - XL: $110

2. **Bath & Brush** (45 min)
   - Small: $30
   - Medium: $40
   - Large: $50
   - XL: $65

**Add-On Services:**
- Nail Trim: $15 (15 min)
- Teeth Cleaning: $25 (20 min)
- De-Shedding Treatment: $30 (30 min)
- Ear Cleaning: $10 (10 min)

---

## Testing Workflow

### As Admin (danny@enviomedia.com):
1. ✅ Login with your credentials
2. ✅ View admin dashboard with statistics
3. ✅ Manage all appointments
4. ✅ Update appointment statuses
5. ✅ Manage services and pricing

### As Customer:
1. Register the customer account (see above)
2. Add a pet in "My Pets"
3. Book an appointment in "Book Appointment"
4. Select services and date/time
5. View your appointments

### Test Admin Features:
- **Dashboard:** See booking statistics and revenue
- **Appointments:** View and manage all customer appointments
- **Services:** Add/edit services and pricing
- **Customers:** View customer list (coming soon)

---

## Quick Admin Commands

If you need to change user roles later:

```sql
-- Make any user an admin
UPDATE users SET role = 'admin' WHERE email = 'email@example.com';

-- Make a user staff
UPDATE users SET role = 'staff' WHERE email = 'email@example.com';

-- Make a user a customer
UPDATE users SET role = 'customer' WHERE email = 'email@example.com';
```

---

## Troubleshooting

**"Invalid email or password" error:**
- Your admin account is now set up, try logging in again
- For new accounts, you must register first on the `/register` page

**Admin dashboard not showing:**
- Sign out and sign back in after role changes
- Clear browser cache if needed

**Can't book appointments:**
- Make sure you're logged in as a customer
- You need to add a pet first before booking

---

Enjoy testing Groomy Paws! 🐾

Your admin account is ready to use right now!
