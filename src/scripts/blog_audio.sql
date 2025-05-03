-- Create a table to store blog audio data
CREATE TABLE blog_audio (
  slug TEXT PRIMARY KEY,
  audio_data TEXT NOT NULL,  -- Store audio as base64 encoded string
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policy (Row Level Security) to allow read access
ALTER TABLE blog_audio ENABLE ROW LEVEL SECURITY;

-- Policy to allow read access to everyone
CREATE POLICY "Allow public read access" 
  ON blog_audio 
  FOR SELECT 
  USING (true);
  
-- Policy to allow insert/update only for authenticated users (if needed)
-- Uncomment and modify if you need to restrict write access
-- CREATE POLICY "Allow authenticated users to insert and update" 
--   ON blog_audio 
--   FOR INSERT 
--   WITH CHECK (auth.role() = 'authenticated');
-- 
-- CREATE POLICY "Allow authenticated users to update" 
--   ON blog_audio 
--   FOR UPDATE 
--   USING (auth.role() = 'authenticated');