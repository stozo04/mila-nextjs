import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Construct the redirect URL correctly
            const redirectUrl = new URL(next, origin);
            return NextResponse.redirect(redirectUrl);
        } else {
            console.error("Error exchanging code:", error); // Log the actual error
            // Redirect to a specific error page with more context if needed
            const errorRedirectUrl = new URL('/auth/auth-code-error', origin);
            errorRedirectUrl.searchParams.set('error_message', error.message)
            return NextResponse.redirect(errorRedirectUrl);
        }
    }

    // Handle missing code gracefully
    const missingCodeRedirect = new URL('/login', origin); // Or a specific error page
    missingCodeRedirect.searchParams.set('error_message', 'Missing authorization code.')
    return NextResponse.redirect(missingCodeRedirect);
}