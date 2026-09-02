-- Resolve Steven once at migration time; authorization uses his immutable Auth ID,
-- never user-editable metadata or an email supplied by the browser.
do $$
declare admin_id uuid;
begin
  select id into strict admin_id from auth.users
  where lower(email) = 'gates.steven@gmail.com' and email_confirmed_at is not null;
  execute format($fn$
    create function public.is_mila_admin() returns boolean
    language sql stable security invoker set search_path = ''
    as $body$select coalesce((select auth.uid()) = %L::uuid, false)$body$
  $fn$, admin_id);
end $$;
revoke all on function public.is_mila_admin() from public, anon;
grant execute on function public.is_mila_admin() to authenticated;

alter table public.blogs add column is_draft boolean not null default false;

-- Restrictive policies also guard against existing permissive write policies.
create policy mila_admin_insert on public.journey_cards as restrictive
  for insert to authenticated with check ((select public.is_mila_admin()));
create policy mila_admin_update on public.journey_cards as restrictive
  for update to authenticated using ((select public.is_mila_admin()))
  with check ((select public.is_mila_admin()));
create policy mila_admin_delete on public.journey_cards as restrictive
  for delete to authenticated using ((select public.is_mila_admin()));
create policy mila_admin_insert on public.blogs as restrictive
  for insert to authenticated with check ((select public.is_mila_admin()));
create policy mila_admin_update on public.blogs as restrictive
  for update to authenticated using ((select public.is_mila_admin()))
  with check ((select public.is_mila_admin()));
create policy mila_admin_delete on public.blogs as restrictive
  for delete to authenticated using ((select public.is_mila_admin()));
create policy mila_draft_visibility on public.blogs as restrictive
  for select to authenticated using (not is_draft or (select public.is_mila_admin()));

-- Pure preview; the timestamp argument permits offline boundary checks.
create function public.mila_month_preview(as_of timestamptz default now())
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  today date := (as_of at time zone 'America/Chicago')::date;
  month_start date := date_trunc('month', today)::date;
  milestone date;
  period_start date;
  total_months integer;
  years integer;
  months integer;
  age_title text;
  card_slug text;
  year_type text;
  section text;
  date_label text;
  words text[] := array['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
begin
  if today is null or today < date '2023-05-30' then
    raise exception 'A date on or after Mila''s birthday is required' using errcode = '22023';
  end if;
  -- February has no 30th: use its last day, then return to the 30th in March.
  milestone := least(month_start + 29, (month_start + interval '1 month - 1 day')::date);
  if milestone > today then
    month_start := (month_start - interval '1 month')::date;
    milestone := least(month_start + 29, (month_start + interval '1 month - 1 day')::date);
  end if;
  month_start := (month_start - interval '1 month')::date;
  period_start := least(month_start + 29, (month_start + interval '1 month - 1 day')::date);
  total_months := (extract(year from milestone)::integer - 2023) * 12 + extract(month from milestone)::integer - 5;
  if total_months < 1 then
    raise exception 'Mila has not completed her first month yet' using errcode = '22023';
  end if;
  years := total_months / 12;
  months := total_months % 12;
  age_title := concat_ws(' ',
    case when years > 0 then years || case when years = 1 then ' Year' else ' Years' end end,
    case when months > 0 then months || case when months = 1 then ' Month' else ' Months' end end);
  card_slug := concat_ws('-',
    case when years > 0 then coalesce(words[years + 1], years::text) || case when years = 1 then '-year' else '-years' end end,
    case when months > 0 then words[months + 1] || case when months = 1 then '-month' else '-months' end end);
  year_type := case years when 0 then 'first_year' when 1 then 'one_year' when 2 then 'two_year' when 3 then 'three_year' else years || '_year' end;
  section := case years when 0 then 'first-year' when 1 then 'one-year' when 2 then 'second-year' when 3 then 'third-year' else years || '-year' end;
  date_label := to_char(period_start, 'FMMonth FMDD') ||
    case when extract(year from period_start) <> extract(year from milestone) then to_char(period_start, ', YYYY') else '' end ||
    ' – ' || to_char(milestone, 'FMMonth FMDD, YYYY');
  return jsonb_build_object('title', age_title, 'slug', card_slug, 'date', date_label,
    'journey_type', year_type, 'section', section, 'milestone', milestone,
    'period_start', period_start, 'blog_title', age_title || ' Letter',
    'tag', to_char(milestone, 'YYYY'));
end $$;
revoke all on function public.mila_month_preview(timestamptz) from public, anon;
grant execute on function public.mila_month_preview(timestamptz) to authenticated;

create function public.prepare_milas_month(expected_slug text, message text default '')
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare plan jsonb;
begin
  if not public.is_mila_admin() then
    raise exception 'Only Steven can prepare Mila''s month' using errcode = '42501';
  end if;
  if message is null or char_length(message) > 5000 then
    raise exception 'Message must be at most 5000 characters' using errcode = '22023';
  end if;
  plan := public.mila_month_preview();
  if expected_slug is distinct from plan->>'slug' then
    raise exception 'The milestone changed. Reload the preview before preparing.' using errcode = '22023';
  end if;
  -- Both unique slug constraints are authoritative, including concurrent calls.
  -- Any conflict rolls back BOTH inserts. Existing records are never modified.
  insert into public.journey_cards(title, message, slug, date, journey_type)
  values (plan->>'title', message, plan->>'slug', plan->>'date', plan->>'journey_type');
  insert into public.blogs(title, slug, content, featured_image, detail_image,
    additional_images, video_url, date, tag, is_draft)
  values (plan->>'blog_title', plan->>'slug', '', '', '', '{}', '',
    (plan->>'milestone')::date, plan->>'tag', true);
  return plan;
end $$;
revoke all on function public.prepare_milas_month(text, text) from public, anon;
grant execute on function public.prepare_milas_month(text, text) to authenticated;

-- Keep the existing shared bucket and birthday/<slug>/<filename> convention.
create policy mila_gallery_read on storage.objects for select to authenticated
  using (bucket_id = 'mila_storage_bucket' and (storage.foldername(name))[1] = 'birthday');
create policy mila_gallery_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'mila_storage_bucket' and (select public.is_mila_admin())
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = 'birthday'
    and exists (select 1 from public.journey_cards where slug = (storage.foldername(name))[2])
    and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','gif'));
create policy mila_gallery_insert_guard on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'mila_storage_bucket' or (storage.foldername(name))[1] <> 'birthday'
    or ((select public.is_mila_admin())
      and array_length(storage.foldername(name), 1) = 2
      and exists (select 1 from public.journey_cards where slug = (storage.foldername(name))[2])
      and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','gif')));
create policy mila_gallery_update_guard on storage.objects as restrictive for update to authenticated
  using (bucket_id <> 'mila_storage_bucket' or (storage.foldername(name))[1] <> 'birthday' or (select public.is_mila_admin()))
  with check (bucket_id <> 'mila_storage_bucket' or (storage.foldername(name))[1] <> 'birthday' or (select public.is_mila_admin()));
create policy mila_gallery_delete_guard on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'mila_storage_bucket' or (storage.foldername(name))[1] <> 'birthday' or (select public.is_mila_admin()));
