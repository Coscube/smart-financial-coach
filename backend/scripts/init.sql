-- Initialize database schema and seed data
-- This runs automatically when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE financial_coach TO postgres;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialized successfully!';
END $$;
