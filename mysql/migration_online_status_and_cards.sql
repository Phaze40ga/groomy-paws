-- Migration: Add online status and saved cards support

-- Add online status tracking to users table
ALTER TABLE users 
ADD COLUMN last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN is_online BOOLEAN DEFAULT FALSE,
ADD INDEX idx_users_online (is_online);

-- Create saved_cards table for storing payment methods
CREATE TABLE IF NOT EXISTS saved_cards (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  card_last4 VARCHAR(4) NOT NULL,
  card_brand VARCHAR(50) NOT NULL,
  card_exp_month INT NOT NULL,
  card_exp_year INT NOT NULL,
  stripe_payment_method_id VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_saved_cards_user (user_id),
  INDEX idx_saved_cards_default (user_id, is_default)
);

