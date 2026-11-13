import {
  createUserWithEmailAndPassword, reload, sendEmailVerification, sendPasswordResetEmail,
  signInWithEmailAndPassword, signOut, type Auth, type User,
} from '@firebase/auth'
import { useState, type FormEvent } from 'react'

type Mode = 'sign-in' | 'sign-up' | 'reset'

function errorMessage(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : ''
  if (code === 'auth/invalid-credential') return 'Email or password is incorrect.'
  if (code === 'auth/weak-password') return 'Choose a stronger password.'
  if (code === 'auth/too-many-requests') return 'Too many attempts. Try again later.'
  if (code === 'auth/network-request-failed') return 'Could not connect. Check your internet connection.'
  return 'Could not complete this request. Try again.'
}

export default function AccountPanel({ auth, user, onVerified }: {
  auth: Auth; user: User | null; onVerified: (user: User) => void
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
    catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void run(async () => {
      const address = email.trim()
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, address)
        setNotice('If an account exists for that email, a reset link will arrive shortly.')
      } else if (mode === 'sign-up') {
        const { user } = await createUserWithEmailAndPassword(auth, address, password)
        setPassword('')
        await sendEmailVerification(user)
      } else {
        await signInWithEmailAndPassword(auth, address, password)
        setPassword('')
      }
    })
  }

  function changeMode(next: Mode) {
    setMode(next)
    setPassword('')
    setError('')
    setNotice('')
  }

  return <div className="settings-page__account">
    {user ? <>
      <p className="settings-page__description settings-page__email">{user.email}</p>
      {!user.emailVerified && <>
        <p className="settings-page__description">Confirm your email to open your account workspace.</p>
        <button className="settings-page__action" disabled={busy} onClick={() => void run(async () => {
          await reload(user)
          if (user.emailVerified) onVerified(user)
          else setNotice('Open the verification link in your email, then try again.')
        })}>I verified my email</button>
        <button className="settings-page__action" disabled={busy} onClick={() => void run(async () => {
          await sendEmailVerification(user)
          setNotice('Verification email sent.')
        })}>Send verification email</button>
      </>}
      <button className="settings-page__action" disabled={busy} onClick={() => void run(async () => {
        await signOut(auth)
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
