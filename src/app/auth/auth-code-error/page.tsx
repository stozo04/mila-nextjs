import Link from 'next/link';

type Props = { searchParams: Promise<{ error_message?: string | string[] }> };

// Supabase's PKCE sign-in keeps a verifier cookie on the address where sign-in started. If
// Google returns to a different address (a preview link not on Supabase's redirect list, or
// another browser), the callback has no verifier and the exchange fails with this message.
const startedElsewhere = (message: string) => /code verifier/i.test(message);

export default async function AuthCodeError({ searchParams }: Props) {
  const raw = (await searchParams).error_message;
  const message = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 500) ?? '';

  return (
    <main className="container my-5" style={{ maxWidth: 560 }}>
      <h1 className="h3">We couldn’t sign you in</h1>
      {startedElsewhere(message) ? <>
        <p>Your sign-in finished on a different address than it started on, so it couldn’t be completed.</p>
        <p>This happens when sign-in starts on a preview link, or starts in one browser and finishes in another. Go back to the page you were using and sign in there again, in the same browser.</p>
      </> : <p>Google sign-in didn’t finish. This can happen when it’s cancelled or takes too long. Please try again.</p>}
      <div className="d-flex flex-wrap gap-2 my-4">
        <Link href="/login" className="btn btn-primary rounded-pill px-4">Try signing in again</Link>
        <Link href="/" className="btn btn-outline-primary rounded-pill px-4">Go to the home page</Link>
      </div>
      {message && <details>
        <summary>Error details</summary>
        <p className="small text-body-secondary mt-2 mb-0">{message}</p>
      </details>}
    </main>
  );
}
