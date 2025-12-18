import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';

  // Redirect old flowency.build domain to new opstack.uk domain
  if (host.includes('dorsettransfercompany.flowency.build')) {
    const url = request.nextUrl.clone();
    url.host = 'dorsettransfercompany.opstack.uk';
    url.protocol = 'https';
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and api routes
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
