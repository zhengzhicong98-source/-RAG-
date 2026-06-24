-- 消息通知系统
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('like', 'save', 'comment', 'system')),
  title text NOT NULL,
  body text,
  related_id text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notif_select ON notifications;
DROP POLICY IF EXISTS notif_update ON notifications;
DROP POLICY IF EXISTS notif_insert ON notifications;
CREATE POLICY notif_select ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY notif_update ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY notif_insert ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 未读通知计数函数
CREATE OR REPLACE FUNCTION get_unread_count(uid uuid) RETURNS bigint
LANGUAGE sql STABLE AS $$
  SELECT count(*) FROM notifications WHERE user_id = uid AND is_read = false;
$$;
