-- 00028: AI 回答多维度自动质量评分表
-- 注意：编号 00027 已被 add_prompt_logging 占用，此处顺延为 00028

CREATE TABLE IF NOT EXISTS quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consult_history_id UUID REFERENCES consult_history(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  relevance FLOAT DEFAULT NULL,      -- 回答和问题的相关性 0-1
  accuracy FLOAT DEFAULT NULL,       -- 法条引用准确性 0-1
  completeness FLOAT DEFAULT NULL,   -- 回答完整性 0-1
  helpfulness FLOAT DEFAULT NULL,    -- 对用户的帮助程度 0-1
  overall FLOAT DEFAULT NULL,        -- 综合评分 0-1
  eval_model TEXT DEFAULT 'glm-4-flash',
  raw_response TEXT DEFAULT NULL,    -- AI 评分原始回复
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引：按 consult_history_id / created_at 查询较高频
CREATE INDEX IF NOT EXISTS idx_quality_scores_consult_id ON quality_scores(consult_history_id);
CREATE INDEX IF NOT EXISTS idx_quality_scores_created_at ON quality_scores(created_at DESC);

ALTER TABLE quality_scores ENABLE ROW LEVEL SECURITY;

-- admin 可看全部
DROP POLICY IF EXISTS "admin can view all scores" ON quality_scores;
CREATE POLICY "admin can view all scores" ON quality_scores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 允许写入（前端异步评估回写；后续也可切到 SECURITY DEFINER RPC 进一步收紧）
DROP POLICY IF EXISTS "insert scores" ON quality_scores;
CREATE POLICY "insert scores" ON quality_scores
  FOR INSERT WITH CHECK (true);

-- 质量统计视图
CREATE OR REPLACE VIEW quality_stats AS
SELECT
  COUNT(*) AS total_evaluated,
  ROUND(AVG(relevance)::numeric, 2)     AS avg_relevance,
  ROUND(AVG(accuracy)::numeric, 2)      AS avg_accuracy,
  ROUND(AVG(completeness)::numeric, 2)  AS avg_completeness,
  ROUND(AVG(helpfulness)::numeric, 2)   AS avg_helpfulness,
  ROUND(AVG(overall)::numeric, 2)       AS avg_overall
FROM quality_scores;

-- 授权：视图内部聚合，不含个体 PII，authenticated 均可读
GRANT SELECT ON quality_stats TO authenticated;

COMMENT ON TABLE quality_scores IS 'AI 回答多维度自动质量评分（由 legal-chat evaluate 模式异步产出）';
COMMENT ON VIEW quality_stats IS '质量评分聚合视图（管理员看板）';
