import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';

  // Redirect old flowency.build domain to new opstack.uk domain
  if (host.includes('dorsettransfercompany.flowency.build')) {
    const newUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, 'https://dorsettransfercompany.opstack.uk');
    return NextResponse.redirect(newUrl, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and api routes
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
