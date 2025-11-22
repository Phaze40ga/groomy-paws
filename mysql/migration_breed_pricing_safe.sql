-- Safe Migration: Change service_prices from size_category to breed
-- This preserves existing data by migrating it first

-- Step 1: Add new breed column
ALTER TABLE service_prices ADD COLUMN breed VARCHAR(255) NULL AFTER size_category;

-- Step 2: Migrate existing data (map sizes to a default breed or set to 'Standard')
-- For now, we'll set them to 'Standard' - you can update manually if needed
UPDATE service_prices SET breed = CONCAT('Size: ', size_category) WHERE breed IS NULL;

-- Step 3: Make breed NOT NULL after migration
ALTER TABLE service_prices MODIFY COLUMN breed VARCHAR(255) NOT NULL;

-- Step 4: Drop old size_category column
ALTER TABLE service_prices DROP COLUMN size_category;

-- Step 5: Add indexes and constraints
ALTER TABLE service_prices ADD INDEX idx_service_prices_breed (breed);
ALTER TABLE service_prices ADD UNIQUE KEY unique_service_breed (service_id, breed);

