import type {
  AgentAdmissionBootstrapRouteClaimRequest,
  AgentAdmissionBootstrapRouteClaimService,
  AgentAdmissionBootstrapRouteDeclarationRequest,
  AgentAdmissionBootstrapRouteDeclarationService,
  AgentAdmissionBootstrapRouteReservationRequest,
  AgentAdmissionBootstrapRouteReservationService,
  AgentAdmissionBootstrapRouteTarget,
} from './agent-admission.v6.js'

declare const declarations: AgentAdmissionBootstrapRouteDeclarationService
declare const reservations: AgentAdmissionBootstrapRouteReservationService
declare const claims: AgentAdmissionBootstrapRouteClaimService
declare const declaration: AgentAdmissionBootstrapRouteDeclarationRequest
declare const reservation: AgentAdmissionBootstrapRouteReservationRequest
declare const claim: AgentAdmissionBootstrapRouteClaimRequest

const target = {
  roomId: 'room-fresh',
  participantId: 'participant-lead',
  memberId: 'member-lead',
  runId: 'run-lead',
  route: { routeId: 'room', param: 'roomId', roomId: 'room-fresh' },
} satisfies AgentAdmissionBootstrapRouteTarget
target.route.param satisfies 'roomId'

declarations.declare({ ...declaration, target }).then(result => {
  if (result.status === 'declared') {
    reservations.reserve({ ...reservation, continuation: result.continuation }).then(next => {
      if (next.status === 'reserved') void next.reservation.submit()
    })
    claims.claim({ ...claim, continuation: result.continuation }).then(next => {
      if (next.status === 'claimed') next.receipt.target.route.roomId satisfies string
    })
  }
})

const invalidTarget = {
  ...target,
  // @ts-expect-error a Room-route declaration cannot claim an arbitrary route parameter
  route: { ...target.route, param: 'sessionId' },
} satisfies AgentAdmissionBootstrapRouteTarget
void invalidTarget
