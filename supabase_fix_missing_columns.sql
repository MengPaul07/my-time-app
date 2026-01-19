-- 在 Supabase SQL Editor 中运行此脚本以修复数据库结构

-- 添加 is_deadline 字段 (用于截止日期类型任务)
alter table tasks 
add column if not exists is_deadline boolean default false;

-- 添加 location 字段 (部分任务可能有地点)
alter table tasks 
add column if not exists location text;

-- 确保 start_time 存在 (之前的脚本可能漏掉)
alter table tasks 
add column if not exists start_time timestamp with time zone;

-- 确保 color 存在
alter table tasks 
add column if not exists color text;
