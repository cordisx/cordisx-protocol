import {
  AGENT_AVATAR_UNKNOWN_SEED,
  type AgentAvatarCanonicalSeed,
  type AgentAvatarRef,
  type AgentAvatarResolutionResult,
  canonicalizeAgentAvatarSeed,
  cloneAgentAvatarRef,
  createGeneratedAgentAvatarRef,
  resolveAgentDefinitionAvatar,
} from '@cordisx/protocol/agent-avatar/v1'

const explicit = cloneAgentAvatarRef({
  kind: 'definition',
  ref: 'avatar:reviewer',
  schema: 'oneworks.avatar',
  definitionVersion: 1,
  revision: 'revision:v2',
})

const canonical = canonicalizeAgentAvatarSeed({ namespace: 'agent-definition', agentId: ' reviewer ' })
canonical satisfies AgentAvatarCanonicalSeed
AGENT_AVATAR_UNKNOWN_SEED satisfies 'cordisx.agent-avatar.seed/v1:unknown:0:'

const generated = createGeneratedAgentAvatarRef({ namespace: 'agent-definition', agentId: 'reviewer' })
generated.algorithm satisfies 'oneworks-avatar-seed'
generated.algorithmVersion satisfies 1

const cloned = cloneAgentAvatarRef(explicit)
cloned.kind satisfies AgentAvatarRef['kind']

const effective = resolveAgentDefinitionAvatar({
  agentId: 'reviewer-child',
  inherit: 'inherit',
  parentAvatars: [generated, explicit],
})
effective.kind satisfies AgentAvatarRef['kind']

const platform = cloneAgentAvatarRef({ kind: 'platform', provider: 'github', identityRef: 'account:reviewer' })
const unsupported = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-avatar-resolution-result.v1.schema.json',
  contract: 'cordisx.agent-avatar-resolution-result/v1',
  schemaVersion: 1,
  status: 'unsupported',
  avatar: platform,
  code: 'unsupported-provider',
} satisfies AgentAvatarResolutionResult

void canonical
void cloned
void effective
void unsupported

const invalidAlgorithm: AgentAvatarRef = {
  kind: 'generated',
  // @ts-expect-error generated algorithms are closed in v1
  algorithm: 'other',
  algorithmVersion: 1,
  seed: AGENT_AVATAR_UNKNOWN_SEED,
}
void invalidAlgorithm

const invalidDefinitionSchema: AgentAvatarRef = {
  kind: 'definition',
  // @ts-expect-error definition refs must carry the qualified opaque-ref brand
  ref: 'avatar:reviewer',
  // @ts-expect-error definition schema names are closed in v1
  schema: 'other.avatar',
  definitionVersion: 1,
}
void invalidDefinitionSchema

// @ts-expect-error public refs are qualified and naked base64 is not a ref
const nakedBase64: AgentAvatarRef = { kind: 'asset', ref: 'YWJjZA==' }
void nakedBase64

// @ts-expect-error raw URLs cannot enter the branded public ref type
const rawUrl: AgentAvatarRef = { kind: 'asset', ref: 'https://example.test/avatar.png' }
void rawUrl

// @ts-expect-error raw paths cannot enter the branded public ref type
const rawPath: AgentAvatarRef = { kind: 'asset', ref: 'C:\\Users\\avatar.png' }
void rawPath

// @ts-expect-error arbitrary prefixed strings are not canonical seeds
const arbitrarySeed: AgentAvatarCanonicalSeed = 'cordisx.agent-avatar.seed/v1:not-canonical'
void arbitrarySeed
