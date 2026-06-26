-- 在 profiles 表新增角色字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
  CHECK (role IN ('user', 'admin', 'moderator'));

CREATE OR REPLACE VIEW user_roles AS
SELECT id, role, created_at FROM profiles;

-- 管理员专属 RLS 策略
CREATE POLICY "admin can view all logs" ON ai_call_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "moderator can delete any post" ON case_posts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "admin can view all rag_eval" ON rag_evaluations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
