-- Documents table for RAG knowledge base
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  file_size INTEGER,
  indexed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (local development)
CREATE POLICY "Allow all document operations" ON documents
  FOR ALL
  USING (true)
  WITH CHECK (true);
