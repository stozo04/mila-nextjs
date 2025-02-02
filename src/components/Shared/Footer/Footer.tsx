import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-dark text-light py-3 text-center">
      <div className="container">
        <span>
          Copyright © {new Date().getFullYear()}{" "}
          <Link href="https://www.stevengates.io" className="text-light fw-bold">
            Gates Company
          </Link>
          . All Rights Reserved.
        </span>
      </div>
    </footer>
  );
};

export default Footer;
