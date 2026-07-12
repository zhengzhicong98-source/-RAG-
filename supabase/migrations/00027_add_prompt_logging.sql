-- 00027: 为 ai_call_logs 添加完整 prompt / response 记录
-- 注意：编号顺延 —— 00026 已被 tighten_rls_and_stats_rpc 占用

-- 1. 添加完整输入输出字段
ALTER TABLE ai_call_logs
ADD COLUMN IF NOT EXISTS prompt_text TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS response_text TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS system_prompt_hash TEXT DEFAULT NULL;

-- 2. 创建脱敏视图：普通用户看不到完整文本，只有 admin 能看到
--    普通用户的 SELECT 策略已经只能看自己的（基于原 RLS）
--    这里通过视图对完整文本做二次脱敏，防止误将 prompt_text 展示给普通用户
CREATE OR REPLACE VIEW ai_call_logs_safe AS
SELECT
  id, user_id, function_name, model,
  prompt_length, response_length, token_estimate,
  response_time_ms, rag_used, rag_hit_count,
  success, error_message, created_at,
  -- 普通用户看不到完整文本，只看到长度
  CASE
    WHEN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    THEN prompt_text
    ELSE NULL
  END AS prompt_text,
  CASE
    WHEN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    THEN response_text
    ELSE NULL
  END AS response_text
FROM ai_call_logs;

-- 3. 授权：让 authenticated 角色可以读视图（视图内部已按 role 分级）
GRANT SELECT ON ai_call_logs_safe TO authenticated;

COMMENT ON COLUMN ai_call_logs.prompt_text IS '完整用户提问原文（仅 admin 通过 ai_call_logs_safe 视图可见）';
COMMENT ON COLUMN ai_call_logs.response_text IS '完整 AI 回答原文（仅 admin 通过 ai_call_logs_safe 视图可见）';
COMMENT ON COLUMN ai_call_logs.system_prompt_hash IS '系统 prompt 的 hash，用于版本追溯';
COMMENT ON VIEW ai_call_logs_safe IS '脱敏视图：普通用户看不到 prompt_text/response_text 的完整文本';
