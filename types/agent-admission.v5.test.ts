import type {
  AgentAdmissionBootstrapRoomReservationRequest,
  AgentAdmissionBootstrapRoomReservationService,
  AgentAdmissionBootstrapRoomTargetRequest,
  AgentAdmissionBootstrapRoomTargetService,
} from './agent-admission.v5.js'
declare const targets: AgentAdmissionBootstrapRoomTargetService
declare const reservations: AgentAdmissionBootstrapRoomReservationService
declare const issue: AgentAdmissionBootstrapRoomTargetRequest
declare const reserve: AgentAdmissionBootstrapRoomReservationRequest
targets.issue(issue).then(result => {
  if (result.status === 'issued') {
    reservations.reserve({ ...reserve, origin: result.origin }).then(next => {
      if (next.status === 'reserved') next.reservation.submit()
    })
  }
})
