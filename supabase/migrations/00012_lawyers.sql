-- 律师信息表
CREATE TABLE IF NOT EXISTS lawyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text,
  firm text,
  specialties text[] DEFAULT '{}',
  city text,
  phone text,
  description text,
  avatar_url text,
  consultation_fee int DEFAULT 0,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lawyers_specialties ON lawyers USING gin(specialties);
CREATE INDEX IF NOT EXISTS idx_lawyers_city ON lawyers(city);

ALTER TABLE lawyers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lawyers_select ON lawyers;
CREATE POLICY lawyers_select ON lawyers FOR SELECT USING (true);
