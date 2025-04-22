import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function ProtectedPage({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    // Check if user is authenticated
    if (error || !user) {
        redirect('/login');
    }

    // Check for allowed email addresses
    const allowedEmail = process.env.NEXT_PUBLIC_ALLOWED_EMAIL;
    const allowedEmails = allowedEmail?.split(';').map(email => email.trim()) || [];
    
    if (!allowedEmail || !allowedEmails.includes(user.email || '')) {
        redirect('/unauthorized');
    }

    return <>{children}</>;
}