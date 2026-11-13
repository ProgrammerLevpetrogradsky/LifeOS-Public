import { useState, type FormEvent } from 'react'
import type { AccountAuth } from '../accounts'

type Mode = 'sign-in' | 'sign-up' | 'verify' | 'reset'
type AccountUser = { email: string; emailVerified: boolean }

export default function AccountPanel({ auth, user }: { auth: AccountAuth; user?: AccountUser }) {
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
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
    setCode('')
    setError('')
    setNotice('')
  }

  const address = user?.email ?? email.trim()
  const verify = mode === 'verify' || (user && !user.emailVerified)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void run(async () => {
      if (verify) {
        const result = await auth.$fetch('/email-otp/verify-email', {
          method: 'POST', body: { email: address, otp: code.trim() },
        })
        if (result.error) throw new Error('The code is invalid or has expired.')
        changeMode('sign-in')
        setNotice('Email verified. Sign in to open your workspace.')
      } else if (mode === 'reset') {
        const result = await auth.requestPasswordReset({ email: address, redirectTo: `${window.location.origin}/?account=reset` })
        if (result.error && result.error.status !== 404) throw new Error('Could not request a reset. Try again.')
        setNotice('If an account exists, check your email for a reset link.')
      } else if (mode === 'sign-up') {
        const result = await auth.signUp.email({ email: address, password, name: 'LifeOS member' })
        if (result.error) throw new Error('Could not create the account. Try signing in if you already registered.')
        changeMode('verify')
        if (result.data?.user.emailVerified) changeMode('sign-in')
        else setNotice('Enter the verification code from your email.')
      } else {
        const result = await auth.signIn.email({ email: address, password })
        if (result.error?.code === 'EMAIL_NOT_VERIFIED') {
          changeMode('verify')
          setNotice('Enter your verification code or request a new one.')
        } else if (result.error) {
          throw new Error('Could not sign in. Check your email and password.')
        }
      }
    })
  }

  return <div className="settings-page__account">
    {user?.emailVerified ? <>
      <p className="settings-page__description settings-page__email">{user.email}</p>
      <button className="settings-page__action" disabled={busy} onClick={() => void run(async () => {
        const result = await auth.signOut()
        if (result.error) throw new Error('Could not sign out. Try again.')
        changeMode('sign-in')
      })}>Sign out</button>
    </> : <form className="settings-page__account" onSubmit={submit}>
      {verify ? <label className="settings-page__field">Verification code
        <input inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}"
          value={code} onChange={event => setCode(event.currentTarget.value)} />
      </label> : <label className="settings-page__field">Email
        <input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.currentTarget.value)} />
      </label>}
      {!verify && mode !== 'reset' && <label className="settings-page__field">Password
        <input type="password" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
          required minLength={mode === 'sign-up' ? 8 : undefined} value={password} onChange={event => setPassword(event.currentTarget.value)} />
      </label>}
      <button className="settings-page__action" type="submit" disabled={busy}>
        {verify ? 'Verify email' : mode === 'sign-up' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}
      </button>
      <div className="settings-page__account-links">
        {verify && <button type="button" disabled={busy} onClick={() => void run(async () => {
          const result = await auth.$fetch('/email-otp/send-verification-otp', {
            method: 'POST', body: { email: address, type: 'email-verification' },
          })
          if (result.error) throw new Error('Could not send a code. Try again later.')
          setNotice('Verification code sent.')
        })}>Send a new code</button>}
        {user && verify && <button type="button" disabled={busy} onClick={() => void run(async () => {
          const result = await auth.signOut()
          if (result.error) throw new Error('Could not sign out. Try again.')
          changeMode('sign-in')
        })}>Sign out</button>}
        {!user && mode !== 'sign-in' && <button type="button" disabled={busy} onClick={() => changeMode('sign-in')}>Sign in</button>}
        {!verify && mode === 'sign-in' && <>
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
