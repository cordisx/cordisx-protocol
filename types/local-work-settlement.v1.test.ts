import type { LocalWorkSettlementV1 } from './local-work-settlement.v1.js'
import type { HttpClientV4 } from './plugin-http.v4.js'
declare const service: LocalWorkSettlementV1
declare const http: HttpClientV4
const binding = {
  origin: 'http://127.0.0.1:3000',
  sourceId: 's',
  instanceId: 'i',
  audience: 'local-work-income',
} as const
void service.settle(binding)
void http.submitLocalWorkUsage({ ...binding, baseline: true })
// @ts-expect-error No caller baseline in durable settlement
void service.settle({ ...binding, baseline: true })
// @ts-expect-error The capability is independent of frozen HTTP v4
void http.settleLocalWorkIncome(binding)
// @ts-expect-error No caller snapshot
void service.settle({ ...binding, snapshot: {} })
// @ts-expect-error Cannot enroll or select a wallet
void service.settle({ ...binding, audience: 'local-wallet' })
