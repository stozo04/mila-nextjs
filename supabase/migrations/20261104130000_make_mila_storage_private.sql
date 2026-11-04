-- Make mila_storage_bucket private: only signed-in users can read its objects.
-- Applied live on 2026-11-04 after the /api/media route (PR #20) was deployed and verified.
-- Written to be safe to run again.

update storage.buckets set public = false where id = 'mila_storage_bucket';

-- "Enable read access for all users" was `using (true)` for role public with no bucket filter,
-- so it let anon read every bucket, private ones included (mila_storage_bucket and
-- katerina-files). Nothing depends on it: Katerina's app and ingest use the service key,
-- which bypasses storage RLS, and signed-in Mila reads get their own policy below.
drop policy if exists "Enable read access for all users" on storage.objects;

-- Anon read of a `public/` folder that holds no objects.
drop policy if exists "Give anon users access to JPG images in folder 1fmvdwc_0" on storage.objects;

-- Signed-in users can list and sign anything in the bucket (galleries, letters,
-- gender reveal, baby shower). Writes keep their existing, narrower policies.
drop policy if exists mila_bucket_read_authenticated on storage.objects;
create policy mila_bucket_read_authenticated on storage.objects
  for select to authenticated
  using (bucket_id = 'mila_storage_bucket');
