import type { AgentAvatarRef } from './agent-avatar.v1.js'
import type { AgentDefinitionIdentity } from './agents.v1.js'
import type { LocalizedText, ManagerContentProjection, RouteReference } from './manager-content-navigation.v1.js'
import type { ManagerContentNavigationTabV2 } from './manager-content-navigation.v2.js'

export type ManagerContentNavigationLocalizedTextV3 = LocalizedText
export type ManagerContentNavigationRouteReferenceV3 = RouteReference
export type ManagerContentNavigationTabV3 = ManagerContentNavigationTabV2

export interface ManagerContentNavigationAgentDefinitionSubjectV3 {
  readonly kind: 'agent-definition'
  readonly identity: AgentDefinitionIdentity
}

export type ManagerContentNavigationSubjectV3 = ManagerContentNavigationAgentDefinitionSubjectV3

export interface ManagerContentRecordSummaryLeadingVisualV3 {
  readonly kind: 'agent-avatar'
  readonly avatar: AgentAvatarRef
}

export interface ManagerContentRecordSummaryV3 {
  readonly leadingVisual: ManagerContentRecordSummaryLeadingVisualV3
  readonly title: LocalizedText & { readonly fallback: string }
  readonly description?: LocalizedText & { readonly fallback: string }
}

export interface ManagerContentNavigationDeclarationV3 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-navigation.v3.schema.json'
  readonly schemaVersion: 3
  readonly id: string
  readonly route: RouteReference
  readonly parentRoute?: RouteReference
  readonly header: {
    readonly title:
      | { readonly kind: 'route' }
      | { readonly kind: 'record'; readonly recordIdParam: string; readonly fallback: LocalizedText }
  }
  /** Exact room-neutral subject claimed by this detail route. */
  readonly subject?: ManagerContentNavigationSubjectV3
  /** Host-rendered fixed record chrome, positioned before the route tabs. */
  readonly recordSummary?: ManagerContentRecordSummaryV3
  readonly tabs?: ReadonlyArray<ManagerContentNavigationTabV3>
}

export interface ManagerContentRecordSummaryProjectionV2 {
  readonly leadingVisual: ManagerContentRecordSummaryLeadingVisualV3
  readonly title: LocalizedText & { readonly fallback: string }
  readonly description?: LocalizedText & { readonly fallback: string }
}

export interface ManagerContentProjectionV2 extends Omit<ManagerContentProjection, '$schema' | 'schemaVersion'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-projection.v2.schema.json'
  readonly schemaVersion: 2
  readonly recordSummary?: ManagerContentRecordSummaryProjectionV2
}
