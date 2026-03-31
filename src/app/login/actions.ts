'use server'

import { cookies } from 'next/headers'

export async function loginAction(_prev: { error: boolean; success: boolean }, formData: FormData) {
  const password = formData.get('password') as string

  if (password === process.env.APP_PASSWORD?.trim()) {
    const cookieStore = await cookies()
    cookieStore.set('auth', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    })
    return { error: false, success: true }
  }

  return { error: true, success: false }
}
