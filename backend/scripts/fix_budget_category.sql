-- Fix Budget category column type from ENUM to VARCHAR
-- This script converts the category column in the budgets table from ENUM to VARCHAR

BEGIN;

-- Drop the foreign key constraints if they exist
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_user_id_fkey;

-- Create a temporary column to hold the string values
ALTER TABLE budgets ADD COLUMN category_temp VARCHAR(100);

-- Copy data from enum column to string column (cast enum to text)
UPDATE budgets SET category_temp = category::text;

-- Drop the old enum column
ALTER TABLE budgets DROP COLUMN category;

-- Rename the temporary column to category
ALTER TABLE budgets RENAME COLUMN category_temp TO category;

-- Add back the foreign key constraint
ALTER TABLE budgets ADD CONSTRAINT budgets_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Drop the enum type if it exists and is no longer used
DROP TYPE IF EXISTS budgetcategory CASCADE;

COMMIT;
