-- Enable RLS on all tables flagged by the Supabase security advisor
-- (rls_disabled_in_public, ERROR level) and add policies that match the
-- app's existing access model: everything except "/" and "/privacy-policy"
-- already requires a logged-in Supabase session (src/utils/supabase/middleware.ts).
--
-- Applied directly to production via the Supabase MCP on 2026-08-04; this
-- file is the tracked record of that change (repo previously had no
-- supabase/migrations directory).

alter table public.journey_cards enable row level security;
alter table public.blogs enable row level security;
alter table public.blog_audio enable row level security;
alter table public.chat_questions enable row level security;

-- journey_cards: read/write only from the (protected) /my-journey pages
create policy "authenticated_select_journey_cards" on public.journey_cards
  for select to authenticated using (true);
create policy "authenticated_insert_journey_cards" on public.journey_cards
  for insert to authenticated with check (true);
create policy "authenticated_update_journey_cards" on public.journey_cards
  for update to authenticated using (true) with check (true);
create policy "authenticated_delete_journey_cards" on public.journey_cards
  for delete to authenticated using (true);

-- blogs: read/write only from the (protected) /blogs pages
create policy "authenticated_select_blogs" on public.blogs
  for select to authenticated using (true);
create policy "authenticated_insert_blogs" on public.blogs
  for insert to authenticated with check (true);
create policy "authenticated_update_blogs" on public.blogs
  for update to authenticated using (true) with check (true);
create policy "authenticated_delete_blogs" on public.blogs
  for delete to authenticated using (true);

-- blog_audio: only ever touched server-side (TTS cache) via the service-role
-- key, which bypasses RLS -- no anon/authenticated policy needed, so it
-- stays fully locked to the server.

-- chat_questions: no current code path reads or writes it client-side --
-- stays fully locked to the server/dashboard.
