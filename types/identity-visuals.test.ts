import type { ManagerCollectionRegistryV2, ManagerCollectionSnapshotV2 } from './manager-collection.v2.js'
import type { ChannelManagerV3 } from './channel-manager.v3.js'
import type { RasterImageSnapshotV1 } from './raster-image.v1.js'

declare const registry: ManagerCollectionRegistryV2
declare const manager: ChannelManagerV3
declare const image: RasterImageSnapshotV1
const source = {
  snapshot: query => ({
    $schema:
      'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-collection-snapshot.v2.schema.json',
    contract: 'cordisx.manager-collection-snapshot/v2',
    schemaVersion: 2,
    collectionId: 'accounts',
    queryRevision: query.queryRevision,
    view: query.view,
    normalizedSearch: query.search.normalized,
    revision: 1,
    items: [{
      id: 'account',
      title: { key: 'title', fallback: 'Account' },
      summary: { key: 'summary', fallback: 'Platform' },
      leadingVisual: { kind: 'identity', icon: 'host:chat', avatar: image },
      route: { id: 'detail' },
      order: 0,
      disabled: { value: false },
      actions: [],
    }],
  } satisfies ManagerCollectionSnapshotV2),
  subscribe: () => () => undefined,
} satisfies Parameters<ManagerCollectionRegistryV2['registerV2']>[1]
declare const registration: Parameters<ManagerCollectionRegistryV2['registerV2']>[0]
registry.registerV2(registration, source)
// @ts-expect-error Explicit identity snapshots cannot be submitted through frozen register().
registry.register(registration, source)
manager.snapshotWithIdentity().accounts[0]?.accountAvatar satisfies RasterImageSnapshotV1 | undefined
// @ts-expect-error Frozen snapshot() never exposes new identity fields.
manager.snapshot().accounts[0]?.accountAvatar
manager.refreshIdentity(new AbortController().signal)
