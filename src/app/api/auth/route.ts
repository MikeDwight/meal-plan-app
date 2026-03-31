import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  const expected = process.env.APP_PASSWORD?.trim() ?? '2603'

  if (password === expected) {
    const maxAge = 60 * 60 * 24 * 365
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    const response = NextResponse.json({ ok: true })
    response.headers.set(
      'Set-Cookie',
      `auth=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
    )
    return response
  }

  return NextResponse.json({ ok: false }, { status: 401 })
}
