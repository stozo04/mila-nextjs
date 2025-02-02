"use client";
import Link from 'next/link';
import Image from "next/image";
import milaBrand from "@/../public/images/icon-3.png";

const NavMenu = () => {
  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary">
      <div className="container-fluid">
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNavDropdown"
          aria-controls="navbarNavDropdown"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNavDropdown">
        <Image src={milaBrand} alt="user" className="navbar-brand" />
          {/* <Link href="/" className="navbar-brand">
            Your Brand
          </Link> */}
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {/* Sonograms */}
            <li className="nav-item">
              <Link href="/sonograms/sonogram-list" className="nav-link">
                Sonograms
              </Link>
            </li>

            {/* Gender Reveal */}
            <li className="nav-item">
              <Link href="/gender-reveal" className="nav-link">
                Gender Reveal
              </Link>
            </li>

            {/* Baby Shower Dropdown */}
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

            {/* My Journey Dropdown */}
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

            {/* Blogs */}
            <li className="nav-item">
              <Link href="/blogs/blog-list" className="nav-link">
                Blogs
              </Link>
            </li>

            {/* About Me (Active) */}
            <li className="nav-item">
              <Link href="/about/genealogy" className="nav-link active">
                About Me
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default NavMenu;
