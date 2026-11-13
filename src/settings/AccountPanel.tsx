import { useState, type FormEvent } from 'react'
import type { AccountAuth } from '../accounts'

type Mode = 'sign-in' | 'sign-up' | 'reset'
type AccountUser = { email: string }

export default function AccountPanel({ auth, user, refreshSession }: {
  auth: AccountAuth; user?: AccountUser; refreshSession: () => Promise<unknown>
}) {
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try { await action() }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not connect. Try again.') }
    finally { setBusy(false) }
  }

  function changeMode(next: Mode) {
    setMode(next)
    setPassword('')
    setError('')
    setNotice('')
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void run(async () => {
      const address = email.trim()
      if (mode === 'reset') {
        try {
          const result = await auth.requestPasswordReset({ email: address, redirectTo: `${window.location.origin}/?account=reset` })
          if (result.error && result.error.status !== 404) throw result.error
        } catch {
          throw new Error('Could not request a reset. Try again.')
        }
        setNotice('If an account exists, check your email for a reset link.')
      } else if (mode === 'sign-up') {
        try {
          const result = await auth.signUp.email({ email: address, password, name: 'LifeOS member' })
          if (result.error) throw result.error
        } catch {
          throw new Error('Could not create the account. Try signing in if you already registered.')
        }
        await refreshSession()
        changeMode('sign-in')
        setNotice('Account created. Sign in to open your workspace.')
      } else {
        try {
          const result = await auth.signIn.email({ email: address, password })
          if (result.error) throw result.error
        } catch {
          throw new Error('Could not sign in. Check your email and password.')
        }
        await refreshSession()
      }
    })
  }

  return <div className="settings-page__account">
    {user ? <>
      <p className="settings-page__description settings-page__email">{user.email}</p>
      <button className="settings-page__action" disabled={busy} onClick={() => void run(async () => {
        const result = await auth.signOut()
        if (result.error) throw new Error('Could not sign out. Try again.')
        await refreshSession()
        changeMode('sign-in')
      })}>Sign out</button>
    </> : <form className="settings-page__account" onSubmit={submit}>
      <label className="settings-page__field">Email
        <input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.currentTarget.value)} />
      </label>
      {mode !== 'reset' && <label className="settings-page__field">Password
        <input type="password" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
          required minLength={mode === 'sign-up' ? 8 : undefined} value={password} onChange={event => setPassword(event.currentTarget.value)} />
      </label>}
      <button className="settings-page__action" type="submit" disabled={busy}>
        {mode === 'sign-up' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}
      </button>
      <div className="settings-page__account-links">
        {mode !== 'sign-in' && <button type="button" disabled={busy} onClick={() => changeMode('sign-in')}>Sign in</button>}
        {mode === 'sign-in' && <>
          <button type="button" disabled={busy} onClick={() => changeMode('sign-up')}>Create account</button>
          <button type="button" disabled={busy} onClick={() => changeMode('reset')}>Forgot password?</button>
        </>}
      </div>
    </form>}
    {notice && <p className="settings-page__description" role="status">{notice}</p>}
    {error && <p className="settings-page__description" role="alert">{error}</p>}
    <p className="settings-page__description">Your account works on other devices. Tasks and notes stay in this browser.</p>
  </div>
}
