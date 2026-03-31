'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function loginAction(_prev: { error: boolean }, formData: FormData) {
  const password = formData.get('password') as string

  if (password === process.env.APP_PASSWORD?.trim()) {
    const cookieStore = await cookies()
    cookieStore.set('auth', password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    })
    redirect('/')
  }

  return { error: true }
}
