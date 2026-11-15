/* Service/account boundary fixture consumed by the installed-package gate. */
export const distributionServicesConsumerFixture =
  `import type { WalletSpendV1 } from '@cordisx/protocol/wallet-spend/v1'
import type { WalletPoolV1 } from '@cordisx/protocol/wallet-pool/v1'
declare const walletPool: WalletPoolV1
walletPool.reserve({source:{serviceOrigin:'https://game.example',serverId:'game',servicePublicKey:'public'},terms:'{}',requestId:'pool:1',deadline:1})
// @ts-expect-error Consumers cannot supply approval or an unsigned payout amount
walletPool.applyDecision({source:{serviceOrigin:'https://game.example',serverId:'game',servicePublicKey:'public'},decision:'{}',deadline:1,approved:true,amount:100})
// @ts-expect-error No arbitrary mint or signer
walletPool.mint(100)
declare const walletSpend: WalletSpendV1
const optionalPool: WalletPoolV1 | undefined = walletSpend.pool
void optionalPool
walletSpend.reserve({source:{serviceOrigin:'https://game.example',serverId:'game',servicePublicKey:'public'},terms:'{}',requestId:'spend:1',deadline:1})
// @ts-expect-error No arbitrary signer
walletSpend.sign({bytes:'anything'})
// @ts-expect-error No caller approval/amount
walletSpend.reserve({source:{serviceOrigin:'https://game.example',serverId:'game',servicePublicKey:'public'},terms:'{}',requestId:'spend:1',deadline:1,approved:true,amount:100})
import type { HttpClientV3 } from '@cordisx/protocol/plugin-http/v3'
import type { HttpClientV4 } from '@cordisx/protocol/plugin-http/v4'
import type { LocalWorkSettlementV1 } from '@cordisx/protocol/local-work-settlement/v1'
import { localWorkSettlementReceipt } from '@cordisx/protocol/local-work-settlement/v1'
declare const settlement: LocalWorkSettlementV1
settlement.settle({origin:'http://127.0.0.1:3000',sourceId:'source',instanceId:'instance',audience:'local-work-income'})
// @ts-expect-error No leased baseline in durable settlement
settlement.settle({origin:'http://127.0.0.1:3000',sourceId:'source',instanceId:'instance',audience:'local-work-income',baseline:true})
void localWorkSettlementReceipt
import { localWalletBytes } from '@cordisx/protocol/local-wallet/v1'
declare const localHttp: HttpClientV4
declare const localConnection: Parameters<HttpClientV4['enrollLocalWallet']>[0]['connection']
const localBinding = { origin: 'http://127.0.0.1:3000', sourceId: 'source', instanceId: 'instance', audience: 'local-wallet' } as const
localHttp.connectLocalAccount(localBinding)
localHttp.enrollLocalWallet({ binding: { ...localBinding, audience: 'local-wallet-enrollment' }, connection: localConnection })
localHttp.submitLocalWorkUsage({ ...localBinding, audience: 'local-work-income', baseline: true })
// @ts-expect-error callers cannot pick an account
localHttp.connectLocalAccount({ ...localBinding, accountId: 'forged' })
localWalletBytes(localBinding)
declare const managedHttp: HttpClientV3
const managedBinding = { origin: 'http://127.0.0.1:3000', sourceId: 'source', instanceId: 'instance', audience: 'source-account' } as const
managedHttp.connectAccount(managedBinding)
managedHttp.submitWorkUsage({ ...managedBinding, audience: 'work-income', baseline: true })
// @ts-expect-error usage/amount cannot be submitted by a page
managedHttp.submitWorkUsage({ ...managedBinding, audience: 'work-income', amount: 123 })
import { managedSourceBytes } from '@cordisx/protocol/managed-source/v1'
managedSourceBytes(managedBinding)
import type { PageHeaderActionV4 } from '@cordisx/protocol/page/v4'
import type { CurrentUserProfileV1, CurrentUserV1 } from '@cordisx/protocol/current-user/v1'
const localUserProfile = { subject: 'host:opaque', displayName: 'Player' } satisfies CurrentUserProfileV1
declare const currentUser: CurrentUserV1
currentUser.read().then(result => result.status === 'available' ? result.profile.subject : result.reason)
currentUser.subscribe(result => result.status)
// @ts-expect-error native credentials never appear in the display profile
const tokenUserProfile = { ...localUserProfile, accessToken: 'private' } satisfies CurrentUserProfileV1
void tokenUserProfile
import type { GameUiClientV1, GameUiParticipantV1, GameUiSeatV1, GameUiSnapshotV1 } from '@cordisx/protocol/isolated-game-ui/v1'
const gameParticipant = { seatIndex: 0, name: 'Player', kind: 'human', isOwner: true } satisfies GameUiParticipantV1
const gameSnapshot = { matchId: 'match', sequence: 0, observation: {}, status: 'waiting', canAct: false, readOnly: false, theme: 'light', participants: [gameParticipant] } satisfies GameUiSnapshotV1
declare const gameSeat: GameUiSeatV1
gameSeat.publish(gameSnapshot)
declare const gameClient: GameUiClientV1
gameClient.subscribe(snapshot => snapshot.participants?.[0].seatIndex satisfies number | undefined)
// @ts-expect-error participant metadata excludes account identity
const privateGameParticipant = { ...gameParticipant, accountId: 'private' } satisfies GameUiParticipantV1
void privateGameParticipant
`
