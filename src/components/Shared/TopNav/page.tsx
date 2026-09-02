"use client";
import Link from 'next/link';
import Image from "next/image";
import milaBrand from "@/../public/images/icon-3-transparent.png";
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SignInButton from '@/components/Auth/SignInButton';
import PrepareMonth from '@/components/Journey/PrepareMonth';

const NavMenu = () => {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const isAuthenticated = !!userId;
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          // Handle stale/invalid refresh tokens gracefully
          if (
            typeof error.message === 'string' &&
            (error.message.includes('Invalid Refresh Token') ||
              error.message.includes('Refresh Token Not Found'))
          ) {
            await supabase.auth.signOut();
          }
          console.warn('Auth check error:', error.message ?? error);
        }
        setUserId(session?.user.id ?? null);
      } catch (err: any) {
        console.warn('Auth check threw:', err?.message ?? err);
        setUserId(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    supabase.rpc('is_mila_admin').then(({ data }) => {
      if (active) setAdminUserId(data === true ? userId : null);
    });
    return () => { active = false; };
  }, [userId, supabase]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      router.push('/login');
    }
  };

  const donateNavItem = (
    <li className="nav-item">
      <a
        href="https://go.fidelity.com/knfo0b"
        className="nav-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        Support Mila
      </a>
    </li>
  );

  return (
    <>
    {!isLoading && userId && adminUserId === userId && (
      <aside className="bg-success-subtle border-bottom py-2" aria-label="Mila’s monthly preparation">
        <div className="container d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span className="small fw-semibold">Steven’s admin tools</span>
          <PrepareMonth />
        </div>
      </aside>
    )}
    <nav className="navbar navbar-expand-lg bg-body-tertiary">
      <div className="container-fluid d-flex justify-content-between align-items-center">
        <Link href="/">
          <Image src={milaBrand} alt="Mila Gates" className="navbar-brand" />
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
          <ul className="navbar-nav">
            {isLoading ? null : (
              <>
                {donateNavItem}
                {isAuthenticated ? (
                  <>
                    <li className="nav-item">
                      <Link href="/sonograms" className="nav-link">
                        Sonograms
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link href="/gender-reveal" className="nav-link">
                        Gender Reveal
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link href="/blogs" className="nav-link">
                        Blogs
                      </Link>
                    </li>
                    <li className="nav-item dropdown">
                      <a
                        className="nav-link dropdown-toggle"
                        href="#"
                        role="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        Baby Shower
                      </a>
                      <ul className="dropdown-menu">
                        <li>
                          <Link href="/baby-shower/houston" className="dropdown-item">
                            Houston
                          </Link>
                        </li>
                        <li>
                          <Link href="/baby-shower/dallas" className="dropdown-item">
                            Dallas
                          </Link>
                        </li>
                      </ul>
                    </li>
                    <li className="nav-item dropdown">
                      <a
                        className="nav-link dropdown-toggle"
                        href="#"
                        role="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        My Journey
                      </a>
                      <ul className="dropdown-menu">
                        <li>
                          <Link href="/my-journey/birthday" className="dropdown-item">
                            Birthday
                          </Link>
                        </li>
                        <li>
                          <Link href="/my-journey/first-year" className="dropdown-item">
                            My First Year
                          </Link>
                        </li>
                        <li>
                          <Link href="/my-journey/one-year" className="dropdown-item">
                            One Year
                          </Link>
                        </li>
                        <li>
                          <Link href="/my-journey/second-year" className="dropdown-item">
                            Two Year
                          </Link>
                        </li>
                        <li>
                          <Link href="/my-journey/third-year" className="dropdown-item">
                            Three Year
                          </Link>
                        </li>
                      </ul>
                    </li>
                    <li className="nav-item">
                      <Link href="/about/genealogy" className="nav-link">
                        About Me
                      </Link>
                    </li>
                    <li className="nav-item">
                      <button onClick={handleLogout} className="nav-link btn btn-link">
                        Logout
                      </button>
                    </li>
                  </>
                ) : (
                  <li className="nav-item">
                    <SignInButton />
                  </li>
                )}
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
    </>
  );
};

export default NavMenu;
