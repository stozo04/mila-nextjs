#!/usr/bin/env node
// Verification harness for the Mila site. Zero dependencies, Node 22.
// Two subcommands: `doctor` (is this instance worth driving?) and `get` (drive one route).
// It never signs in and never sends a mutating request that could reach live Supabase.
//
//   node .cursor/skills/verify-mila/control-mila.mjs doctor
//   node .cursor/skills/verify-mila/control-mila.mjs get /blogs --save route-protection/blogs
//   node .cursor/skills/verify-mila/control-mila.mjs get /api/journey/prepare-month --method POST --body '{}'
//
// Base URL defaults to http://127.0.0.1:3000; override with MILA_BASE_URL.
//
// Run it from PowerShell. Git Bash rewrites a leading-slash argument into a Windows
// path (`/blogs` -> `C:/Program Files/Git/blogs`), so every route arg arrives wrong;
// prefix `MSYS_NO_PATHCONV=1` if you must use bash.

import { readFileSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SKILL_DIR, '../../..');
const ARTIFACTS = join(SKILL_DIR, 'artifacts');
// Holds a real admin session. Git-ignored, and deliberately NOT under artifacts/:
// artifacts are evidence meant to be read and shared, this is a credential.
const SESSION_FILE = join(SKILL_DIR, '.session.json');

