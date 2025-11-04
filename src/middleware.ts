import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

// List of protected routes that require authentication
const PROTECTED_ROUTES = ['/blogs', '/sonograms', '/baby-shower', '/gender-reveal', '/my-journey']

export async function middleware(request: NextRequest) {
  // URL normalization
  const url = request.nextUrl
  const pathname = url.pathname

  // Remove trailing slashes except for root
  if (pathname !== '/' && pathname.endsWith('/')) {
    return NextResponse.redirect(new URL(pathname.slice(0, -1), request.url), 308)
  }

  // Force HTTPS
  if (process.env.NODE_ENV === 'production' && !request.headers.get('x-forwarded-proto')?.includes('https')) {
    return NextResponse.redirect(new URL(request.url.replace('http://', 'https://')), 308)
  }

  // Force www to non-www (or vice versa, depending on your preference)
  const hostname = request.headers.get('host') || ''
  if (hostname.startsWith('www.')) {
    return NextResponse.redirect(new URL(request.url.replace('www.', '')), 308)
  }

  // First update the session
  const response = await updateSession(request)
  
  // Check if the current path is a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  )
  
  if (isProtectedRoute) {
    // Create a Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => request.cookies.get(name)?.value,
          set: (name, value, options) => {
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove: (name, options) => {
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Get the user's session
    const { data: { user } } = await supabase.auth.getUser()

    // If no user is found, redirect to login
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    // Match all paths except static files and api routes
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
    // Specifically match protected routes
    '/blogs/:path*',
    '/sonograms/:path*',
    '/dashboard/:path*',
  ],
} 