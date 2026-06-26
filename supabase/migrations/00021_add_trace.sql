CREATE TABLE IF NOT EXISTS trace_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  span_name TEXT NOT NULL,
  parent_span TEXT DEFAULT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_ms INTEGER,
  status TEXT DEFAULT 'ok' CHECK (status IN ('ok', 'error', 'timeout')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trace_logs_trace_id ON trace_logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_trace_logs_created_at ON trace_logs(created_at DESC);

ALTER TABLE trace_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can insert trace" ON trace_logs
  FOR INSERT WITH CHECK (true);
CREATE POLICY "admin can view all traces" ON trace_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
