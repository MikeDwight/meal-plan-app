'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(false)

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/')
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 w-full max-w-xs">
        <div className="flex justify-center mb-6">
          <div className="bg-primary rounded-xl p-3">
            <span className="material-symbols-outlined text-bg-dark text-3xl">restaurant_menu</span>
          </div>
        </div>
        <h1 className="text-xl font-bold text-center mb-6 text-slate-900">Meal Plan App</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            inputMode="numeric"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Code d'accès"
            className="border border-slate-200 rounded-xl px-4 py-3 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
            autoFocus
          />
          {error && (
            <p className="text-red-500 text-sm text-center">Code incorrect</p>
          )}
          <button
            type="submit"
            className="bg-primary text-bg-dark font-semibold rounded-xl px-4 py-3 hover:opacity-90 transition-opacity"
          >
            Entrer
          </button>
        </form>
      </div>
    </div>
  )
}
