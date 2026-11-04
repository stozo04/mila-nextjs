-- The restrictive mila_admin_* policies already limited every write to the Mila admin; make the
-- permissive write policies say the same thing instead of `true`, so the rule holds even if a
-- restrictive policy is ever dropped. Behaviour is unchanged. Applied live 2026-11-04.
alter policy authenticated_insert_blogs on public.blogs with check ((select public.is_mila_admin()));
alter policy authenticated_update_blogs on public.blogs using ((select public.is_mila_admin())) with check ((select public.is_mila_admin()));
alter policy authenticated_delete_blogs on public.blogs using ((select public.is_mila_admin()));
alter policy authenticated_insert_journey_cards on public.journey_cards with check ((select public.is_mila_admin()));
alter policy authenticated_update_journey_cards on public.journey_cards using ((select public.is_mila_admin())) with check ((select public.is_mila_admin()));
alter policy authenticated_delete_journey_cards on public.journey_cards using ((select public.is_mila_admin()));
