-- ============================================================
-- 00029_revert_00026_rls.sql
-- 回退 00026 的 RLS 收紧，恢复到 c2fff8b 之前的状态
-- ============================================================

-- =====================
-- 1. case_likes SELECT 恢复
-- =====================
DROP POLICY IF EXISTS case_likes_select ON case_likes;
CREATE POLICY case_likes_select ON case_likes
  FOR SELECT USING (true);

-- =====================
-- 2. case_saves SELECT 恢复
-- =====================
DROP POLICY IF EXISTS case_saves_select ON case_saves;
CREATE POLICY case_saves_select ON case_saves
  FOR SELECT USING (true);

-- =====================
-- 3. question_stats UPDATE/INSERT 恢复（允许前端直接写）
-- =====================
DROP POLICY IF EXISTS question_stats_update ON question_stats;
DROP POLICY IF EXISTS question_stats_insert ON question_stats;

CREATE POLICY question_stats_update ON question_stats
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY question_stats_insert ON question_stats
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 保留 increment_question_count RPC（前端 recordQuestion 在调用它）
-- 但如果前端也走直接 INSERT，两条路都能通

-- =====================
-- 4. legal_knowledge 恢复为 authenticated 可写
-- =====================
DROP POLICY IF EXISTS lk_delete ON legal_knowledge;
DROP POLICY IF EXISTS lk_insert ON legal_knowledge;
DROP POLICY IF EXISTS lk_update ON legal_knowledge;

CREATE POLICY lk_delete ON legal_knowledge
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY lk_insert ON legal_knowledge
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY lk_update ON legal_knowledge
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
