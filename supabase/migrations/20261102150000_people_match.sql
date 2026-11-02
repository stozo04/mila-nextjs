-- People: match unnamed faces from the faces Steven has named (people-match), undo the last
-- match (people-match-undo), and the same vote for new scans (people-auto). A face joins a
-- person when its closest named faces in other photos agree on them; see people_vote.

alter table public.faces
  add column matched_run uuid,   -- the match that moved this face; cleared when Steven moves it
  add column matched_from uuid;  -- the group it came from, for Undo (may since have emptied)
create index faces_matched_run_idx on public.faces (matched_run) where matched_run is not null;

-- Calibrated on Steven's labels (people.md): of the five most similar named faces in other
-- photos, at least three are found, one person holds 80% of their similarity, and the
-- closest is at least best_similarity alike. Faces moved by run skip_run don't vote, so a
-- match only learns from Steven's own names.
create function public.people_vote(vec extensions.vector(1024), photo_key text, best_similarity double precision, skip_run uuid default null)
returns uuid language sql stable security invoker set search_path = '' as $$
  with near as (
    select g.person_id, 1 - (n.embedding operator(extensions.<=>) vec) as similarity
    from (select x.embedding, x.photo_key, x.group_id, x.matched_run from public.faces x
          order by x.embedding operator(extensions.<=>) vec limit 40) n
    join public.face_groups g on g.id = n.group_id
    where g.person_id is not null and n.photo_key <> people_vote.photo_key
      and (skip_run is null or n.matched_run is distinct from skip_run)
    order by similarity desc limit 5
  ), votes as (
    select person_id, sum(similarity) as weight from near group by person_id
  )
  select v.person_id from votes v
  where (select count(*) from near) >= 3
    and (select max(similarity) from near) >= best_similarity
    and v.weight >= 0.8 * (select sum(weight) from votes)
  order by v.weight desc limit 1;
$$;

