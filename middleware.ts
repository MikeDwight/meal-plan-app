import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const auth = request.cookies.get('auth')

  if (auth?.value === process.env.APP_PASSWORD) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!login|health|api|_next/static|_next/image|favicon.ico).*)'],
}
