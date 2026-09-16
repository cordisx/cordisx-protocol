import type { WalletSpendOperationV1, WalletSpendV1 } from './wallet-spend.v1.js'
declare const spend: WalletSpendV1
declare const scope: WalletSpendOperationV1
void spend.reserve({ ...scope, terms: '{}', requestId: 'spend:1' })
void spend.bindGameAccount({ ...scope, challenge: '{}' })
void spend.lookup({ ...scope, requestId: 'spend:1' })
void spend.applyDecision({ ...scope, decision: '{}' })
void spend.authorizeSource({ serviceOrigin: 'https://game.example', deadline: 1 })
void spend.purchase({
  storeId: 'pet',
  itemId: 'food',
  quantity: 1,
  expectedTotal: 5,
  requestId: 'order:1',
  deadline: 1,
})
// @ts-expect-error Caller-provided approval is not authority.
void spend.reserve({ ...scope, terms: '{}', requestId: 'spend:1', approved: true })
// @ts-expect-error The original wallet cannot be selected by a caller.
void spend.reserve({ ...scope, terms: '{}', requestId: 'spend:1', accountId: 'other' })
// @ts-expect-error There is no arbitrary signer.
void spend.sign({ bytes: 'anything' })
// @ts-expect-error There is no remote mint or transfer.
void spend.mint({ amount: 1 })
