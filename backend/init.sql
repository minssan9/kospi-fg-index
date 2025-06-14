-- Initialize KOSPI Fear & Greed Index Database
-- This script runs when MySQL container starts for the first time

CREATE DATABASE IF NOT EXISTS kospi_fg_index;
USE kospi_fg_index;

-- Grant privileges to user
GRANT ALL PRIVILEGES ON kospi_fg_index.* TO 'kospi_user'@'%';
FLUSH PRIVILEGES;

-- The Prisma schema will create the actual tables
-- This is just for initial database setup 