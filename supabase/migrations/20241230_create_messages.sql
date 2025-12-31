-- Create messages table for storing chat history
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  model TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Enable Row Level Security (optional, for future auth)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for local development
CREATE POLICY "Allow all access" ON messages
  FOR ALL
  USING (true)
  WITH CHECK (true);
