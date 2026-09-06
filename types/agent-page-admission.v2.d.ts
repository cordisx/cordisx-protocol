import type {
  AgentPageAdmissionRouteTarget,
  AgentPageComposerCommandAdapter as AgentPageComposerCommandAdapterV1,
  AgentPageComposerCommandContext as AgentPageComposerCommandContextV1,
  AgentPageComposerCommandRequest,
  AgentPageComposerCommandResult as AgentPageComposerCommandResultV1,
  AgentPageComposerOrigin,
  AgentPageRoomRoute,
  AgentPageAdmissionTarget,
} from './agent-page-admission.v1.js'
import type { MessageId, SessionId } from './sessions.v1.js'

export * from './agent-page-admission.v1.js'

declare const pageFreshRoomNavigationCapability: unique symbol
/** Opaque Host navigation permit for one fully submitted fresh-Room command. */
export interface AgentPageFreshRoomNavigation {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-page-fresh-room-navigation.v1.schema.json'
  readonly contract: 'cordisx.agent-page-fresh-room-navigation/v1'
  readonly schemaVersion: 1
  readonly token: string
  readonly [pageFreshRoomNavigationCapability]: never
}

/** A plugin may request only the exact fresh Room route declared in its command. */
export interface AgentPageFreshRoomNavigationRequest {
  readonly navigation: AgentPageFreshRoomNavigation
  readonly route: AgentPageRoomRoute
}
export type AgentPageFreshRoomNavigationResult =
  | { readonly status: 'accepted'; readonly code: 'claimed'; readonly roomId: string }
  | { readonly status: 'denied'; readonly code: 'not-owner' | 'navigation-denied' | 'route-mismatch' | 'not-submitted' | 'incomplete-submission' | 'reused' }
  | { readonly status: 'unavailable'; readonly code: 'page-replaced' | 'plugin-generation-replaced' | 'connection-replaced' | 'command-complete' | 'claim-failed' | 'navigation-failed' | 'revoked' }
/** Host-owned service. It navigates and claims before its accepted result resolves. */
export interface AgentPageFreshRoomNavigationService {
  navigate(request: AgentPageFreshRoomNavigationRequest): Promise<AgentPageFreshRoomNavigationResult>
}

/** Exact Host-stamped result for one delivery accepted before the driver ran. */
export interface AgentPageAdmissionAcceptedDelivery {
  readonly target: AgentPageAdmissionTarget
  readonly status: 'accepted'
  readonly sessionId: SessionId
  readonly messageId: MessageId
}
/** Exact target failure; it never carries a synthesized Session or message id. */
export interface AgentPageAdmissionDeniedDelivery {
  readonly target: AgentPageAdmissionTarget
  readonly status: 'denied'
  readonly code: 'reservation-denied' | 'submit-denied' | 'stale' | 'page-replaced' | 'plugin-generation-replaced' | 'connection-replaced' | 'command-complete' | 'revoked'
}
export type AgentPageAdmissionDeliveryOutcome =
  | AgentPageAdmissionAcceptedDelivery
  | AgentPageAdmissionDeniedDelivery

/** Host-derived completion returned to the mounted page only after its handler settles. */
export type AgentPageComposerCommandResult =
  | {
      readonly status: 'accepted'
      readonly code: 'submitted'
      readonly disposition: 'existing-room' | 'fresh-room'
      readonly roomId: string
      /** Every returned delivery target has this exact Room id. */
      readonly deliveries: readonly [AgentPageAdmissionAcceptedDelivery, ...AgentPageAdmissionAcceptedDelivery[]]
    }
  | {
      readonly status: 'failed'
      readonly code: 'handler-failed' | 'incomplete-submission' | 'navigation-failed' | 'claim-failed'
      readonly roomId?: string
      readonly deliveries: readonly AgentPageAdmissionDeliveryOutcome[]
    }
  | Exclude<AgentPageComposerCommandResultV1, { readonly status: 'accepted' }>

/**
 * Host context passed to the existing generic handler. A fresh navigation
 * permit exists only for a fresh page origin; navigation denies until the Host
 * has recorded every declared fresh target as submitted.
 */
export type AgentPageComposerCommandContext = Omit<
  AgentPageComposerCommandContextV1,
  '$schema' | 'contract' | 'schemaVersion'
> & {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/agent-page-composer-command-context.v2.schema.json'
  readonly contract: 'cordisx.agent-page-composer-command-context/v2'
  readonly schemaVersion: 2
  readonly freshRoomNavigation?: AgentPageFreshRoomNavigation
}

/**
 * Additive round-trip adapter. It waits for the generic handler and returns a
 * Host-derived completion; `accepted` never means merely dispatched.
 */
export interface AgentPageComposerCommandAdapter extends Omit<AgentPageComposerCommandAdapterV1, 'execute'> {
  execute(request: AgentPageComposerCommandRequest): Promise<AgentPageComposerCommandResult>
}

/** The handler's fresh target remains the frozen v1 exact route target. */
export type AgentPageFreshRoomTarget = AgentPageAdmissionRouteTarget
/** The Host-minted origin remains v1; v2 changes completion, never origin minting. */
export type AgentPageComposerOriginV1 = AgentPageComposerOrigin
