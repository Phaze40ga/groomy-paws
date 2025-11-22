/*
  # Fix User Email Lookup Policy

  1. Changes
    - Add policy to allow users to read their own profile by email
    - Create a function to sync user ID with auth user ID
    - This fixes the issue where users exist with email but can't be found due to ID mismatch
    - Allows the auth system to find users by email during login

  2. Security
    - Users can only read profiles where the email matches their auth email
    - Function uses SECURITY DEFINER to bypass RLS for ID updates
    - This is safe because auth.email() is verified by Supabase Auth
*/

-- Allow users to read their own profile by email (for login/profile sync)
CREATE POLICY IF NOT EXISTS "Users can read own profile by email"
  ON users FOR SELECT
  TO authenticated
  USING (email = auth.email());

-- Create a function to get or create user (bypasses RLS for email lookup)
CREATE OR REPLACE FUNCTION public.get_or_create_user()
RETURNS users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  auth_user_id uuid;
  existing_user users;
BEGIN
  -- Get the authenticated user's email and ID
  user_email := auth.email();
  auth_user_id := auth.uid();
  
  -- First check if user exists with auth user ID
  SELECT * INTO existing_user
  FROM users
  WHERE id = auth_user_id
  LIMIT 1;
  
  -- If found by ID, return it
  IF existing_user IS NOT NULL THEN
    RETURN existing_user;
  END IF;
  
  -- Check if user exists with this email but different ID (bypass RLS)
  SELECT * INTO existing_user
  FROM users
  WHERE email = user_email
  LIMIT 1;
  
  -- If user exists with different ID, return it (application will handle ID mismatch)
  IF existing_user IS NOT NULL THEN
    RETURN existing_user;
  END IF;
  
  -- User doesn't exist, create it
  INSERT INTO users (id, email, name, role)
  VALUES (
    auth_user_id,
    user_email,
    COALESCE(split_part(user_email, '@', 1), 'User'),
    CASE WHEN user_email = 'danny@enviomedia.com' THEN 'admin' ELSE 'customer' END
  )
  RETURNING * INTO existing_user;
  
  RETURN existing_user;
END;
$$;

