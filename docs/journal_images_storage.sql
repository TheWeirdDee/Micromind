-- Private storage bucket for encrypted journal images.
-- Objects are opaque AES-GCM ciphertext; the app never relies on Supabase's
-- public URL feature for this bucket (bucket is private, RLS-scoped per user).

insert into storage.buckets (id, name, public)
values ('journal-images', 'journal-images', false)
on conflict (id) do nothing;

create policy "Users can manage own journal images"
on storage.objects for all
to authenticated
using (bucket_id = 'journal-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'journal-images' and (storage.foldername(name))[1] = auth.uid()::text);
