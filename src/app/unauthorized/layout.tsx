import { Suspense } from 'react';
import Loading from '@/app/loading';

export default function UnauthorizedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <main className="min-vh-100 d-flex align-items-center">
        {children}
      </main>
    </Suspense>
  );
} 