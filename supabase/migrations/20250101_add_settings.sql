-- Settings Tabelle für globale Einstellungen (z.B. System-Prompt)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger für automatisches updated_at
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON settings FOR ALL USING (true) WITH CHECK (true);

-- Default System-Prompt einfügen
INSERT INTO settings (key, value) VALUES ('system_prompt', 'Du bist ein hilfreicher Assistent.');