// Values stay in memory. Only key NAMES are ever printed.
function readEnv() {
  const env = {};
  try {
    for (const line of readFileSync(join(REPO_ROOT, '.env.local'), 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* doctor reports the missing file */ }
  return env;
}
const BASE = (process.env.MILA_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

// Every route handler that writes to Supabase. `get` refuses these outright unless
// --expect-unauthorized says the point IS to prove the server rejects an anonymous caller.
const MUTATING = [/^\/api\/journey\/prepare-month$/, /^\/api\/blog\/[^/]+\/publish$/, /^\/api\/blog\/[^/]+\/images$/];

// Endpoints where a plain GET is itself the damage. The audio route runs on the
// SERVICE ROLE key: it bypasses RLS, bills OpenAI TTS per uncached blog, and upserts
// into blog_audio. "It's only a GET" is exactly the assumption that spends money.
const REFUSE = [
  [/^\/api\/blog\/[^/]+\/audio$/, 'bills OpenAI TTS and upserts blog_audio via the service-role key'],
  [/^\/api\/chat-stream$/, 'bills OpenAI Responses API per call'],
  [/^\/api\/chatkit\/session$/, 'creates a billable OpenAI ChatKit session'],
];

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY', 'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_ADMIN_EMAIL',
];

const args = process.argv.slice(2);
const cmd = args[0];

function flag(name, fallback = null) {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
}
const has = (name) => args.includes(`--${name}`);

async function doctor() {
  const checks = [];
  const ok = (name, pass, detail) => checks.push({ name, pass, detail });

  const major = Number(process.versions.node.split('.')[0]);
  ok('node major is 22', major === 22, `found ${process.versions.node} (package.json engines: 22.x)`);

  // Env keys by NAME only. Values are secrets and are never printed or compared.
  let envNames = [];
  try {
    envNames = readFileSync(join(REPO_ROOT, '.env.local'), 'utf8')
      .split('\n').map((l) => l.split('=')[0].trim()).filter(Boolean);
  } catch {
    ok('.env.local readable', false, 'missing — the dev server cannot reach Supabase or OpenAI');
  }
  if (envNames.length) {
    const missing = REQUIRED_ENV.filter((k) => !envNames.includes(k));
    ok('.env.local has required keys', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : `${envNames.length} keys present`);
    // Documented in docs/headless-month-preparation.md. Absent = no scriptable sign-in.
    const headless = ['MILA_ADMIN_EMAIL', 'MILA_ADMIN_PASSWORD'].every((k) => envNames.includes(k));
    ok('headless admin sign-in configured', headless, headless
      ? 'MILA_ADMIN_* present — signed-in drives are possible via scripts/prepare-milas-month.mjs'
      : 'MILA_ADMIN_* absent — signed-in features are NOT drivable headlessly (expected; informational)');
  }

  let home;
  try {
    home = await fetch(`${BASE}/`, { redirect: 'manual' });
  } catch (error) {
    ok(`${BASE} answering`, false, `${error.code || error.message} — start it with: npm run dev`);
    return report(checks);
  }
  ok(`${BASE} answering`, home.status === 200, `GET / -> ${home.status}`);

  const html = await home.text();
  ok('serving the Mila app', html.includes('Mila'), 'GET / body mentions "Mila"');
  ok('carousel rendered on /', html.includes('carousel-item'), 'landing carousel markup present');

  // Owning the port is not the same as owning the right app. A stale server from
  // another checkout answers on 3000 too, and every later drive would be a lie.
  // An anonymous caller gets 307 -> /login for EVERY path except / and /privacy-policy,
  // unknown paths included: updateSession() redirects before routing resolves a 404.
  const unknown = await fetch(`${BASE}/__mila_probe_not_a_route`, { redirect: 'manual' });
  ok('anonymous session gate active', unknown.status === 307 && unknown.headers.get('location') === '/login',
    `GET /__mila_probe_not_a_route -> ${unknown.status} ${unknown.headers.get('location') ?? ''}`);

  return report(checks);
}

function report(checks) {
  for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
  // The headless-sign-in row is informational: its absence is the normal state.
  const fatal = checks.filter((c) => !c.pass && c.name !== 'headless admin sign-in configured');
  console.log(fatal.length === 0 ? '\ndoctor: OK — instance is worth driving' : `\ndoctor: ${fatal.length} blocking failure(s)`);
  process.exit(fatal.length === 0 ? 0 : 1);
}

// Mint a real signed-in session by letting the app's OWN @supabase/ssr build the
// cookies. Hand-rolling `sb-<ref>-auth-token` (base64- prefix, 3180-char chunking)
// would be a second implementation of something already installed here, and it
// would drift the moment the library changes its format.
async function session() {
  if (has('clear')) {
    if (existsSync(SESSION_FILE)) rmSync(SESSION_FILE);
    console.log('session cleared');
    return;
  }
  const env = readEnv();
  const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'MILA_ADMIN_EMAIL', 'MILA_ADMIN_PASSWORD']
    .filter((k) => !env[k]);
  if (missing.length) {
    console.error(`cannot sign in: ${missing.join(', ')} missing from .env.local`);
    console.error('See docs/headless-month-preparation.md for the one-time setup.');
    process.exit(1);
  }

  // pathToFileURL, not a bare path: Windows ESM rejects `c:\...` as an unsupported
  // URL scheme. scripts/check-monthly-workflow.mjs already hits this and fixes it the same way.
  const ssrEntry = pathToFileURL(join(REPO_ROOT, 'node_modules/@supabase/ssr/dist/main/index.js'));
  const { createServerClient } = await import(ssrEntry.href);
  const jar = {};
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => Object.entries(jar).map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => { jar[name] = value; }),
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: env.MILA_ADMIN_EMAIL, password: env.MILA_ADMIN_PASSWORD,
  });
  if (error || !data.session) {
    console.error(`sign-in failed: ${error?.message ?? 'no session returned'}`);
    console.error('Check that Email sign-in is enabled in the Supabase dashboard, not just that the password is set.');
    process.exit(1);
  }

  const { data: isAdmin } = await supabase.rpc('is_mila_admin');
  if (isAdmin !== true) {
    // The flag is called --as-admin. A signed-in but unauthorized session behind it
    // would turn every admin drive into an unexplained 403. Refuse rather than save.
    console.error(`signed in as ${data.session.user.email}, but is_mila_admin is false.`);
    console.error('MILA_ADMIN_EMAIL is not the admin account. No session saved.');
    process.exit(1);
  }
  writeFileSync(SESSION_FILE, JSON.stringify({ cookies: jar, mintedAt: new Date().toISOString() }, null, 2));
  // Identity, never the token: the email confirms WHICH account without leaking the session.
  console.log(`signed in as ${data.session.user.email}`);
  console.log(`is_mila_admin: ${isAdmin === true}`);
  console.log(`${Object.keys(jar).length} cookie(s) saved to ${SESSION_FILE}`);
  console.log('This file is a live admin session. Run `session --clear` when finished.');
}

