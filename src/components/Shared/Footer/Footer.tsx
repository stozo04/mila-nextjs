import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-dark text-light py-3">
      <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
        <span className="text-center text-md-start w-100">
          Copyright &copy; {new Date().getFullYear()}{" "}
          <Link href="https://www.stevengates.io" className="text-light fw-bold">
            Gates Company
          </Link>
          . All rights reserved.
        </span>
        <div className="d-flex flex-wrap justify-content-center w-100 gap-3">
          <Link href="/privacy-policy" className="text-light text-decoration-underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
