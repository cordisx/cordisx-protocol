import type { Context } from '@deepseek-ai/cordis'
import type {
  ChannelAdapterDefinition,
  ChannelNotification,
  ChannelRuntimeV1,
  ChannelTenantRef,
} from '@cordisx/protocol/channel-runtime/v1'

const account = { adapterId: 'simulator', accountId: 'local', tenantId: 'test' } satisfies ChannelTenantRef

function adapterFor(channel: ChannelRuntimeV1): ChannelAdapterDefinition {
  return {
    descriptor: {
      ref: account,
      kind: 'simulator',
      implementationStatus: 'verified',
      configurationRevision: channel.configuration.revision,
      secretState: 'unavailable',
    },
    start: async () => ({
      send: async delivery => ({ externalMessageId: `simulated-${delivery.deliveryId}` }),
      stop: async () => {},
    }),
  }
}

const notification = {
  target: {
    ...account,
    conversationId: 'direct-alice',
    kind: 'direct',
    threadId: 'direct-alice',
    semantics: 'conversation',
  },
  kind: 'reply',
  text: 'Hello',
} satisfies ChannelNotification

declare const context: Context
const channel: ChannelRuntimeV1 = context.channel

async function useChannel() {
  channel.configuration.revision satisfies number
  const registration = await channel.adapters.register(adapterFor(channel))
  const delivery = await channel.messages.send(notification)
  await delivery.cancel()
  await registration.dispose()
}

// @ts-expect-error The Host-stamped revision is read-only.
channel.configuration.revision = 2
// @ts-expect-error The Host-owned configuration projection is read-only.
channel.configuration = { revision: 2 }
// @ts-expect-error The public projection exposes no source, generation, or path for callers to replace.
channel.configuration.generation = 'caller-supplied'

void useChannel
