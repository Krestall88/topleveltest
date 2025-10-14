import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_FILE = /\.(.*)$/;

// This function can be marked `async` if using `await` inside
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow requests for API, static files, auth pages, and public pages
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/client-bindings') ||
    pathname.startsWith('/api/telegram/notify-selection') ||
    pathname.startsWith('/static') ||
    PUBLIC_FILE.test(pathname) ||
    pathname === '/login' ||
    pathname === '/auth/login' ||
    pathname === '/choose-object'
  ) {
    return NextResponse.next();
  }

  const jwt = req.cookies.get('token')?.value;

  if (!jwt) {
    req.nextUrl.pathname = '/auth/login';
    return NextResponse.redirect(req.nextUrl);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    await jwtVerify(jwt, secret);

    // Allow access to dashboard (root path)
    // No redirect needed - users can access dashboard directly

    return NextResponse.next();
  } catch (error) {
    console.error('JWT Verification Error:', error);
    req.nextUrl.pathname = '/auth/login';
    return NextResponse.redirect(req.nextUrl);
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
