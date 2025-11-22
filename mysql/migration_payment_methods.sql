ALTER TABLE payments
  ADD COLUMN payment_method ENUM('card', 'cash', 'cash_app', 'other') NOT NULL DEFAULT 'card',
  ADD COLUMN payment_reference VARCHAR(255);

