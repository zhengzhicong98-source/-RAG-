-- RAG 评估表：记录每次检索的质量
CREATE TABLE IF NOT EXISTS rag_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consult_history_id UUID REFERENCES consult_history(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  retrieved_doc_ids TEXT[],
  retrieved_doc_titles TEXT[],
  similarity_scores FLOAT[],
  user_feedback SMALLINT DEFAULT NULL CHECK (user_feedback IN (1, -1)),
  ai_self_eval BOOLEAN DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rag_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can insert own rag_eval" ON rag_evaluations
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "users can view own rag_eval" ON rag_evaluations
  FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW rag_accuracy_stats AS
SELECT
  COUNT(*) as total_queries,
  COUNT(CASE WHEN user_feedback = 1 THEN 1 END) as positive_feedback,
  COUNT(CASE WHEN user_feedback = -1 THEN 1 END) as negative_feedback,
  COUNT(CASE WHEN ai_self_eval = TRUE THEN 1 END) as ai_eval_useful,
  ROUND(AVG(similarity_scores[1])::numeric, 3) as avg_top1_similarity,
  ROUND(
    COUNT(CASE WHEN user_feedback = 1 THEN 1 END)::numeric /
    NULLIF(COUNT(CASE WHEN user_feedback IS NOT NULL THEN 1 END), 0) * 100, 1
  ) as satisfaction_rate
FROM rag_evaluations;
