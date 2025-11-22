-- Migration: Change service_prices from size_category to breed
-- Run this migration to update existing database

-- Drop existing service_prices table and recreate with breed
DROP TABLE IF EXISTS service_prices;

CREATE TABLE IF NOT EXISTS service_prices (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  service_id CHAR(36) NOT NULL,
  breed VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  INDEX idx_service_prices_service (service_id),
  INDEX idx_service_prices_breed (breed),
  UNIQUE KEY unique_service_breed (service_id, breed)
);

