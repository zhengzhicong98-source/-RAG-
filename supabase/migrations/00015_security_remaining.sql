-- 补充安全策略（第二轮修复）

-- 1. consult_history：补 UPDATE 策略（前端 submitFeedback 需要）
DROP POLICY IF EXISTS consult_history_update ON consult_history;
CREATE POLICY consult_history_update ON consult_history FOR UPDATE USING (auth.uid() = user_id);

-- 2. profiles：收紧 SELECT 为已登录用户（保护 openid 隐私）
DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. rightknowledge_centers：从完全禁用 RLS 改为启用并公开只读
--    (原 DISABLE ROW LEVEL SECURITY 导致 anon key 可直接写)
ALTER TABLE rights_centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rc_select ON rights_centers;
CREATE POLICY rc_select ON rights_centers FOR SELECT USING (true);
-- 写入仅允许 authenticated（管理端通过 Edge Function 写）
DROP POLICY IF EXISTS rc_insert ON rights_centers;
CREATE POLICY rc_insert ON rights_centers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS rc_update ON rights_centers;
CREATE POLICY rc_update ON rights_centers FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS rc_delete ON rights_centers;
CREATE POLICY rc_delete ON rights_centers FOR DELETE USING (auth.role() = 'authenticated');

-- 4. ai_call_logs：补 UPDATE/DELETE 策略（管理员行为）
DROP POLICY IF EXISTS acl_update ON ai_call_logs;
CREATE POLICY acl_update ON ai_call_logs FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS acl_delete ON ai_call_logs;
CREATE POLICY acl_delete ON ai_call_logs FOR DELETE USING (auth.uid() = user_id);

-- 5. lawyers：补 INSERT/UPDATE/DELETE 策略
DROP POLICY IF EXISTS lawyers_insert ON lawyers;
CREATE POLICY lawyers_insert ON lawyers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS lawyers_update ON lawyers;
CREATE POLICY lawyers_update ON lawyers FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS lawyers_delete ON lawyers;
CREATE POLICY lawyers_delete ON lawyers FOR DELETE USING (auth.role() = 'authenticated');
