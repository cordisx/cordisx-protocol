import type { Context } from '@deepseek-ai/cordis'
import type {
  ChannelManagerRequestV2,
  ChannelManagerSnapshotV3,
  ChannelManagerTargetRequestV1,
  ChannelManagerV2,
} from '@cordisx/protocol/channel-manager/v2'

const snapshot = {
  contract: 'cordisx.channel-runtime-snapshot/v3',
  schemaVersion: 3,
  profileId: 'default',
  hostGeneration: 'host-1',
  revision: 4,
  observedAt: '2026-09-07T00:00:00.000Z',
  availableOperations: ['target.connection.create.simulator'],
  accounts: [],
  bindings: [],
  pendingAuthorizations: [],
} satisfies ChannelManagerSnapshotV3

const targetRequest = {
  contract: 'cordisx.channel-manager-target-request/v1',
  schemaVersion: 1,
  requestId: 'target-1',
  expectedRevision: snapshot.revision,
  profileId: snapshot.profileId,
  hostGeneration: snapshot.hostGeneration,
  operation: 'target.connection.create.simulator',
  adapterKind: 'simulator',
  target: { kind: 'root' },
} satisfies ChannelManagerTargetRequestV1

const actionRequest = {
  contract: 'cordisx.channel-manager-request/v2',
  schemaVersion: 2,
  requestId: 'reconnect-1',
  expectedRevision: snapshot.revision,
  profileId: snapshot.profileId,
  hostGeneration: snapshot.hostGeneration,
  operation: 'connection.reconnect',
  target: { kind: 'connection', connectionToken: 'chm1_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
} satisfies ChannelManagerRequestV2

declare const context: Context
const manager: ChannelManagerV2 = context.channelManager

async function useManager() {
  const issued = await manager.issue(targetRequest)
  if (issued.status === 'applied') void issued.target
  const result = await manager.execute(actionRequest)
  void result.revision
  const dispose = manager.subscribe(() => void manager.snapshot())
  dispose.dispose()
}

void useManager
