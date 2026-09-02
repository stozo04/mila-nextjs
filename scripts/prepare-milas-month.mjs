import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

class CommandError extends Error {}

export function parseOptions(args) {
  const { values } = parseArgs({ args, options: {
    apply: { type: 'boolean' },
    'expected-slug': { type: 'string' },
    message: { type: 'string', default: '' },
    help: { type: 'boolean', short: 'h' },
  } });
  if (values.help) return values;
  if (values.message.length > 5000) throw new CommandError('The journey-card message must be at most 5000 characters.');
  if (values.apply && !values['expected-slug']) throw new CommandError('Preview first, then use --apply --expected-slug <preview slug>.');
  if (values['expected-slug'] && (!values.apply || !/^[a-z]+(?:-[a-z]+)*$/.test(values['expected-slug']))) {
    throw new CommandError('--expected-slug requires --apply and a lowercase word slug from the preview.');
  }
  return { apply: !!values.apply, expectedSlug: values['expected-slug'], message: values.message };
}

async function readPair(client, slug) {
  const results = await Promise.all(['journey_cards', 'blogs'].map(table =>
    client.from(table).select('id').eq('slug', slug).maybeSingle()));
  if (results.some(result => result.error)) throw new CommandError('Unable to verify existing records. Nothing further was attempted; rerun the preview.');
  return { journeyCard: !!results[0].data, blogLetter: !!results[1].data };
}

export async function prepareMonth(client, options) {
  const { data: admin, error: adminError } = await client.rpc('is_mila_admin');
  if (adminError || admin !== true) throw new CommandError('The authenticated account is not authorized to prepare Mila’s month.');
  const { data: plan, error: previewError } = await client.rpc('mila_month_preview');
  if (previewError || !plan?.slug) throw new CommandError('Unable to load the shared database preview.');
  if (options.apply && options.expectedSlug !== plan.slug) throw new CommandError('The milestone changed. Preview again before applying.');
  let existing = await readPair(client, plan.slug);
  const result = status => ({ status, slug: plan.slug, title: plan.title, date: plan.date, existing });
  if (existing.journeyCard && existing.blogLetter) return result('already_exists');
  if (existing.journeyCard || existing.blogLetter) return result('conflict');
  if (!options.apply) return result('preview');

  const { error } = await client.rpc('prepare_milas_month', {
    expected_slug: plan.slug, message: options.message ?? '',
  });
  if (error && error.code !== '23505') {
    throw new CommandError(error.code === '22023' ? 'The preview changed or the message is invalid. Preview again.'
      : 'Unable to confirm creation. Rerun the preview before retrying; existing records are never changed.');
  }
  existing = await readPair(client, plan.slug);
  if (existing.journeyCard && existing.blogLetter) return result(error ? 'already_exists' : 'created');
  if (error) return result('conflict');
  throw new CommandError('Creation was not confirmed by reading both records. Rerun the preview before retrying.');
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    console.log('Preview: npm run prepare-milas-month -- [--message "Journey-card message"]\nApply:   npm run prepare-milas-month -- --apply --expected-slug <preview slug> [--message "Journey-card message"]\nReads private configuration from .env.local or environment variables. See docs/headless-month-preparation.md.');
    return;
  }
  try { process.loadEnvFile(fileURLToPath(new URL('../.env.local', import.meta.url))); }
  catch (error) { if (error.code !== 'ENOENT') throw new CommandError('Unable to read the private .env.local configuration.'); }
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key, MILA_ADMIN_EMAIL: email, MILA_ADMIN_PASSWORD: password } = process.env;
  if (!url || !key || !email || !password) {
    throw new CommandError('Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, MILA_ADMIN_EMAIL and MILA_ADMIN_PASSWORD in private configuration. No browser credentials are read.');
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(30_000) }) },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error?.code === 'email_provider_disabled') throw new CommandError('Enable the project’s Email sign-in provider in Supabase Authentication > Sign In / Providers > Email. Keep Google and existing signup restrictions unchanged.');
  if (error) throw new CommandError('Supabase sign-in failed. Check the existing admin account’s headless login configuration.');
  const result = await prepareMonth(client, options);
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'conflict') process.exitCode = 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    const message = error instanceof CommandError ? error.message
      : 'Month preparation failed. Check arguments with --help and private configuration, then rerun the preview.';
    console.error(JSON.stringify({ status: 'error', error: message }));
    process.exitCode = 1;
  });
}
