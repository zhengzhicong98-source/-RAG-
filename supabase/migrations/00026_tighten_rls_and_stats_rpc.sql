-- ============================================================
-- 00026_tighten_rls_and_stats_rpc.sql
-- 修复：
-- vuln-0003: case_likes / case_saves SELECT 策略过宽（USING(true) → authenticated）
-- vuln-0004: question_stats UPDATE 越权、legal_knowledge DELETE 越权
-- ============================================================

-- =====================
-- 1. case_likes SELECT 收紧
-- =====================
DROP POLICY IF EXISTS case_likes_select ON case_likes;
CREATE POLICY case_likes_select ON case_likes
  FOR SELECT USING (auth.role() = 'authenticated');

-- =====================
-- 2. case_saves SELECT 收紧
-- =====================
DROP POLICY IF EXISTS case_saves_select ON case_saves;
CREATE POLICY case_saves_select ON case_saves
  FOR SELECT USING (auth.role() = 'authenticated');

-- =====================
-- 3. question_stats UPDATE 收紧：直接 UPDATE 全部禁止
--    仅允许通过下面的 SECURITY DEFINER RPC 递增
-- =====================
DROP POLICY IF EXISTS question_stats_update ON question_stats;
CREATE POLICY question_stats_update ON question_stats
  FOR UPDATE USING (false);

-- INSERT 也收紧：走 RPC，不允许前端直接 INSERT
DROP POLICY IF EXISTS question_stats_insert ON question_stats;
CREATE POLICY question_stats_insert ON question_stats
  FOR INSERT WITH CHECK (false);

-- 原子递增函数：存在则 +1，不存在则插入
CREATE OR REPLACE FUNCTION increment_question_count(
  p_question_text text,
  p_category text,
  p_week_number int,
  p_year int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 必须登录才能调用
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- 输入长度限制，防止滥用
  IF length(p_question_text) = 0 OR length(p_question_text) > 100 THEN
    RAISE EXCEPTION 'invalid question_text length';
  END IF;

  INSERT INTO question_stats (question_text, category, week_number, year, count, updated_at)
  VALUES (p_question_text, p_category, p_week_number, p_year, 1, now())
  ON CONFLICT (question_text, week_number, year)
  DO UPDATE SET count = question_stats.count + 1, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION increment_question_count(text, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_question_count(text, text, int, int) TO authenticated;

-- =====================
-- 4. legal_knowledge DELETE 收紧：仅 admin/moderator
-- =====================
DROP POLICY IF EXISTS lk_delete ON legal_knowledge;
CREATE POLICY lk_delete ON legal_knowledge
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- 同时收紧 INSERT/UPDATE：法律知识库不该任意登录用户写
DROP POLICY IF EXISTS lk_insert ON legal_knowledge;
CREATE POLICY lk_insert ON legal_knowledge
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

DROP POLICY IF EXISTS lk_update ON legal_knowledge;
CREATE POLICY lk_update ON legal_knowledge
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );
