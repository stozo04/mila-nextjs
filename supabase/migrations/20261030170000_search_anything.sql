-- Search anything: one embedding per photo and published letter, from EmbeddingGemma 2
-- (768 dimensions, one shared space for text and images). Steven's browser writes rows
-- and preview thumbnails; every signed-in visitor reads them. Additive only: no existing
-- table, row, or policy is changed.

create table public.search_items (
  -- The Storage object name, the site path of a built-in image, or letter:<blog id>.
  key text primary key,
  kind text not null check (kind in ('photo', 'letter')),
  collection text not null
    check (collection in ('journey', 'sonograms', 'baby-shower', 'gender-reveal', 'homepage', 'letters')),
  thumb_path text check (thumb_path like 'search/thumbs/%'),
  color text check (color ~ '^#[0-9a-f]{6}$'),
  width integer,
  height integer,
  -- Letters only: md5 of the title and content that were embedded, to spot edits.
  source_hash text,
  embedding extensions.vector(768) not null,
  indexed_at timestamptz not null default now()
);
create index search_items_embedding_idx on public.search_items
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.search_items enable row level security;
create policy search_items_read on public.search_items for select to authenticated using (true);
create policy search_items_insert on public.search_items for insert to authenticated
  with check ((select public.is_mila_admin()));
create policy search_items_update on public.search_items for update to authenticated
  using ((select public.is_mila_admin())) with check ((select public.is_mila_admin()));
create policy search_items_delete on public.search_items for delete to authenticated
  using ((select public.is_mila_admin()));

-- Every indexed photo for the atlas, as compact arrays: one call instead of paging past
-- PostgREST's row cap. [key, collection, thumb_path, color, width, height]
create function public.search_atlas_items()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_array(key, collection, thumb_path, color, width, height)), '[]'::jsonb)
  from public.search_items where kind = 'photo';
$$;

create function public.match_search_photos(query_embedding extensions.vector(768), match_count integer default 200)
returns table (key text, collection text, thumb_path text, score double precision)
language sql stable security invoker set search_path = '' as $$
  select i.key, i.collection, i.thumb_path,
    1 - (i.embedding operator(extensions.<=>) query_embedding)
  from public.search_items i
  where i.kind = 'photo'
  order by i.embedding operator(extensions.<=>) query_embedding
  limit least(greatest(match_count, 1), 500);
$$;

-- Drafts never match, even for Steven, and a letter turned back into a draft drops out
-- before the index page cleans it up.
create function public.match_search_letters(query_embedding extensions.vector(768), match_count integer default 20)
returns table (key text, slug text, title text, date date, featured_image text, score double precision)
language sql stable security invoker set search_path = '' as $$
  select i.key, b.slug, b.title, b.date, b.featured_image,
    1 - (i.embedding operator(extensions.<=>) query_embedding)
  from public.search_items i
  join public.blogs b on i.key = 'letter:' || b.id
  where i.kind = 'letter' and not b.is_draft
  order by i.embedding operator(extensions.<=>) query_embedding
  limit least(greatest(match_count, 1), 100);
$$;

-- What the index page compares against: every searchable Storage photo, every published
-- letter with the hash of its current text, and what is already indexed. Built-in images
-- (homepage, sonograms) ship with the site and are listed by the app instead.
create function public.search_index_status()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_mila_admin() then
    raise exception 'Only Steven can build the search index.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'photos', (select coalesce(jsonb_agg(jsonb_build_array(o.name,
        case split_part(o.name, '/', 1) when 'birthday' then 'journey' else split_part(o.name, '/', 1) end)
        order by o.name), '[]'::jsonb)
      from storage.objects o
      where o.bucket_id = 'mila_storage_bucket'
        and split_part(o.name, '/', 1) in ('birthday', 'baby-shower', 'gender-reveal')
        and o.name ~* '\.(jpe?g|png|webp|gif)$'),
    'letters', (select coalesce(jsonb_agg(jsonb_build_object('key', 'letter:' || b.id, 'slug', b.slug,
        'title', b.title, 'content', b.content,
        'hash', md5(coalesce(b.title, '') || chr(10) || coalesce(b.content, ''))) order by b.date), '[]'::jsonb)
      from public.blogs b where not b.is_draft),
    'indexed', (select coalesce(jsonb_agg(jsonb_build_array(i.key, i.source_hash, i.thumb_path)), '[]'::jsonb)
      from public.search_items i)
  );
end $$;

revoke all on function public.search_atlas_items() from public, anon;
revoke all on function public.match_search_photos(extensions.vector, integer) from public, anon;
revoke all on function public.match_search_letters(extensions.vector, integer) from public, anon;
revoke all on function public.search_index_status() from public, anon;
grant execute on function public.search_atlas_items() to authenticated;
grant execute on function public.match_search_photos(extensions.vector, integer) to authenticated;
grant execute on function public.match_search_letters(extensions.vector, integer) to authenticated;
grant execute on function public.search_index_status() to authenticated;

-- Preview thumbnails live under search/thumbs/ in the existing public bucket. Only Steven
-- writes there; upload upserts need update as well as insert.
create policy mila_search_thumbs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'mila_storage_bucket' and (storage.foldername(name))[1] = 'search'
    and (select public.is_mila_admin()) and lower(storage.extension(name)) in ('webp', 'jpg', 'png'));
create policy mila_search_thumbs_update on storage.objects for update to authenticated
  using (bucket_id = 'mila_storage_bucket' and (storage.foldername(name))[1] = 'search' and (select public.is_mila_admin()))
  with check (bucket_id = 'mila_storage_bucket' and (storage.foldername(name))[1] = 'search'
    and (select public.is_mila_admin()) and lower(storage.extension(name)) in ('webp', 'jpg', 'png'));
create policy mila_search_thumbs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'mila_storage_bucket' and (storage.foldername(name))[1] = 'search' and (select public.is_mila_admin()));
