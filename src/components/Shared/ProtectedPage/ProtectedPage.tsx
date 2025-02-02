"use client";

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, AuthChangeEvent } from '@supabase/supabase-js';

export default function ProtectedPage({ children }: { children: React.ReactNode }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const errorMessage = searchParams.get('error_message');
  const allowedEmail = 'gates.steven@gmail.com'; // Change this to your desired email

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('User:', user);
      setUser(user);
      setLoading(false);
    }

    getUser();

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener?.unsubscribe(); // Correct way to unsubscribe
    };
  }, [supabase]);

  useEffect(() => {
    if (!loading && !user) {
      localStorage.setItem('redirectAfterLogin', window.location.pathname);
      router.push('/login');
    } else if (!loading && user?.email !== allowedEmail) {
      // Redirect to unauthorized page if user email doesn't match
      router.push('/unauthorized'); // Change this to your unauthorized page route
    }
  }, [user, loading, router, allowedEmail]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <>
      {errorMessage && <div className="bg-red-500 text-white p-4">{errorMessage}</div>}
      {children}
    </>
  );
}