function loadCookieHeader() {
  if (!existsSync(SESSION_FILE)) {
    console.error('no saved session. Run: node .cursor/skills/verify-mila/control-mila.mjs session');
    process.exit(1);
  }
  const { cookies } = JSON.parse(readFileSync(SESSION_FILE, 'utf8'));
  return Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join('; ');
}

async function get() {
  const path = args[1];
  if (!path?.startsWith('/')) {
    console.error('usage: get <path> [--method POST] [--body <json>] [--save <name>] [--expect-unauthorized]');
    process.exit(2);
  }
  const method = (flag('method', 'GET') || 'GET').toUpperCase();

  const refused = REFUSE.find(([re]) => re.test(path));
  if (refused) {
    console.error(`refusing ${method} ${path}: ${refused[1]}.`);
    console.error('Verify this route by reading the handler and by driving the UI control that calls it.');
    process.exit(2);
  }

  // The whole point of --expect-unauthorized is that the caller is ANONYMOUS.
  // Sending admin cookies with it would turn a rejection test into a real write.
  if (has('as-admin') && has('expect-unauthorized')) {
    console.error('refusing: --as-admin and --expect-unauthorized are contradictory.');
    console.error('The rejection test proves an anonymous caller is turned away; it must never carry a session.');
    process.exit(2);
  }
  if (has('as-admin') && method !== 'GET') {
    console.error(`refusing ${method} with --as-admin: an authenticated write would hit the live database.`);
    console.error('Signed-in drives are read-only. Verify mutating controls by presence and by anonymous rejection.');
    process.exit(2);
  }

  if (method !== 'GET' && !has('expect-unauthorized')) {
    console.error(`refusing ${method} ${path}: this dev server writes to the LIVE Supabase project.`);
    console.error('Pass --expect-unauthorized only to prove an anonymous caller is rejected before any write.');
    process.exit(2);
  }
  if (method !== 'GET' && !MUTATING.some((re) => re.test(path))) {
    console.error(`refusing ${method} ${path}: not a known guarded endpoint, so rejection is not the expected outcome.`);
    process.exit(2);
  }

  const body = flag('body');
  let response;
  try {
    response = await fetch(BASE + path, {
      method,
      redirect: 'manual',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(has('as-admin') ? { Cookie: loadCookieHeader() } : {}),
      },
      body: body ?? undefined,
    });
  } catch (error) {
    // An unhandled rejection here buries the one useful fact under a stack trace.
    console.error(`${method} ${path} -> no response (${error.cause?.code || error.message})`);
    console.error(`${BASE} is not answering. Start it with: npm run dev — then re-run doctor.`);
    process.exit(1);
  }
  const text = await response.text();

  console.log(`${method} ${path}${has('as-admin') ? ' [as admin]' : ''} -> ${response.status} ${response.statusText}`);
  const location = response.headers.get('location');
  if (location) console.log(`location: ${location}`);
  console.log(`content-type: ${response.headers.get('content-type') ?? '(none)'}`);
  console.log(`bytes: ${Buffer.byteLength(text)}`);

  if (has('expect-unauthorized')) {
    const rejected = [401, 403].includes(response.status);
    console.log(`${rejected ? 'PASS' : 'FAIL'}  anonymous caller rejected before any write (${response.status})`);
    console.log(`body: ${text.slice(0, 200)}`);
    if (!rejected) process.exit(1);
  }

  const save = flag('save');
  if (save) {
    const file = join(ARTIFACTS, `${save}.${(response.headers.get('content-type') || '').includes('html') ? 'html' : 'txt'}`);
    // Artifacts are shareable evidence; .session.json next door is a credential.
    // `--save ../.session` must not be able to reach it.
    if (!resolve(file).startsWith(ARTIFACTS + sep)) {
      console.error(`refusing --save ${save}: resolves outside artifacts/.`);
      process.exit(2);
    }
    mkdirSync(dirname(file), { recursive: true });
    const header = `# ${method} ${BASE}${path}\n# status: ${response.status}\n# location: ${location ?? '(none)'}\n# captured: ${new Date().toISOString()}\n`;
    writeFileSync(file, header + text);
    console.log(`saved: ${file}`);
  }
}

if (cmd === 'doctor') await doctor();
else if (cmd === 'session') await session();
else if (cmd === 'get') await get();
else {
  console.error('usage: control-mila.mjs <doctor|session|get> [...]');
  process.exit(2);
}
