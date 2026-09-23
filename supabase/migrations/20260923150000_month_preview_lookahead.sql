-- Once the most recently completed month has both its journey card and its letter,
-- preview the month in progress so its letter can be started before the milestone.
-- Never looks further ahead than that. A partial pair keeps the completed month so
-- the conflict surfaces. No existing journey card or blog is updated.

-- The plan for the milestone falling in the month starting at month_start.
create function public.mila_month_plan(month_start date)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  -- February has no 30th: use its last day, then return to the 30th in March.
  milestone date := least(month_start + 29, (month_start + interval '1 month - 1 day')::date);
  prior_start date := (month_start - interval '1 month')::date;
  period_start date := least(prior_start + 29, (prior_start + interval '1 month - 1 day')::date);
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
    case when years > 0 then public.mila_age_words(years) || case when years = 1 then '-year' else '-years' end end,
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
revoke all on function public.mila_month_plan(date) from public, anon;
grant execute on function public.mila_month_plan(date) to authenticated;

create or replace function public.mila_month_preview(as_of timestamptz default now())
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  today date := (as_of at time zone 'America/Chicago')::date;
  month_start date := date_trunc('month', today)::date;
  plan jsonb;
begin
  if today is null or today < date '2023-05-30' then
    raise exception 'A date on or after Mila''s birthday is required' using errcode = '22023';
  end if;
  if least(month_start + 29, (month_start + interval '1 month - 1 day')::date) > today then
    month_start := (month_start - interval '1 month')::date;
  end if;
  plan := public.mila_month_plan(month_start);
  if exists (select 1 from public.journey_cards where slug = plan->>'slug')
    and exists (select 1 from public.blogs where slug = plan->>'slug') then
    plan := public.mila_month_plan((month_start + interval '1 month')::date);
  end if;
  return plan;
end $$;
