import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function ProtectedPage({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    // Check if user is authenticated
    if (error || !user) {
        redirect('/login');
    }

    // Email allowlist check removed - any authenticated user can access protected routes
    return <>{children}</>;
}