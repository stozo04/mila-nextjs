-- Every query scores Mila's photos against its own baseline: nonsense like "zzqx" still
-- tops out around 0.63, while a real match stands well clear of the median. Both match
-- functions now return the median score across their whole kind so the search API can
-- require a match to stand out. A full scan of a few thousand vectors is a few milliseconds.

drop function public.match_search_photos(extensions.vector, integer);
create function public.match_search_photos(query_embedding extensions.vector(768), match_count integer default 200)
returns table (key text, collection text, thumb_path text, score double precision, median_score double precision)
language sql stable security invoker set search_path = '' as $$
  with scored as (
    select i.key, i.collection, i.thumb_path, 1 - (i.embedding operator(extensions.<=>) query_embedding) as score
    from public.search_items i where i.kind = 'photo'
  ), baseline as (select percentile_cont(0.5) within group (order by score) as median_score from scored)
  select s.key, s.collection, s.thumb_path, s.score, b.median_score
  from scored s cross join baseline b
  order by s.score desc
  limit least(greatest(match_count, 1), 500);
$$;

drop function public.match_search_letters(extensions.vector, integer);
create function public.match_search_letters(query_embedding extensions.vector(768), match_count integer default 20)
returns table (key text, slug text, title text, date date, featured_image text, score double precision, median_score double precision)
language sql stable security invoker set search_path = '' as $$
  with scored as (
    select i.key, b.slug, b.title, b.date, b.featured_image,
      1 - (i.embedding operator(extensions.<=>) query_embedding) as score
    from public.search_items i
    join public.blogs b on i.key = 'letter:' || b.id
    where i.kind = 'letter' and not b.is_draft
  ), baseline as (select percentile_cont(0.5) within group (order by score) as median_score from scored)
  select s.key, s.slug, s.title, s.date, s.featured_image, s.score, b.median_score
  from scored s cross join baseline b
  order by s.score desc
  limit least(greatest(match_count, 1), 100);
$$;

revoke all on function public.match_search_photos(extensions.vector, integer) from public, anon;
revoke all on function public.match_search_letters(extensions.vector, integer) from public, anon;
grant execute on function public.match_search_photos(extensions.vector, integer) to authenticated;
grant execute on function public.match_search_letters(extensions.vector, integer) to authenticated;
