-- Format generated age slugs in words, including ages beyond the original 0–19 list.
-- No existing journey card or blog is updated.
create function public.mila_age_words(value integer)
returns text language plpgsql immutable strict security invoker set search_path = '' as $$
declare
  words text[] := array['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  tens text[] := array['twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  scale integer;
  unit text;
begin
  if value < 0 then raise exception 'Age must be nonnegative' using errcode = '22023'; end if;
  if value < 20 then return words[value + 1]; end if;
  if value < 100 then
    return tens[value / 10 - 1] || case when value % 10 = 0 then '' else '-' || words[value % 10 + 1] end;
  end if;
  if value < 1000 then scale := 100; unit := 'hundred';
  elsif value < 1000000 then scale := 1000; unit := 'thousand';
  elsif value < 1000000000 then scale := 1000000; unit := 'million';
  else scale := 1000000000; unit := 'billion'; end if;
  return public.mila_age_words(value / scale) || '-' || unit ||
    case when value % scale = 0 then '' else '-' || public.mila_age_words(value % scale) end;
end $$;
revoke all on function public.mila_age_words(integer) from public, anon;
grant execute on function public.mila_age_words(integer) to authenticated;
create or replace function public.mila_month_preview(as_of timestamptz default now())
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
