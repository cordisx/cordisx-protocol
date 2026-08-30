declare const agentAvatarCanonicalSeedBrand: unique symbol
declare const agentAvatarOpaqueRefBrand: unique symbol

export type AgentAvatarCanonicalSeed = string & Readonly<{ [agentAvatarCanonicalSeedBrand]: 'cordisx.agent-avatar.seed/v1' }>
export type AgentAvatarInheritanceMode = 'inherit' | 'none'
export type AgentAvatarOpaqueRef = string & Readonly<{ [agentAvatarOpaqueRefBrand]: 'qualified-opaque-ref' }>

export type AgentAvatarGeneratedRef = Readonly<{
  kind: 'generated'
  algorithm: 'oneworks-avatar-seed'
  algorithmVersion: 1
  seed: AgentAvatarCanonicalSeed
}>

export type AgentAvatarAssetRef = Readonly<{
  kind: 'asset'
  ref: AgentAvatarOpaqueRef
  revision?: AgentAvatarOpaqueRef
}>

export type AgentAvatarDefinitionRef = Readonly<{
  kind: 'definition'
  ref: AgentAvatarOpaqueRef
  schema: 'oneworks.avatar'
  definitionVersion: 1
  revision?: AgentAvatarOpaqueRef
}>

export type AgentAvatarPlatformRef = Readonly<{
  kind: 'platform'
  provider: string
  identityRef: AgentAvatarOpaqueRef
  revision?: AgentAvatarOpaqueRef
}>

export type AgentAvatarRef =
  | AgentAvatarGeneratedRef
  | AgentAvatarAssetRef
  | AgentAvatarDefinitionRef
  | AgentAvatarPlatformRef

export type AgentAvatarSeedInput =
  | Readonly<{ namespace: 'agent-definition'; agentId: string }>
  | Readonly<{ namespace: 'unknown' }>

export interface AgentAvatarDefinitionResolutionInput {
  readonly agentId: string
  readonly avatar?: AgentAvatarRef
  readonly inherit: AgentAvatarInheritanceMode
  readonly parentAvatars?: readonly AgentAvatarRef[]
}

export type AgentAvatarResolutionResult =
  | Readonly<{
    $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-avatar-resolution-result.v1.schema.json'
    contract: 'cordisx.agent-avatar-resolution-result/v1'
    schemaVersion: 1
    status: 'resolved'
    avatar: AgentAvatarRef
  }>
  | Readonly<{
    $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-avatar-resolution-result.v1.schema.json'
    contract: 'cordisx.agent-avatar-resolution-result/v1'
    schemaVersion: 1
    status: 'unsupported'
    avatar: AgentAvatarRef
    code: 'unsupported-kind' | 'unsupported-provider' | 'reference-unavailable'
  }>

export declare const AGENT_AVATAR_UNKNOWN_SEED: AgentAvatarCanonicalSeed & 'cordisx.agent-avatar.seed/v1:unknown:0:'

/** Trim, NFC-normalize, UTF-8 length-prefix, and namespace one stable identity. */
export declare function canonicalizeAgentAvatarSeed(input: AgentAvatarSeedInput): AgentAvatarCanonicalSeed

/** Validate, detach, and deeply freeze one public reference. */
export declare function cloneAgentAvatarRef(ref: unknown): AgentAvatarRef

/** Create an immutable generated reference from a stable identity or the fixed unknown identity. */
export declare function createGeneratedAgentAvatarRef(input: AgentAvatarSeedInput): AgentAvatarGeneratedRef

/** Resolve an explicit child ref, an inheritable non-generated parent ref, or child-identity fallback. */
export declare function resolveAgentDefinitionAvatar(input: AgentAvatarDefinitionResolutionInput): AgentAvatarRef
