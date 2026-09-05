import type {
  AgentPageAdmissionRouteClaimRequest,
  AgentPageAdmissionRouteClaimService,
  AgentPageAdmissionRouteDeclarationRequest,
  AgentPageAdmissionRouteDeclarationService,
  AgentPageAdmissionRouteReservationRequest,
  AgentPageAdmissionRouteReservationService,
  AgentPageAdmissionRouteTarget,
  AgentPageAdmissionTarget,
  AgentPageAdmissionTargetRequest,
  AgentPageAdmissionTargetService,
  AgentPageComposerCommandAdapter,
  AgentPageComposerCommandContext,
  AgentPageComposerCommandRequest,
} from './agent-page-admission.v1.js'

declare const targets: AgentPageAdmissionTargetService
declare const routeDeclarations: AgentPageAdmissionRouteDeclarationService
declare const routeReservations: AgentPageAdmissionRouteReservationService
declare const routeClaims: AgentPageAdmissionRouteClaimService
declare const targetRequest: AgentPageAdmissionTargetRequest
declare const routeRequest: AgentPageAdmissionRouteDeclarationRequest
declare const routeReservation: AgentPageAdmissionRouteReservationRequest
declare const routeClaim: AgentPageAdmissionRouteClaimRequest
declare const pageContext: AgentPageComposerCommandContext
declare const pageCommands: AgentPageComposerCommandAdapter
declare const pageCommandRequest: AgentPageComposerCommandRequest

const existing = {
  roomId: 'room-existing',
  participantId: 'participant-lead',
  memberId: 'member-lead',
  runId: 'run-lead',
} satisfies AgentPageAdmissionTarget
targets.issue({ ...targetRequest, target: existing }).then((result) => {
  if (result.status === 'issued') result.receipt.target.roomId satisfies string
})

const fresh = {
  ...existing,
  roomId: 'room-fresh',
  route: { outlet: 'main', routeDefinitionId: 'room', param: 'roomId', roomId: 'room-fresh' },
} satisfies AgentPageAdmissionRouteTarget
routeDeclarations.declare({ ...routeRequest, target: fresh }).then((result) => {
  if (result.status === 'declared') {
    routeReservations.reserve({ ...routeReservation, continuation: result.continuation }).then((next) => {
      if (next.status === 'reserved') void next.reservation.submit()
    })
    routeClaims.claim({ ...routeClaim, continuation: result.continuation }).then((next) => {
      if (next.status === 'claimed') next.receipt.target.route.roomId satisfies string
    })
  }
})

pageContext.scope satisfies 'page-composer-submit'
pageContext.origin.scope satisfies 'page-composer-submit'
pageCommands.execute(pageCommandRequest).then((result) => result.status satisfies 'accepted' | 'denied' | 'unavailable')

const invalidFresh = {
  ...fresh,
  // @ts-expect-error a fresh Room claim cannot use an arbitrary route parameter
  route: { ...fresh.route, param: 'sessionId' },
} satisfies AgentPageAdmissionRouteTarget
void invalidFresh
