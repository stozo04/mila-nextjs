-- People: faces found in Mila's photos, grouped by likeness, named by Steven. Steven's
-- browser finds faces while the search index builds; every signed-in visitor can read
-- names (the viewer and search use them); only Steven writes. Additive only.

create table public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);
create unique index people_name_unique on public.people (lower(btrim(name)));

-- A group is a pile of look-alike faces; naming a group points it at a person, and one
-- person can own several groups (newborn Mila, toddler Mila).
create table public.face_groups (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people (id) on delete set null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index face_groups_person_idx on public.face_groups (person_id);

create table public.faces (
  id uuid primary key default gen_random_uuid(),
  photo_key text not null,
  box real[] not null check (array_length(box, 1) = 4), -- x, y, width, height as fractions
  score real not null,
  embedding extensions.vector(1024) not null,
  thumb_path text check (thumb_path like 'search/faces/%'),
  group_id uuid not null references public.face_groups (id),
  created_at timestamptz not null default now()
);
create index faces_photo_idx on public.faces (photo_key);
create index faces_group_idx on public.faces (group_id);
create index faces_embedding_idx on public.faces using hnsw (embedding extensions.vector_cosine_ops);

-- Photos already scanned, including the ones with no faces.
create table public.face_scans (
  photo_key text primary key,
  faces integer not null,
  scanned_at timestamptz not null default now()
);

alter table public.people enable row level security;
alter table public.face_groups enable row level security;
alter table public.faces enable row level security;
alter table public.face_scans enable row level security;
create policy people_read on public.people for select to authenticated using (true);
create policy face_groups_read on public.face_groups for select to authenticated using (true);
create policy faces_read on public.faces for select to authenticated using (true);
create policy face_scans_read on public.face_scans for select to authenticated using (true);
create policy people_admin on public.people for all to authenticated
  using ((select public.is_mila_admin())) with check ((select public.is_mila_admin()));
create policy face_groups_admin on public.face_groups for all to authenticated
  using ((select public.is_mila_admin())) with check ((select public.is_mila_admin()));
create policy faces_admin on public.faces for all to authenticated
  using ((select public.is_mila_admin())) with check ((select public.is_mila_admin()));
create policy face_scans_admin on public.face_scans for all to authenticated
  using ((select public.is_mila_admin())) with check ((select public.is_mila_admin()));

create function public.require_mila_admin() returns void
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_mila_admin() then
    raise exception 'Only Steven can manage people.' using errcode = '42501';
  end if;
end $$;

-- Replaces a photo's faces with a fresh scan. Each face joins the group of the most similar
-- face in another photo when they are alike enough (join); a face that resembles a named
-- person only joins them when the match is confident (auto), otherwise it waits in a group
-- of its own for Steven to name. Returns the thumbnails of faces it replaced.
create function public.save_face_scan(photo_key text, faces jsonb, join_similarity double precision, auto_similarity double precision)
returns text[] language plpgsql security invoker set search_path = '' as $$
declare
  face jsonb;
  vec extensions.vector(1024);
  nearest record;
  target uuid;
  old_thumbs text[];
begin
  perform public.require_mila_admin();
  select coalesce(array_agg(f.thumb_path) filter (where f.thumb_path is not null), '{}') into old_thumbs
  from public.faces f where f.photo_key = save_face_scan.photo_key;
  delete from public.faces f where f.photo_key = save_face_scan.photo_key;
  delete from public.face_groups g where not exists (select 1 from public.faces f where f.group_id = g.id);

  for face in select * from jsonb_array_elements(faces) loop
    vec := (face->>'embedding')::extensions.vector(1024);
    select f.group_id, g.person_id, 1 - (f.embedding operator(extensions.<=>) vec) as similarity into nearest
    from public.faces f join public.face_groups g on g.id = f.group_id
    where f.photo_key <> save_face_scan.photo_key
    order by f.embedding operator(extensions.<=>) vec
    limit 1;
    target := null;
    if nearest.group_id is not null and nearest.similarity >= join_similarity
       and (nearest.person_id is null or nearest.similarity >= auto_similarity) then
      target := nearest.group_id;
    end if;
    if target is null then
      insert into public.face_groups default values returning id into target;
    end if;
    insert into public.faces (photo_key, box, score, embedding, thumb_path, group_id)
    values (save_face_scan.photo_key,
      array[(face->'box'->>'x')::real, (face->'box'->>'y')::real, (face->'box'->>'width')::real, (face->'box'->>'height')::real],
      (face->>'score')::real, vec, face->>'thumb_path', target);
  end loop;

  insert into public.face_scans (photo_key, faces) values (save_face_scan.photo_key, jsonb_array_length(faces))
  on conflict on constraint face_scans_pkey do update set faces = excluded.faces, scanned_at = now();
  return old_thumbs;
end $$;

-- Drops faces of photos that left the search index. Returns their thumbnails.
create function public.forget_photo_faces(photo_keys text[])
returns text[] language plpgsql security invoker set search_path = '' as $$
declare old_thumbs text[];
begin
  perform public.require_mila_admin();
  select coalesce(array_agg(f.thumb_path) filter (where f.thumb_path is not null), '{}') into old_thumbs
  from public.faces f where f.photo_key = any (photo_keys);
  delete from public.faces f where f.photo_key = any (photo_keys);
  delete from public.face_scans s where s.photo_key = any (photo_keys);
  delete from public.face_groups g where not exists (select 1 from public.faces f where f.group_id = g.id);
  return old_thumbs;
end $$;

-- Photos already scanned for faces, as one array (past PostgREST's row cap).
create function public.face_scan_keys()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(s.photo_key), '[]') from public.face_scans s;
$$;

-- The People page: named people, then unnamed groups biggest first, and scan progress.
create function public.people_list(include_hidden boolean default false)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  perform public.require_mila_admin();
  return jsonb_build_object(
    'people', (select coalesce(jsonb_agg(person order by person->>'name'), '[]') from (
      select jsonb_build_object('id', p.id, 'name', p.name,
        'photos', (select count(distinct f.photo_key) from public.faces f join public.face_groups g on g.id = f.group_id where g.person_id = p.id),
        'faces', (select count(*) from public.faces f join public.face_groups g on g.id = f.group_id where g.person_id = p.id),
        'thumb', (select f.thumb_path from public.faces f join public.face_groups g on g.id = f.group_id
                  where g.person_id = p.id order by f.score desc limit 1)) as person
      from public.people p) named),
    'groups', (select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'faces', g.faces, 'thumbs', g.thumbs, 'hidden', g.hidden)
        order by g.faces desc, g.id), '[]') from (
      select g.id, g.hidden, count(f.id) as faces,
        (array_agg(f.thumb_path order by f.score desc) filter (where f.thumb_path is not null))[1:4] as thumbs
      from public.face_groups g join public.faces f on f.group_id = g.id
      where g.person_id is null and (include_hidden or not g.hidden)
      group by g.id) g),
    'scanned', (select count(*) from public.face_scans),
    'photos', (select count(*) from public.search_items i where i.kind = 'photo')
  );
