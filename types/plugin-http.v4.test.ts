import type { HttpClientV4 } from './plugin-http.v4.js'
import type { HttpConnectionV1 } from './plugin-http.v1.js'
declare const http: HttpClientV4
declare const connection: HttpConnectionV1
const binding = {
  origin: 'http://127.0.0.1:3000',
  sourceId: 'local',
  instanceId: 'formal',
  audience: 'local-wallet',
} as const
http.connectLocalAccount(binding)
http.enrollLocalWallet({ binding: { ...binding, audience: 'local-wallet-enrollment' }, connection })
http.submitLocalWorkUsage({ ...binding, audience: 'local-work-income', baseline: true })
http.enrollLocalWallet({
  binding: { ...binding, audience: 'local-wallet-enrollment' },
  connection,
  // @ts-expect-error caller-selected accounts are never enrollment authority
  accountId: 'forged',
})
// @ts-expect-error no caller-selected identity
http.connectLocalAccount({ ...binding, subject: 'forged' })
// @ts-expect-error no caller-supplied work observations
http.submitLocalWorkUsage({ ...binding, audience: 'local-work-income', snapshot: {} })
// @ts-expect-error no caller-supplied financial amount
http.submitLocalWorkUsage({ ...binding, audience: 'local-work-income', amount: 1 })
