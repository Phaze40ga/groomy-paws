-- Migration: Add profile pictures support

-- Add profile picture URL to users table
ALTER TABLE users 
ADD COLUMN profile_picture_url TEXT,
ADD COLUMN profile_picture_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Note: pets table already has photo_url column, so no changes needed there

