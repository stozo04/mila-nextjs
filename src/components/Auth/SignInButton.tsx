"use client";
import { createBrowserClient } from '@supabase/ssr';
import { FcGoogle } from 'react-icons/fc';

type Props = {
  label?: string;
  className?: string;
};

export default function SignInButton({ label = 'Sign In', className }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'consent' }
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error('Sign-in error:', err);
    }
  };

  return (
    <button onClick={handleSignIn} className={className ?? 'nav-link btn btn-link d-flex align-items-center gap-2'}>
      {label}
    </button>
  );
}

