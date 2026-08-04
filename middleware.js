import { NextResponse } from 'next/server';

const BLOCKED_EXACT_PATHS = new Set([
  '/_session',
  '/index.php',
  '/phpinfo.php',
  '/wp-login.php',
  '/xmlrpc.php',
]);

const BLOCKED_PREFIXES = [
  '/wp-admin',
  '/wp-content',
  '/wp-includes',
  '/.env',
  '/.git',
  '/cgi-bin',
  '/vendor',
  '/server-status',
  '/cdgserver3',
];

const BLOCKED_SUFFIXES = [
  '.php',
  '.asp',
  '.aspx',
  '.jsp',
  '.cgi',
  '.pl',
  '.ini',
  '.bak',
  '.old',
  '.sql',
  '.log',
];

function isProbePath(pathname) {
  const normalized = pathname.toLowerCase();

  if (BLOCKED_EXACT_PATHS.has(normalized)) {
    return true;
  }

  if (normalized.includes('..')) {
    return true;
  }

  if (BLOCKED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }

  if (BLOCKED_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) {
    return true;
  }

  return false;
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (isProbePath(pathname)) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=300',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api).*)',
  ],
};
