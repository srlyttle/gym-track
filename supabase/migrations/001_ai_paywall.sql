-- AI Paywall Schema
-- Run this in your Supabase SQL editor or via: supabase db push
--
-- After running, deploy the edge function:
--   supabase functions deploy ai-suggest
--   supabase secrets set CLAUDE_API_KEY=sk-ant-YOUR_KEY_HERE
--
-- To manually grant a user Pro access (until payment integration is wired):
--   INSERT INTO subscriptions (device_id, plan, status)
--   VALUES ('device-uuid-here', 'pro', 'active')
--   ON CONFLICT (device_id) DO UPDATE SET plan = 'pro', status = 'active';

-- Monthly AI usage tracker (one row per device per month)
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  month TEXT NOT NULL,             -- format: 'YYYY-MM'
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (device_id, month)
);

-- Subscription status per device
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',      -- 'free' | 'pro'
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'cancelled' | 'expired'
  expires_at TIMESTAMPTZ,                 -- NULL = no expiry (lifetime/manual)
  payment_reference TEXT,                 -- Stripe session ID or similar
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_device_month ON ai_usage (device_id, month);
CREATE INDEX IF NOT EXISTS idx_subscriptions_device_id ON subscriptions (device_id);

-- RPC function to atomically upsert + increment usage count
CREATE OR REPLACE FUNCTION increment_ai_usage(p_device_id TEXT, p_month TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO ai_usage (device_id, month, count, updated_at)
  VALUES (p_device_id, p_month, 1, NOW())
  ON CONFLICT (device_id, month)
  DO UPDATE SET
    count = ai_usage.count + 1,
    updated_at = NOW();
END;
$$;

-- RLS policies (edge function uses service role key and bypasses RLS,
-- but enable RLS for security if you add direct client access later)
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