end $$;

-- One group's or one person's faces, each with its photo's search thumbnail.
create function public.people_faces(group_id uuid default null, person_id uuid default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  perform public.require_mila_admin();
  return (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'thumb', f.thumb_path, 'photo_key', f.photo_key,
      'photo_thumb', i.thumb_path) order by f.score desc), '[]')
    from public.faces f join public.face_groups g on g.id = f.group_id
    left join public.search_items i on i.key = f.photo_key
    where (people_faces.group_id is not null and g.id = people_faces.group_id)
       or (people_faces.person_id is not null and g.person_id = people_faces.person_id));
end $$;

-- Every change Steven makes on the People page, each in one transaction.
create function public.people_apply(change jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  ids uuid[] := array(select jsonb_array_elements_text(coalesce(change->'group_ids', '[]'))::uuid);
  person uuid;
  target uuid;
  clean text := btrim(change->>'name');
begin
  perform public.require_mila_admin();
  case change->>'action'
  when 'name' then
    select p.id into person from public.people p where lower(btrim(p.name)) = lower(clean);
    if person is null then insert into public.people (name) values (clean) returning id into person; end if;
    update public.face_groups g set person_id = person, hidden = false where g.id = any (ids);
  when 'merge' then
    -- Keep a named group if there is one, so merging never loses a name.
    select g.id, g.person_id into target, person from public.face_groups g where g.id = any (ids)
    order by (g.person_id is null), g.created_at limit 1;
    update public.faces f set group_id = target where f.group_id = any (ids);
    delete from public.face_groups g where g.id = any (ids) and g.id <> target;
  when 'remove-face' then
    insert into public.face_groups default values returning id into target;
    update public.faces f set group_id = target where f.id = (change->>'face_id')::uuid;
  when 'hide' then
    update public.face_groups g set hidden = (change->>'hidden')::boolean where g.id = any (ids);
  when 'rename' then
    update public.people p set name = clean where p.id = (change->>'person_id')::uuid;
  when 'unname' then
    update public.face_groups g set person_id = null where g.person_id = (change->>'person_id')::uuid;
    delete from public.people p where p.id = (change->>'person_id')::uuid;
  else
    raise exception 'Unknown people change.' using errcode = '22023';
  end case;
  delete from public.face_groups g where not exists (select 1 from public.faces f where f.group_id = g.id);
  delete from public.people p where not exists (select 1 from public.face_groups g where g.person_id = p.id);
end $$;

-- For search and the viewer (any signed-in visitor): named people, who is in a photo, and
-- which photos hold all of a set of people. Hidden groups never count.
create function public.people_names()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by length(p.name) desc), '[]')
  from public.people p;
