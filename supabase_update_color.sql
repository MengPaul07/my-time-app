-- Add color column to courses table
alter table courses add column if not exists color text;

-- Add color column to tasks table (if you decide to sync tasks to Supabase later, currently tasks are local AsyncStorage)
-- alter table tasks add column if not exists color text;
