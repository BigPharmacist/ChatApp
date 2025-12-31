-- Create chats table for storing chat sessions
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for local development
CREATE POLICY "Allow all access on chats" ON chats
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add chat_id column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS chat_id UUID REFERENCES chats(id) ON DELETE CASCADE;

-- Create index for faster queries by chat
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);

-- Migrate existing messages to a default chat (if any exist)
DO $$
DECLARE
  default_chat_id UUID;
  has_messages BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM messages WHERE chat_id IS NULL) INTO has_messages;

  IF has_messages THEN
    INSERT INTO chats (title) VALUES ('Alter Chat') RETURNING id INTO default_chat_id;
    UPDATE messages SET chat_id = default_chat_id WHERE chat_id IS NULL;
  END IF;
END $$;

-- Make chat_id NOT NULL after migration
ALTER TABLE messages ALTER COLUMN chat_id SET NOT NULL;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at on chats
DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update chat's updated_at when messages are added
CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats SET updated_at = NOW() WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_chat_on_message ON messages;
CREATE TRIGGER update_chat_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_updated_at();
