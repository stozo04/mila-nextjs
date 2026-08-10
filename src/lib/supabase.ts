import { createBrowserClient } from '@supabase/ssr';

// createBrowserClient, NOT createClient. The plain supabase-js client keeps no
// cookie session, so every query ran as role `anon` regardless of who was
// signed in. That was invisible until RLS was enabled 2026-08-08: from then on
// anon matched zero rows on every table, `.single()` returned an error, and
// callers rendered notFound() — a site-wide 404 for logged-in users.
// Auth already used @supabase/ssr (utils/supabase/{client,server}.ts); this
// file was the half of that migration that never landed.
// Browser-only by construction — every importer is a client component.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
