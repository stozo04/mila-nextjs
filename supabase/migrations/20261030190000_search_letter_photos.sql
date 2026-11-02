-- Letter photos join search anything: the 113 images under blog-photos/ that letters show.
-- Each one links back to the letter that uses it: the letter whose text or image fields
-- contain the photo's own path, otherwise the letter that refers to its folder. No photo
-- appears in more than one letter today; if one ever does, the earliest letter wins.

alter table public.search_items drop constraint search_items_collection_check;
alter table public.search_items add constraint search_items_collection_check
  check (collection in ('journey', 'sonograms', 'baby-shower', 'gender-reveal', 'homepage', 'letter-photos', 'letters'));

create or replace function public.search_index_status()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_mila_admin() then
    raise exception 'Only Steven can build the search index.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'photos', (select coalesce(jsonb_agg(jsonb_build_array(o.name,
        case split_part(o.name, '/', 1) when 'birthday' then 'journey' when 'blog-photos' then 'letter-photos'
          else split_part(o.name, '/', 1) end)
        order by o.name), '[]'::jsonb)
      from storage.objects o
      where o.bucket_id = 'mila_storage_bucket'
        and split_part(o.name, '/', 1) in ('birthday', 'baby-shower', 'gender-reveal', 'blog-photos')
        and o.name ~* '\.(jpe?g|png|webp|gif)$'),
    'letters', (select coalesce(jsonb_agg(jsonb_build_object('key', 'letter:' || b.id, 'slug', b.slug,
        'title', b.title, 'content', b.content,
        'hash', md5(coalesce(b.title, '') || chr(10) || coalesce(b.content, ''))) order by b.date), '[]'::jsonb)
      from public.blogs b where not b.is_draft),
    'indexed', (select coalesce(jsonb_agg(jsonb_build_array(i.key, i.source_hash, i.thumb_path)), '[]'::jsonb)
      from public.search_items i)
  );
end $$;

-- { "blog-photos/...jpg": "<letter slug>" } for the viewer's "Go to the letter" link.
-- Letters store URLs, so a space in a file name may appear as %20.
create function public.search_letter_photo_links()
returns jsonb language sql stable security invoker set search_path = '' as $$
  with photos as (
    select o.name, split_part(o.name, '/', 2) as folder, array_length(string_to_array(o.name, '/'), 1) as depth
    from storage.objects o
    where o.bucket_id = 'mila_storage_bucket' and o.name like 'blog-photos/%' and o.name ~* '\.(jpe?g|png|webp|gif)$'
  ), letters as (
    select b.slug, b.date,
      concat_ws(' ', b.content, b.featured_image, b.detail_image, array_to_string(b.additional_images, ' ')) as refs
    from public.blogs b where not b.is_draft
  ), links as (
    select distinct on (p.name) p.name, l.slug
    from photos p join letters l
      on position(p.name in l.refs) > 0 or position(replace(p.name, ' ', '%20') in l.refs) > 0
      or (p.depth > 2 and position('blog-photos/' || p.folder || '/' in l.refs) > 0)
    -- An exact reference beats a folder reference; then the earliest letter.
    order by p.name, (position(p.name in l.refs) > 0 or position(replace(p.name, ' ', '%20') in l.refs) > 0) desc, l.date
  )
  select coalesce(jsonb_object_agg(name, slug), '{}'::jsonb) from links;
$$;

revoke all on function public.search_letter_photo_links() from public, anon;
grant execute on function public.search_letter_photo_links() to authenticated;
