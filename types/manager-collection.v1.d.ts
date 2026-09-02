import type { AgentAvatarRef } from '@cordisx/protocol/agent-avatar/v1'
import type {
  NavigationCollectionAction,
  NavigationCollectionActionFeedback,
  NavigationCollectionDisabledState,
  NavigationCollectionIconRef,
  NavigationCollectionJsonValue,
  NavigationCollectionLocalizedText,
  NavigationCollectionScalar,
} from '@cordisx/protocol/navigation-collection-actions/v1'

export type ManagerCollectionScalar = NavigationCollectionScalar
export type ManagerCollectionJsonValue = NavigationCollectionJsonValue
export type ManagerCollectionLocalizedText = NavigationCollectionLocalizedText
export type ManagerCollectionDisplayText = ManagerCollectionLocalizedText & { readonly fallback: string }
export type ManagerCollectionIconRef = NavigationCollectionIconRef
export type ManagerCollectionDisabledState = NavigationCollectionDisabledState
/** Exact Unicode 17.0.0 transform defined by the Manager collection v1 specification. */
export type ManagerCollectionSearchNormalization = 'nfkc-casefold'

export interface ManagerCollectionRouteReference {
  /** Same-owner local route id; qualified cross-owner ids are invalid. */
  readonly id: string
  readonly params?: Readonly<Record<string, ManagerCollectionScalar>>
}

export interface ManagerCollectionView {
  readonly id: string
  readonly label: ManagerCollectionDisplayText
  readonly emptyTitle: ManagerCollectionDisplayText
  readonly emptyDescription: ManagerCollectionDisplayText
}

export interface ManagerCollectionSearchDescriptor {
  readonly fields: readonly ['title', 'summary']
  readonly normalization: ManagerCollectionSearchNormalization
  readonly label: ManagerCollectionDisplayText
  readonly placeholder: ManagerCollectionDisplayText
  readonly noMatchTitle: ManagerCollectionDisplayText
  readonly noMatchDescription: ManagerCollectionDisplayText
}

export interface ManagerCollectionRegistrationV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-collection-registration.v1.schema.json'
  readonly contract: 'cordisx.manager-collection-registration/v1'
  readonly schemaVersion: 1
  readonly id: string
  readonly label: ManagerCollectionDisplayText
  readonly description: ManagerCollectionDisplayText
  readonly views: readonly ManagerCollectionView[]
  readonly defaultView: string
  readonly search: ManagerCollectionSearchDescriptor
}

export interface ManagerCollectionQueryV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-collection-query.v1.schema.json'
  readonly contract: 'cordisx.manager-collection-query/v1'
  readonly schemaVersion: 1
  readonly collectionId: string
  readonly queryRevision: number
  readonly view: string
  readonly search: Readonly<{
    readonly input: string
    /** Exact Host-generated value; a source may not substitute approximate lowercasing. */
    readonly normalized: string
  }>
}

export interface ManagerCollectionSemanticIconVisual {
  readonly kind: 'semantic-icon'
  readonly icon: `host:${string}`
}

export interface ManagerCollectionAvatarVisual {
  readonly kind: 'avatar'
  readonly avatar: AgentAvatarRef
}

export interface ManagerCollectionAvatarStackVisual {
  readonly kind: 'avatar-stack'
  readonly entries: readonly Readonly<{ readonly id: string; readonly avatar: AgentAvatarRef }>[]
}

export type ManagerCollectionLeadingVisual =
  | ManagerCollectionSemanticIconVisual
  | ManagerCollectionAvatarVisual
  | ManagerCollectionAvatarStackVisual

export interface ManagerCollectionTextInputCommandReference {
  readonly id: string
  readonly arguments?: Readonly<Record<string, ManagerCollectionJsonValue>>
}

export interface ManagerCollectionTextInputRequest {
  /** Host inserts the validated value under this new argument key. */
  readonly argument: string
  readonly title: ManagerCollectionDisplayText
  readonly description?: ManagerCollectionDisplayText
  readonly label: ManagerCollectionDisplayText
  readonly placeholder?: ManagerCollectionDisplayText
  readonly submitLabel: ManagerCollectionDisplayText
  readonly initialValue?: string
  readonly minLength: number
  readonly maxLength: number
  readonly trim: 'none' | 'both'
}

export interface ManagerCollectionTextInputAction {
  readonly kind: 'text-input-command'
  readonly id: string
  readonly label: ManagerCollectionDisplayText
  readonly ariaLabel?: ManagerCollectionDisplayText
  readonly icon?: ManagerCollectionIconRef
  readonly placement: 'direct' | 'overflow'
  readonly tone: 'neutral'
  readonly pressed: boolean
  readonly disabled: ManagerCollectionDisabledState
  readonly command: ManagerCollectionTextInputCommandReference
  readonly input: ManagerCollectionTextInputRequest
  readonly feedback: NavigationCollectionActionFeedback
}

export type ManagerCollectionAction = NavigationCollectionAction | ManagerCollectionTextInputAction

export interface ManagerCollectionItem {
  readonly id: string
  readonly title: ManagerCollectionDisplayText
  /** Public product summary; Host search never reads private metadata. */
  readonly summary: ManagerCollectionDisplayText
  readonly leadingVisual: ManagerCollectionLeadingVisual
  readonly route: ManagerCollectionRouteReference
  readonly order: number
  readonly disabled: ManagerCollectionDisabledState
  readonly actions: readonly ManagerCollectionAction[]
}

export interface ManagerCollectionSnapshotV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-collection-snapshot.v1.schema.json'
  readonly contract: 'cordisx.manager-collection-snapshot/v1'
  readonly schemaVersion: 1
  readonly collectionId: string
  readonly queryRevision: number
  readonly view: string
  readonly normalizedSearch: string
  readonly revision: number
  readonly items: readonly ManagerCollectionItem[]
}

export type ManagerCollectionActionResultStatus = 'applied' | 'rejected' | 'conflict' | 'unavailable'

export interface ManagerCollectionActionResultBaseV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-collection-action-result.v1.schema.json'
  readonly contract: 'cordisx.manager-collection-action-result/v1'
  readonly schemaVersion: 1
  readonly collectionId: string
  readonly itemId: string
  readonly actionId: string
  readonly code: string
}

export type ManagerCollectionActionResultV1 = ManagerCollectionActionResultBaseV1 & (
  | Readonly<{ readonly status: 'applied'; readonly revision: number }>
  | Readonly<{ readonly status: Exclude<ManagerCollectionActionResultStatus, 'applied'>; readonly revision?: never }>
)

/** Data-only source; the Host owns controls, rendering, filtering defense, and lifetime. */
export interface ManagerCollectionSourceV1 {
  snapshot(query: ManagerCollectionQueryV1, signal: AbortSignal): ManagerCollectionSnapshotV1 | Promise<ManagerCollectionSnapshotV1>
  subscribe(listener: () => void): () => void
  dispose?(): void
}

export interface ManagerCollectionRegistrationHandleV1 {
  dispose(): void
}

/**
 * Host-injected, current-manager-page-scoped registry. Its sole active v1
 * registration claims a Host-created child root that is never exposed here.
 */
export interface ManagerCollectionRegistryV1 {
  register(
    registration: ManagerCollectionRegistrationV1,
    source: ManagerCollectionSourceV1,
  ): ManagerCollectionRegistrationHandleV1
}
