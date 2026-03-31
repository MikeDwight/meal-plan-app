'use client'

import { useActionState } from 'react'
import { loginAction } from './actions'

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, { error: false })

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 w-full max-w-xs">
        <div className="flex justify-center mb-6">
          <div className="bg-primary rounded-xl p-3">
            <span className="material-symbols-outlined text-bg-dark text-3xl">restaurant_menu</span>
          </div>
        </div>
        <h1 className="text-xl font-bold text-center mb-6 text-slate-900">Meal Plan App</h1>
        <form action={action} className="flex flex-col gap-4">
          <input
            type="password"
            inputMode="numeric"
            name="password"
            placeholder="Code d'accès"
            className="border border-slate-200 rounded-xl px-4 py-3 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
            autoFocus
          />
          {state.error && (
            <p className="text-red-500 text-sm text-center">Code incorrect</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="bg-primary text-bg-dark font-semibold rounded-xl px-4 py-3 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {pending ? 'Connexion...' : 'Entrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
