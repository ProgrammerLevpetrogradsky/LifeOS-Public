import { createAuthClient } from '@neon/auth'
import { BetterAuthReactAdapter } from '@neon/auth/react/adapters'

const url = import.meta.env.VITE_NEON_AUTH_URL
export const accountAuth = url && import.meta.env.VITE_LIFEOS_ACCOUNTS_ENABLED === 'true'
  ? createAuthClient(url, { adapter: BetterAuthReactAdapter() })
  : null

export type AccountAuth = NonNullable<typeof accountAuth>
