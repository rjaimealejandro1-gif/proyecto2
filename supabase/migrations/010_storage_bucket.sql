-- Migration 010: Create storage bucket for file uploads

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES ('entregas', 'entregas', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for public access to entregas bucket (drop first if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_policy WHERE polname = 'Public Access to Entregas') THEN
    CREATE POLICY "Public Access to Entregas"
    ON storage.objects
    FOR ALL
    USING (bucket_id = 'entregas')
    WITH CHECK (bucket_id = 'entregas');
  END IF;
END
$$;
