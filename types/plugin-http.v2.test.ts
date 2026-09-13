import type { HttpClientV2 } from './plugin-http.v2.js'
declare const client: HttpClientV2
client.resume({ origin: 'https://games.example', sourceId: 'game', accountId: '' })
client.forget({ origin: 'https://games.example', sourceId: 'game', accountId: 'configured-account' })
// @ts-expect-error tokens are not accepted
client.resume({ origin: 'https://games.example', sourceId: 'game', accountId: '', token: 'secret' })
// @ts-expect-error native identity belongs to Host
client.resume({ origin: 'https://games.example', sourceId: 'game', accountId: '', nativeAccount: 'account' })
// @ts-expect-error complete partition is required
client.resume({ origin: 'https://games.example' })
