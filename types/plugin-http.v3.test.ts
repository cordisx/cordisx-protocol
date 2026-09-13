import type { HttpClientV3 } from './plugin-http.v3.js'
declare const http: HttpClientV3
const binding = {
  origin: 'http://127.0.0.1:3000',
  sourceId: 'local',
  instanceId: 'instance',
  audience: 'source-account',
} as const
http.connectAccount(binding)
http.submitWorkUsage({ ...binding, audience: 'work-income', baseline: true })
// @ts-expect-error caller identity is never authority
http.connectAccount({ ...binding, subject: 'forged' })
// @ts-expect-error no caller token or usage mint
http.submitWorkUsage({ ...binding, audience: 'work-income', amount: 500 })
// @ts-expect-error no caller snapshot
http.submitWorkUsage({ ...binding, audience: 'work-income', snapshot: {} })
