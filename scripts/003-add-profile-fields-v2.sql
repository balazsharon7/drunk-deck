-- Add language preference and premium status to profiles
-- Using DO block to handle "column already exists" gracefully

DO $$ 
BEGIN
  BEGIN
    ALTER TABLE profiles ADD COLUMN language text DEFAULT 'hu';
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE profiles ADD COLUMN is_premium boolean DEFAULT false;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE profiles ADD COLUMN premium_until timestamptz;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
END $$;

-- Create avatars bucket if not exists (this may fail if bucket exists, that's ok)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
