"use client";
import { createBrowserClient } from '@supabase/ssr';
import NavActionButton from '@/components/Shared/TopNav/NavActionButton';

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
    <NavActionButton onClick={handleSignIn} className={className}>
      {label}
    </NavActionButton>
  );
}
