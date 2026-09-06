import type { Context } from '@deepseek-ai/cordis'
import type {
  PlatformProviderAdapterFactoryV1,
  PlatformProviderBrokerEventV1,
  PlatformProviderBrokerRequestV1,
  PlatformProviderBrokerResponseV1,
  PlatformProviderDefinitionV1,
  PlatformProviderDescriptorV1,
  PlatformProviderLifecycleEventV1,
  PlatformProviderServiceApplyV1,
  PlatformProvidersV1,
} from './platform-provider.v1.js'

const descriptor = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-descriptor.v1.schema.json',
  contract: 'cordisx.platform-provider-descriptor/v1',
  schemaVersion: 1,
  providerId: 'gateway-a',
  displayName: 'Gateway A',
  implementationStatus: 'experimental',
  operations: ['models.list', 'sessions.list', 'sessions.read'],
} as const satisfies PlatformProviderDescriptorV1

const createAdapter: PlatformProviderAdapterFactoryV1 = async input => ({
  providerId: input.providerId,
  providerGeneration: input.providerGeneration,
  models: {
    list: async () => ({ ok: true, value: { models: [] } }),
  },
  sessions: {
    list: async () => ({ ok: true, value: { sessions: [] } }),
    read: async () => ({ ok: false, error: { code: 'session-not-found', message: 'missing' } }),
    create: async () => ({ ok: false, error: { code: 'unsupported', message: 'unsupported' } }),
    control: async () => ({ ok: false, error: { code: 'unsupported', message: 'unsupported' } }),
  },
  turns: {
    submit: async () => ({ ok: false, error: { code: 'unsupported', message: 'unsupported' } }),
    control: async () => ({ ok: false, error: { code: 'unsupported', message: 'unsupported' } }),
    introduce: async () => ({ ok: false, error: { code: 'unsupported', message: 'unsupported' } }),
  },
  approvals: {
    decide: async () => ({ ok: false, error: { code: 'unsupported', message: 'unsupported' } }),
  },
  subscribeLifecycle: () => ({ subscriptionId: 'ppls_test', unsubscribe: () => undefined }),
  drain: async () => {},
  dispose: async () => {},
})

const definition = {
  descriptor,
  mapping: { models: [] },
  brokerRequest: {
    bindings: [{
      operation: 'models.list',
      direction: 'request',
      method: 'model/list',
      requestSchema:
        'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-broker-value.v1.schema.json',
      resultSchema:
        'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-broker-value.v1.schema.json',
    }],
  },
  createAdapter,
} satisfies PlatformProviderDefinitionV1

const valueSchema =
  'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-broker-value.v1.schema.json' as const
const brokerRequest = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-broker-request.v1.schema.json',
  contract: 'cordisx.platform-provider-broker-request/v1',
  schemaVersion: 1,
  requestId: 'request-1',
  operation: 'models.list',
  method: 'model/list',
  requestSchema: valueSchema,
  params: { cursor: null },
} satisfies PlatformProviderBrokerRequestV1

const lifecycleEvent = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-lifecycle-event.v1.schema.json',
  contract: 'cordisx.platform-provider-lifecycle-event/v1',
  schemaVersion: 1,
  eventId: 'event-1',
  sequence: 1,
  providerId: 'gateway-a',
  providerGeneration: 'provider-1',
  session: { providerId: 'gateway-a', remoteSessionId: 'session-1' },
  turnId: 'turn-1',
  type: 'turn.completed',
  terminal: true,
} satisfies PlatformProviderLifecycleEventV1

const lifecycleEnvelope = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-lifecycle-event.v1.schema.json',
  contract: 'cordisx.platform-provider-lifecycle-event/v1',
  schemaVersion: 1,
  eventId: 'event-invalid',
  sequence: 2,
  providerId: 'gateway-a',
  providerGeneration: 'provider-1',
  session: { providerId: 'gateway-a', remoteSessionId: 'session-1' },
  turnId: 'turn-1',
} as const

// @ts-expect-error completed events are terminal.
const nonTerminalCompletion: PlatformProviderLifecycleEventV1 = {
  ...lifecycleEnvelope,
  type: 'turn.completed',
  terminal: false,
}

// @ts-expect-error failed events require a failure payload.
const failureWithoutPayload: PlatformProviderLifecycleEventV1 = {
  ...lifecycleEnvelope,
  type: 'turn.failed',
  terminal: true,
}

// @ts-expect-error approval events require an approval payload.
const approvalWithoutPayload: PlatformProviderLifecycleEventV1 = {
  ...lifecycleEnvelope,
  type: 'approval.required',
  terminal: false,
}

// @ts-expect-error pending approvals cannot be resolved events.
const resolvedPendingApproval: PlatformProviderLifecycleEventV1 = {
  ...lifecycleEnvelope,
  type: 'approval.resolved',
  terminal: false,
  approval: { approvalId: 'approval-1', kind: 'command', state: 'pending' },
}

declare const brokerEvent: PlatformProviderBrokerEventV1
const brokerResponse = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/platform-provider-broker-response.v1.schema.json',
  contract: 'cordisx.platform-provider-broker-response/v1',
  schemaVersion: 1,
  eventId: brokerEvent.eventId,
  operation: brokerEvent.operation,
  method: brokerEvent.method,
  responseSchema: valueSchema,
  value: { decision: 'denied' },
} satisfies PlatformProviderBrokerResponseV1

declare const context: Context
const platformProviders: PlatformProvidersV1 = context.platformProviders
void platformProviders.register(definition)

const applyService: PlatformProviderServiceApplyV1 = async (serviceContext, input) => {
  input.owner.ownerHandle satisfies `ppo_${string}`
  await serviceContext.platformProviders.register(definition)
}

// @ts-expect-error Host authority is not exposed by the provider registry.
platformProviders.fleet

const rejectsPrivateFactoryAuthority: PlatformProviderAdapterFactoryV1 = async input => {
  // @ts-expect-error A factory receives no process launcher.
  void input.process
  // @ts-expect-error A broker exposes no raw network client.
  void input.broker.client
  // @ts-expect-error A broker exposes no Provider Fleet.
  void input.broker.fleet
  input.broker.policy.bindings[0].operation satisfies PlatformProviderDescriptorV1['operations'][number]
  void input.broker.exchange(brokerRequest, input.signal)
  void input.broker.respond(brokerResponse)
  input.broker.subscribe(['approvals.decide'], () => undefined).unsubscribe()
  return await createAdapter(input)
}

void rejectsPrivateFactoryAuthority
void applyService
void lifecycleEvent
void nonTerminalCompletion
void failureWithoutPayload
void approvalWithoutPayload
void resolvedPendingApproval
