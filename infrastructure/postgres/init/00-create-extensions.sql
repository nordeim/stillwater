-- Stillwater — PostgreSQL init script
-- D18: Required extensions for Drizzle ORM schema
-- This script runs once on first container creation (docker-entrypoint-initdb.d)

-- uuid-ossp: provides uuid_generate_v4() for Drizzle's .defaultRandom()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pgcrypto: provides gen_random_uuid() (alternative UUID generator)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Verify extensions installed
\echo 'Extensions created: uuid-ossp, pgcrypto'
