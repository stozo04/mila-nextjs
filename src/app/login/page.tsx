"use client";
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link';
import { FcGoogle } from 'react-icons/fc';

export default function LoginPage() {

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'consent' // This forces Google to show the consent screen
          }
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      {/* Main content */}
      <section className="pt-120 pb-120 mt-10 mt-lg-0">
        <div className="d-flex justify-content-center gap-2 align-items-center mt-4">
          <Link
            href="#"
            onClick={handleGoogleLogin}
            className="p-btn bg1-color fw-medium n11-color px-3 px-md-6 py-2 py-md-4 rounded-pill d-flex align-items-center gap-2 h-100 text-nowrap"
          >
            <FcGoogle />
            Continue with Google
          </Link>
        </div>
      </section>
    </div>

  );
}