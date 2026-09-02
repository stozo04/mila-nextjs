import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseOptions, prepareMonth } from './prepare-milas-month.mjs';

const plan = { slug: 'three-years-three-months', title: '3 Years 3 Months', date: 'July 30 – August 30, 2026' };
const apply = parseOptions(['--apply', '--expected-slug', plan.slug, '--message', 'A little artist']);
assert.deepEqual(parseOptions([]), { apply: false, expectedSlug: undefined, message: '' });
assert.equal(parseOptions(['--message', 'Hello\nMila']).message, 'Hello\nMila');
for (const args of [['--apply'], ['--expected-slug', plan.slug], ['--apply', '--expected-slug', '../bad'], ['--message', 'x'.repeat(5001)], ['--unknown']]) {
  assert.throws(() => parseOptions(args));
}
const script = fileURLToPath(new URL('./prepare-milas-month.mjs', import.meta.url));
const help = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' });
assert.equal(help.status, 0); assert.match(help.stdout, /Preview:.*\nApply:/);
const invalid = spawnSync(process.execPath, [script, '--apply'], { encoding: 'utf8' });
assert.equal(invalid.status, 1); assert.match(JSON.parse(invalid.stderr).error, /Preview first/);

let rows, calls, admin, failure, readFailure, race, incomplete;
const reset = () => { rows = { journey_cards: null, blogs: null }; calls = []; admin = true; failure = null; readFailure = false; race = false; incomplete = false; };
const client = {
  async rpc(name, args) {
    calls.push({ name, args });
    if (name === 'is_mila_admin') return { data: admin, error: null };
    if (name === 'mila_month_preview') return { data: plan, error: null };
    assert.equal(name, 'prepare_milas_month');
    assert.deepEqual(args, { expected_slug: plan.slug, message: apply.message });
    if (failure) return { data: null, error: failure };
    if (!incomplete) rows = { journey_cards: { id: 'card', message: args.message }, blogs: { id: 'letter', is_draft: true, content: '' } };
    return { data: plan, error: race ? { code: '23505' } : null };
  },
  from(table) {
    assert.ok(['journey_cards', 'blogs'].includes(table));
    return { select(columns) {
      assert.equal(columns, 'id');
      return { eq(column, value) {
        assert.deepEqual([column, value], ['slug', plan.slug]);
        return { maybeSingle: async () => ({ data: rows[table], error: readFailure ? { message: 'private detail' } : null }) };
      } };
    } };
  },
};
const writes = () => calls.filter(call => call.name === 'prepare_milas_month');
reset();
assert.equal((await prepareMonth(client, parseOptions([]))).status, 'preview');
assert.equal(writes().length, 0); assert.deepEqual(rows, { journey_cards: null, blogs: null });
assert.equal((await prepareMonth(client, apply)).status, 'created');
assert.equal(writes().length, 1);
const original = structuredClone(rows);
assert.equal((await prepareMonth(client, { ...apply, message: 'Never overwrite' })).status, 'already_exists');
assert.deepEqual(rows, original); assert.equal(writes().length, 1);
for (const table of ['journey_cards', 'blogs']) {
  reset(); rows[table] = { id: 'existing', content: 'Keep me' };
  const before = structuredClone(rows);
  assert.equal((await prepareMonth(client, apply)).status, 'conflict');
  assert.deepEqual(rows, before); assert.equal(writes().length, 0);
}
reset(); admin = false;
await assert.rejects(prepareMonth(client, apply), /not authorized/);
assert.equal(calls.length, 1);
reset();
await assert.rejects(prepareMonth(client, { ...apply, expectedSlug: 'stale' }), /milestone changed/);
assert.equal(writes().length, 0);
reset(); race = true;
assert.equal((await prepareMonth(client, apply)).status, 'already_exists');
assert.equal(writes().length, 1);
reset(); failure = { code: '22023', message: 'private detail' };
await assert.rejects(prepareMonth(client, apply), /preview changed/);
assert.equal(writes().length, 1);
reset(); failure = { code: '500', message: 'private detail' };
await assert.rejects(prepareMonth(client, apply), /Unable to confirm creation/);
assert.equal(writes().length, 1);
reset(); readFailure = true;
await assert.rejects(prepareMonth(client, apply), /Unable to verify/);
assert.equal(writes().length, 0);
reset(); incomplete = true;
await assert.rejects(prepareMonth(client, apply), /not confirmed by reading both records/);
console.log('PASS: headless preview/apply parsing, shared RPC payload, verified pair result, safe duplicates/partial pairs, stale preview, authorization and error handling. No network or live content used.');
