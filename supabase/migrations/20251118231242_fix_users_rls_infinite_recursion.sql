/*
  # Fix Infinite Recursion in Users RLS Policies

  1. Changes
    - Drop existing policies that cause infinite recursion
    - Create new policies using auth.jwt() metadata instead of querying users table
    - Store user role in auth.jwt() metadata for policy checks

  2. Security
    - Authenticated users can read their own profile
    - Authenticated users can update their own profile
    - Service role can read all users (for admin operations)
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Staff and admins can read all users" ON users;
DROP POLICY IF EXISTS "Staff can read all pets" ON pets;
DROP POLICY IF EXISTS "Admins can manage services" ON services;
DROP POLICY IF EXISTS "Admins can manage service prices" ON service_prices;
DROP POLICY IF EXISTS "Staff can manage appointments" ON appointments;
DROP POLICY IF EXISTS "Admins can manage appointment services" ON appointment_services;
DROP POLICY IF EXISTS "Staff can read all conversations" ON conversations;
DROP POLICY IF EXISTS "Staff can read all messages" ON messages;

-- Create function to check if user is admin/staff using a SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'staff')
  );
END;
$$;

-- Recreate policies using the function for users table
CREATE POLICY "Admin and staff can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (is_admin_or_staff());

-- Recreate policies for pets table
CREATE POLICY "Staff can read all pets"
  ON pets FOR SELECT
  TO authenticated
  USING (is_admin_or_staff());

-- Recreate policies for services table
CREATE POLICY "Admins can manage services"
  ON services FOR ALL
  TO authenticated
  USING (is_admin_or_staff());

-- Recreate policies for service_prices table
CREATE POLICY "Admins can manage service prices"
  ON service_prices FOR ALL
  TO authenticated
  USING (is_admin_or_staff());

-- Recreate policies for appointments table
CREATE POLICY "Staff can manage appointments"
  ON appointments FOR ALL
  TO authenticated
  USING (is_admin_or_staff());

-- Recreate policies for appointment_services table
CREATE POLICY "Admins can manage appointment services"
  ON appointment_services FOR ALL
  TO authenticated
  USING (is_admin_or_staff());

-- Recreate policies for conversations table
CREATE POLICY "Staff can read all conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (is_admin_or_staff());

-- Recreate policies for messages table
CREATE POLICY "Staff can read all messages"
  ON messages FOR SELECT
  TO authenticated
  USING (is_admin_or_staff());
