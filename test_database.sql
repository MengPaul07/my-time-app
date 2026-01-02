-- 🛠️ 数据库测试脚本
-- 此脚本将尝试为 auth.users 表中的第一个用户插入测试数据。
-- 请确保你至少已经注册了一个用户。

DO $$
DECLARE
  v_user_id uuid;
  v_task_id bigint;
BEGIN
  -- 1. 获取第一个用户 ID
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ 未找到用户！请先在 App 中注册一个用户，然后再运行此脚本。';
  END IF;

  RAISE NOTICE '👤 正在为用户 % 生成测试数据...', v_user_id;

  -- 2. 插入测试任务
  INSERT INTO tasks (user_id, title, description, status, estimated_duration, start_time, color)
  VALUES (v_user_id, '测试任务 1', '这是一个由 SQL 脚本生成的测试任务', 'pending', 3600, now() + interval '1 day', '#0a7ea4')
  RETURNING id INTO v_task_id;

  RAISE NOTICE '✅ 任务已创建，ID: %', v_task_id;

  -- 3. 插入测试课程
  INSERT INTO courses (user_id, name, location, day_of_week, start_time, end_time, color)
  VALUES (v_user_id, '高等数学', '东区一教 101', 1, '08:00', '09:35', '#e74c3c');

  RAISE NOTICE '✅ 课程已创建';

  -- 4. 插入学习日志 (关联到任务)
  INSERT INTO study_logs (user_id, duration, task_id)
  VALUES (v_user_id, 1500, v_task_id);

  RAISE NOTICE '✅ 学习日志已创建 (时长 25分钟)';

END $$;

-- 5. 查询验证结果
-- 检查任务是否创建，且 actual_duration 是否因触发器自动更新为 1500
SELECT id, title, estimated_duration, actual_duration, status FROM tasks WHERE title = '测试任务 1';

-- 检查排行榜视图是否有数据
SELECT * FROM daily_leaderboard;

-- 检查课程
SELECT * FROM courses WHERE name = '高等数学';
