-- Mila tables. Every policy on blogs/journey_cards is `to authenticated`, so anon never
-- needs table access; revoke it. TRUNCATE/REFERENCES/TRIGGER are never used by the app and
-- TRUNCATE ignores RLS. RLS policies are deliberately untouched: permissive `authenticated_*`
-- baseline + restrictive `mila_admin_*` / `mila_draft_visibility` gates is the working design.
revoke all on public.blogs, public.journey_cards from anon;
revoke truncate, references, trigger on public.blogs, public.journey_cards from authenticated;

-- Service-role-only tables (RLS on, no policies): the app reaches them with the service key.
revoke all on public.blog_audio, public.chat_questions from anon, authenticated;
