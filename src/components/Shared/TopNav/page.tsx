"use client";
import Link from 'next/link';
import Image from "next/image";
import milaBrand from "@/../public/images/icon-3-transparent.png";
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const NavMenu = () => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
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
              </ul>
            </li>
            <li className="nav-item">
              <Link href="/about/genealogy" className="nav-link">
                About Me
              </Link>
            </li>
            {isAuthenticated && (
              <li className="nav-item">
                <button onClick={handleLogout} className="nav-link btn btn-link">
                  Logout
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default NavMenu;
