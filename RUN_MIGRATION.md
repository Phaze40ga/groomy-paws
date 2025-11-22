# Database Migration: Size to Breed Pricing

## Important: Run This Migration

The database needs to be updated from size-based pricing to breed-based pricing.

## Option 1: Safe Migration (Recommended)

This preserves existing data:

```bash
mysql -u root -p groomy_paws < mysql/migration_breed_pricing_safe.sql
```

This will:
1. Add a new `breed` column
2. Migrate existing size data to breed format
3. Remove the old `size_category` column
4. Add proper indexes

## Option 2: Fresh Start (If no important data)

If you don't have important pricing data:

```bash
mysql -u root -p groomy_paws < mysql/migration_breed_pricing.sql
```

This drops and recreates the table.

## Verify Migration

After running the migration, verify it worked:

```bash
mysql -u root -p groomy_paws -e "DESCRIBE service_prices;"
```

You should see `breed VARCHAR(255)` instead of `size_category ENUM(...)`.

## After Migration

1. Restart your backend server
2. Test creating a service with breed prices
3. Test booking an appointment

The backend has fallback code to handle both old and new schemas during migration, but you should run the migration for full functionality.

