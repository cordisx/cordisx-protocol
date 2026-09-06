import type { Context } from '@deepseek-ai/cordis'
import type {
  ChannelAdapterDefinition,
  ChannelNotification,
  ChannelRuntimeV1,
  ChannelTenantRef,
} from '@cordisx/protocol/channel-runtime/v1'

const account = { adapterId: 'simulator', accountId: 'local', tenantId: 'test' } satisfies ChannelTenantRef

const adapter = {
  descriptor: {
    ref: account,
    kind: 'simulator',
    implementationStatus: 'verified',
    configurationRevision: 1,
    secretState: 'unavailable',
  },
  start: async () => ({
    send: async delivery => ({ externalMessageId: `simulated-${delivery.deliveryId}` }),
    stop: async () => {},
  }),
} satisfies ChannelAdapterDefinition

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
  const registration = await channel.adapters.register(adapter)
  const delivery = await channel.messages.send(notification)
  await delivery.cancel()
  await registration.dispose()
}

void useChannel
