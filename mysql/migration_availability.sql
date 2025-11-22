-- Migration: Add availability table for admin/staff scheduling
-- This allows admins to set their available hours for each day of the week

CREATE TABLE IF NOT EXISTS availability (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  day_of_week TINYINT NOT NULL COMMENT '0 = Sunday, 1 = Monday, ..., 6 = Saturday',
  start_time TIME NOT NULL DEFAULT '09:00:00',
  end_time TIME NOT NULL DEFAULT '17:00:00',
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_day (user_id, day_of_week),
  INDEX idx_availability_user (user_id),
  INDEX idx_availability_day (day_of_week)
);

