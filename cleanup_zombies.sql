-- 1. 删除所有没有归属(user_id 为 NULL)的“僵尸”数据
-- 这些数据可能是之前的代码产生的，导致当前登录用户没有权限删除它们
DELETE FROM tasks WHERE user_id IS NULL;
DELETE FROM courses WHERE user_id IS NULL;

-- 2. (可选) 如果你想暴力清空所有数据（不管是谁的），可以运行下面这两行：
-- DELETE FROM tasks;
-- DELETE FROM courses;
