'use client';

import Link from 'next/link';
import { FaLock } from 'react-icons/fa';

export default function UnauthorizedPage() {
  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-6 text-center">
          <div className="card p-5">
            <div className="mb-4 text-danger">
              <FaLock size={50} />
            </div>
            <h1 className="mb-4">Access Denied</h1>
            <p className="mb-4">
              Sorry, you don&apos;t have permission to access this page. 
              This area is restricted to authorized users only.
            </p>
            <div className="d-flex justify-content-center">
              <Link 
                href="/login"
                className="btn btn-primary rounded-pill px-4"
              >
                Return to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 