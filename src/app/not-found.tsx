import Link from "next/link";
import React from "react";

const NotFound = () => {
  return (
    <div className="d-flex justify-content-center align-items-center vh-100 text-center">
      <div>
        <h2 className="p1-color">Page Not Found</h2>
        <p className="n4-color fs-seven mt-2 mt-md-3">
          The page you are looking for could not be found.
        </p>
        <Link
          href="/"
          className="p-btn bg1-color fw-medium n11-color px-3 px-md-6 py-2 py-md-4 rounded-pill d-flex align-items-center gap-2 mx-auto w-max mt-3 mt-md-5"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
