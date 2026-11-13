import { onIdTokenChanged, type User } from '@firebase/auth'
import { useEffect, useState } from 'react'
import App from './App'
import { accountAuth } from './accounts'
import AccountPanel from './settings/AccountPanel'
import { STORAGE_KEY } from './data'

export default function AccountApp() {
  const [session, setSession] = useState<{ user: User | null }>()
  useEffect(() => {
    if (accountAuth) return onIdTokenChanged(accountAuth, user => setSession({ user }))
  }, [])

  if (!accountAuth) return <App />
  if (!session) return <main className="settings-page"><p role="status">Opening LifeOS…</p></main>

  const { user } = session
  const storageKey = user?.emailVerified ? `${STORAGE_KEY}.account.${user.uid}` : undefined
  return <App key={storageKey ?? STORAGE_KEY} storageKey={storageKey}
    account={<AccountPanel auth={accountAuth} user={user} onVerified={user => setSession({ user })} />} />
}
