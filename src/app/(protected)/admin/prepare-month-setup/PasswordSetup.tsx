'use client';

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function PasswordSetup() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError('');
    if (password.length < 12 || password !== confirmation) {
      setError('Use at least 12 characters and enter the same password in both fields.');
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const { data: admin, error: adminError } = await supabase.rpc('is_mila_admin');
      if (adminError || admin !== true) {
        setError('Sign in with the authorized admin account before setting a password.');
        return;
      }
      const { data, error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError || !data.user) {
        setError('Unable to set the password. Use a strong password and sign in again if your session has expired.');
        return;
      }
      setDone(true);
    } catch {
      setError('Unable to confirm the password change. Sign in again before retrying.');
    } finally {
      setPassword('');
      setConfirmation('');
      setBusy(false);
      submitting.current = false;
    }
  }

  return <main className="container my-5" style={{ maxWidth: 560 }}>
    <h1 className="h3">Set up the monthly command</h1>
    <p>Add a password to your existing Mila account for the headless command. Google sign-in will keep working.</p>
    {done ? <div role="status" className="alert alert-success">
      Password set. Save it privately as <code>MILA_ADMIN_PASSWORD</code> in your local <code>.env.local</code> file.
      Set <code>MILA_ADMIN_EMAIL</code> to the email of this same account. Never paste the password into chat.
    </div> : <form onSubmit={submit}>
      <label htmlFor="monthly-password" className="form-label">New Supabase password</label>
      <input id="monthly-password" type="password" autoComplete="new-password" className="form-control mb-3"
        required minLength={12} value={password} disabled={busy} onChange={event => setPassword(event.target.value)} />
      <label htmlFor="monthly-password-confirm" className="form-label">Confirm password</label>
      <input id="monthly-password-confirm" type="password" autoComplete="new-password" className="form-control mb-3"
        required minLength={12} value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} />
      {error && <p role="alert" className="text-danger">{error}</p>}
      <button type="submit" className="btn btn-success" disabled={busy}>{busy ? 'Setting password…' : 'Set password'}</button>
    </form>}
  </main>;
}
