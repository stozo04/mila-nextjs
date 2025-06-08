import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

// List of protected routes that require authentication
const PROTECTED_ROUTES = ['/blogs', '/sonograms', '/baby-shower', '/gender-reveal', '/my-journey'] // Add any other protected routes here

export async function middleware(request: NextRequest) {
  console.log('Middleware triggered for path:', request.nextUrl.pathname)
  
  // First update the session
  const response = await updateSession(request)
  
  // Check if the current path is a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  
  if (isProtectedRoute) {
    console.log('Protected route detected:', request.nextUrl.pathname)
    
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
      console.log('No user found, redirecting to login')
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Email allowlist check removed - any authenticated user can access protected routes
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