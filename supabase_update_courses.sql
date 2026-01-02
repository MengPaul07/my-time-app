-- Add color column to courses table
alter table courses add column if not exists color text;
