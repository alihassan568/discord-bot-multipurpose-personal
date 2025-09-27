-- Initialize Discord Bot Database
-- This script sets up the initial database configuration

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better performance
-- These will be created after Prisma migrations, but included here for reference

-- Performance indexes that Prisma might not create automatically
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moderation_logs_guild_created 
--   ON moderation_logs(guild_id, created_at DESC);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moderation_logs_target 
--   ON moderation_logs(target_id, created_at DESC);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_guild_status 
--   ON tickets(guild_id, status);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_guild_xp 
--   ON user_profiles(guild_id, xp DESC);

-- Set up initial configuration
DO $$
BEGIN
    -- Log the database initialization
    RAISE NOTICE 'Discord Bot database initialized successfully';
END $$;