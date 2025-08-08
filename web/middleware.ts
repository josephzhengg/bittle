import { createMiddlewareSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareSupabaseClient();

  try {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();
    const url = req.nextUrl;

    const authRoutes = [
      '/login',
      '/signup',
      '/input-code',
      '/reset-password',
      '/forgot-password'
    ];

    const isAuthRoute =
      authRoutes.includes(url.pathname) ||
      url.pathname.startsWith('/input-code/');

    if (error || !session?.user) {
      if (isAuthRoute) {
        return res;
      }

      if (url.pathname === '/') {
        return NextResponse.redirect(new URL('/login', req.url));
      }

      return NextResponse.redirect(new URL('/login', req.url));
    }

    if (session?.user) {
      if (isAuthRoute) {
        return NextResponse.redirect(new URL('/dashboard/current', req.url));
      }

      if (url.pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard/current', req.url));
      }

      if (url.pathname === '/dashboard') {
        return NextResponse.redirect(new URL('/dashboard/current', req.url));
      }
    }

    return res;
  } catch (error) {
    console.error('Middleware auth error:', error);
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.webp).*)'
  ]
};
