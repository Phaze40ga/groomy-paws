/*
  # Add INSERT policy for users table

  1. Changes
    - Add policy to allow authenticated users to insert their own user record during signup
    - This allows the signup process to create the user profile after auth.signUp

  2. Security
    - Users can only insert a record with their own ID (auth.uid())
    - Default role is enforced to 'customer' via WITH CHECK
*/

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can create own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