$$;

create function public.photo_people(photo_key text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(distinct jsonb_build_object('id', p.id, 'name', p.name)), '[]')
  from public.faces f join public.face_groups g on g.id = f.group_id join public.people p on p.id = g.person_id
  where f.photo_key = photo_people.photo_key and not g.hidden;
$$;

-- Photos that hold every one of the given people, as [key, collection, thumb_path] rows in
-- one array (Mila alone is in thousands, past PostgREST's row cap).
create function public.photos_with_people(person_ids uuid[])
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_array(i.key, i.collection, i.thumb_path)), '[]')
  from public.search_items i
  where i.kind = 'photo' and i.key in (
    select f.photo_key from public.faces f join public.face_groups g on g.id = f.group_id
    where g.person_id = any (person_ids) and not g.hidden
    group by f.photo_key
    having count(distinct g.person_id) = cardinality(person_ids));
$$;

-- Scene search among the photos holding every given person, judged against the median of
-- every photo so a person filter doesn't loosen what counts as a match.
create function public.match_search_photos_among(query_embedding extensions.vector(768), person_ids uuid[], match_count integer default 200)
returns table (key text, collection text, thumb_path text, score double precision, median_score double precision)
language sql stable security invoker set search_path = '' as $$
  with scored as (
    select i.key, i.collection, i.thumb_path, 1 - (i.embedding operator(extensions.<=>) query_embedding) as score
    from public.search_items i where i.kind = 'photo'
  ), baseline as (select percentile_cont(0.5) within group (order by score) as median_score from scored),
  wanted as (
    select f.photo_key from public.faces f join public.face_groups g on g.id = f.group_id
    where g.person_id = any (person_ids) and not g.hidden
    group by f.photo_key
    having count(distinct g.person_id) = cardinality(person_ids))
  select s.key, s.collection, s.thumb_path, s.score, b.median_score
  from scored s cross join baseline b
  where s.key in (select photo_key from wanted)
  order by s.score desc
  limit least(greatest(match_count, 1), 500);
$$;

revoke all on function public.require_mila_admin() from public, anon;
revoke all on function public.face_scan_keys() from public, anon;
revoke all on function public.save_face_scan(text, jsonb, double precision, double precision) from public, anon;
revoke all on function public.forget_photo_faces(text[]) from public, anon;
revoke all on function public.people_list(boolean) from public, anon;
revoke all on function public.people_faces(uuid, uuid) from public, anon;
revoke all on function public.people_apply(jsonb) from public, anon;
revoke all on function public.people_names() from public, anon;
revoke all on function public.photo_people(text) from public, anon;
revoke all on function public.photos_with_people(uuid[]) from public, anon;
revoke all on function public.match_search_photos_among(extensions.vector, uuid[], integer) from public, anon;
grant execute on function public.require_mila_admin() to authenticated;
grant execute on function public.face_scan_keys() to authenticated;
grant execute on function public.save_face_scan(text, jsonb, double precision, double precision) to authenticated;
grant execute on function public.forget_photo_faces(text[]) to authenticated;
grant execute on function public.people_list(boolean) to authenticated;
grant execute on function public.people_faces(uuid, uuid) to authenticated;
grant execute on function public.people_apply(jsonb) to authenticated;
grant execute on function public.people_names() to authenticated;
grant execute on function public.photo_people(text) to authenticated;
grant execute on function public.photos_with_people(uuid[]) to authenticated;
grant execute on function public.match_search_photos_among(extensions.vector, uuid[], integer) to authenticated;
