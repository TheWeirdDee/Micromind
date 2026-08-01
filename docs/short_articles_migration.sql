-- Upgrade the existing story challenge schema to short articles with covers.
-- Internal table/column names stay unchanged to preserve existing data and APIs.

ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_title_check;
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_content_check;
ALTER TABLE public.stories
  ADD CONSTRAINT stories_title_check CHECK (char_length(title) BETWEEN 3 AND 80) NOT VALID,
  ADD CONSTRAINT stories_content_check CHECK (
    array_length(regexp_split_to_array(btrim(content), '\s+'), 1) BETWEEN 100 AND 1000
  ) NOT VALID;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('article-images', 'article-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view article images" ON storage.objects;
CREATE POLICY "Public can view article images" ON storage.objects
FOR SELECT USING (bucket_id = 'article-images');

DROP POLICY IF EXISTS "Users upload own article images" ON storage.objects;
CREATE POLICY "Users upload own article images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'article-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own article images" ON storage.objects;
CREATE POLICY "Users update own article images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'article-images' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'article-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own article images" ON storage.objects;
CREATE POLICY "Users delete own article images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'article-images' AND (storage.foldername(name))[1] = auth.uid()::text);
