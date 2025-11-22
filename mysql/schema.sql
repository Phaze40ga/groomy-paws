/*
  # Groomy Paws MySQL Database Schema
  
  Converted from PostgreSQL to MySQL
  
  Key Changes:
  - UUIDs converted to CHAR(36) with UUID() function
  - timestamptz converted to DATETIME
  - RLS removed (will be handled in application layer)
  - PostgreSQL-specific functions converted to MySQL equivalents
*/

-- Create database (run this separately if needed)
-- CREATE DATABASE IF NOT EXISTS groomy_paws;
-- USE groomy_paws;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  role ENUM('customer', 'staff', 'admin') NOT NULL DEFAULT 'customer',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
);

-- Create pets table
CREATE TABLE IF NOT EXISTS pets (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  owner_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  breed VARCHAR(255),
  size_category ENUM('small', 'medium', 'large', 'xl'),
  age INT,
  weight DECIMAL(5,2),
  temperament_notes TEXT,
  grooming_notes TEXT,
  photo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_pets_owner (owner_id)
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  duration_minutes INT NOT NULL DEFAULT 60,
  is_addon BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_services_active (is_active)
);

-- Create service_prices table
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

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  customer_id CHAR(36) NOT NULL,
  pet_id CHAR(36) NOT NULL,
  scheduled_at DATETIME NOT NULL,
  status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  duration_minutes INT NOT NULL DEFAULT 60,
  internal_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  INDEX idx_appointments_customer (customer_id),
  INDEX idx_appointments_scheduled (scheduled_at),
  INDEX idx_appointments_status (status)
);

-- Create appointment_services table
CREATE TABLE IF NOT EXISTS appointment_services (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  appointment_id CHAR(36) NOT NULL,
  service_id CHAR(36) NOT NULL,
  price_at_booking DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  INDEX idx_appointment_services_appointment (appointment_id)
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  appointment_id CHAR(36) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('unpaid', 'paid', 'refunded') NOT NULL DEFAULT 'unpaid',
  stripe_payment_intent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  INDEX idx_payments_appointment (appointment_id)
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  customer_id CHAR(36) NOT NULL,
  last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_conversations_customer (customer_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  conversation_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_messages_conversation (conversation_id)
);