-- A person's biggest group, so their faces stay together; made if they have none.
create function public.person_group(person uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare target uuid;
begin
  select g.id into target from public.face_groups g where g.person_id = person
  order by (select count(*) from public.faces f where f.group_id = g.id) desc, g.created_at limit 1;
  if target is null then insert into public.face_groups (person_id) values (person) returning id into target; end if;
  return target;
end $$;

-- New scans: a face the named faces vote for joins that person; otherwise it joins the
-- unnamed group of its most similar face when alike enough (join), or starts its own.
-- auto_similarity is the vote's closest-face bar.
create or replace function public.save_face_scan(photo_key text, faces jsonb, join_similarity double precision, auto_similarity double precision)
returns text[] language plpgsql security invoker set search_path = '' as $$
declare
  face jsonb;
  vec extensions.vector(1024);
  nearest record;
  person uuid;
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
    target := null;
    person := public.people_vote(vec, save_face_scan.photo_key, auto_similarity);
    if person is not null then
      target := public.person_group(person);
    else
      select f.group_id, g.person_id, 1 - (f.embedding operator(extensions.<=>) vec) as similarity into nearest
      from public.faces f join public.face_groups g on g.id = f.group_id
      where f.photo_key <> save_face_scan.photo_key
      order by f.embedding operator(extensions.<=>) vec
      limit 1;
      if nearest.group_id is not null and nearest.person_id is null and nearest.similarity >= join_similarity then
        target := nearest.group_id;
      end if;
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

-- One batch of Match with named people: the next unnamed, unhidden faces after after_id.
-- The first batch of a run (after_id null) forgets the previous match, so Undo only ever
-- covers the latest one.
create function public.people_match(run uuid, after_id uuid, batch integer, best_similarity double precision)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  face record;
  person uuid;
  checked integer := 0;
  matched integer := 0;
  last_id uuid := after_id;
  matched_people uuid[] := '{}';
begin
  perform public.require_mila_admin();
  if after_id is null then
    update public.faces f set matched_run = null, matched_from = null where f.matched_run is not null;
  end if;
  for face in
    select f.id, f.photo_key, f.embedding, f.group_id
    from public.faces f join public.face_groups g on g.id = f.group_id
    where g.person_id is null and not g.hidden and (after_id is null or f.id > after_id)
    order by f.id limit least(greatest(batch, 1), 200)
  loop
    checked := checked + 1;
    last_id := face.id;
    person := public.people_vote(face.embedding, face.photo_key, best_similarity, run);
    if person is not null then
      update public.faces f set group_id = public.person_group(person), matched_run = run, matched_from = face.group_id
      where f.id = face.id;
      matched := matched + 1;
      if not person = any (matched_people) then matched_people := matched_people || person; end if;
    end if;
  end loop;
  delete from public.face_groups g where not exists (select 1 from public.faces f where f.group_id = g.id);
  return jsonb_build_object('checked', checked, 'matched', matched, 'people', to_jsonb(matched_people),
    'last_id', last_id, 'done', checked < least(greatest(batch, 1), 200));
end $$;

-- Undo last match: every face it moved goes back to its group, recreating emptied ones.
create function public.people_match_undo()
returns integer language plpgsql security invoker set search_path = '' as $$
declare restored integer;
begin
  perform public.require_mila_admin();
  insert into public.face_groups (id)
  select distinct f.matched_from from public.faces f where f.matched_run is not null and f.matched_from is not null
  on conflict (id) do nothing;
  update public.faces f set group_id = f.matched_from, matched_run = null, matched_from = null
  where f.matched_run is not null and f.matched_from is not null;
  get diagnostics restored = row_count;
  delete from public.face_groups g where not exists (select 1 from public.faces f where f.group_id = g.id);
  delete from public.people p where not exists (select 1 from public.face_groups g where g.person_id = p.id);
  return restored;
end $$;

-- People page: adds the unnamed face count (for Match) and whether Undo has anything to undo.
create or replace function public.people_list(include_hidden boolean default false)
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
    'photos', (select count(*) from public.search_items i where i.kind = 'photo'),
    'unnamed_faces', (select count(*) from public.faces f join public.face_groups g on g.id = f.group_id
                      where g.person_id is null and not g.hidden),
    'can_undo', exists (select 1 from public.faces f where f.matched_run is not null)
  );
end $$;

-- Steven's own changes: moving a matched face himself takes it out of the last match.
create or replace function public.people_apply(change jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  ids uuid[] := array(select jsonb_array_elements_text(coalesce(change->'group_ids', '[]'))::uuid);
  face_ids uuid[] := array(select jsonb_array_elements_text(coalesce(change->'face_ids', '[]'))::uuid);
  person uuid;
  target uuid;
  clean text := btrim(change->>'name');
begin
  perform public.require_mila_admin();
  if change->>'face_id' is not null then face_ids := face_ids || (change->>'face_id')::uuid; end if;
  update public.faces f set matched_run = null, matched_from = null where f.id = any (face_ids) and f.matched_run is not null;
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
  when 'remove-faces' then
    insert into public.face_groups default values returning id into target;
    update public.faces f set group_id = target where f.id = any (face_ids);
  when 'move-faces' then
    select p.id into person from public.people p where lower(btrim(p.name)) = lower(clean);
    if person is null then insert into public.people (name) values (clean) returning id into person; end if;
    update public.faces f set group_id = public.person_group(person) where f.id = any (face_ids);
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

revoke all on function public.people_vote(extensions.vector, text, double precision, uuid) from public, anon;
revoke all on function public.person_group(uuid) from public, anon;
revoke all on function public.people_match(uuid, uuid, integer, double precision) from public, anon;
revoke all on function public.people_match_undo() from public, anon;
grant execute on function public.people_vote(extensions.vector, text, double precision, uuid) to authenticated;
grant execute on function public.person_group(uuid) to authenticated;
grant execute on function public.people_match(uuid, uuid, integer, double precision) to authenticated;
grant execute on function public.people_match_undo() to authenticated;
