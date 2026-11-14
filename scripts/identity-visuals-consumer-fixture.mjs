export const identityVisualsConsumerFixture = `
import type { ChannelManagerV3 } from '@cordisx/protocol/channel-manager/v3'
import type { ManagerCollectionRegistryV2, ManagerCollectionSnapshotV2 } from '@cordisx/protocol/manager-collection/v2'
declare const identityManager: ChannelManagerV3
declare const identityCollection: ManagerCollectionRegistryV2
identityManager.snapshotWithIdentity().accounts[0]?.accountName satisfies string | undefined
identityManager.refreshIdentity(new AbortController().signal)
// @ts-expect-error Frozen v2 methods do not expose the avatar field
identityManager.snapshot().accounts[0]?.accountAvatar
declare const identityRegistration: Parameters<ManagerCollectionRegistryV2['registerV2']>[0]
identityCollection.registerV2(identityRegistration, {
  snapshot: query => ({
    $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-collection-snapshot.v2.schema.json',
    contract: 'cordisx.manager-collection-snapshot/v2', schemaVersion: 2, collectionId: query.collectionId,
    queryRevision: query.queryRevision, view: query.view, normalizedSearch: query.search.normalized, revision: 1, items: [],
  } satisfies ManagerCollectionSnapshotV2),
  subscribe: () => () => undefined,
})
`
