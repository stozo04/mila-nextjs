-- People: move selected faces from an opened group or person. "move-faces" gives faces to a
-- person by name (an existing name joins them, a new name creates them); "remove-faces"
-- takes faces out together as one new unnamed group. Replaces people_apply; the other
-- actions are unchanged.

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
    -- Into the person's biggest group, so their faces stay together.
    select g.id into target from public.face_groups g where g.person_id = person
    order by (select count(*) from public.faces f where f.group_id = g.id) desc, g.created_at limit 1;
    if target is null then insert into public.face_groups (person_id) values (person) returning id into target; end if;
    update public.faces f set group_id = target where f.id = any (face_ids);
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
