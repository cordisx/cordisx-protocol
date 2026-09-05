import type {
  AgentAdmissionTargetOriginRequest,
  AgentAdmissionTargetOriginService,
  AgentAdmissionTargetReservationRequest,
  AgentAdmissionTargetReservationService,
} from './agent-admission.v3.js'
declare const origins: AgentAdmissionTargetOriginService
declare const reservations: AgentAdmissionTargetReservationService
declare const issue: AgentAdmissionTargetOriginRequest
declare const reserve: AgentAdmissionTargetReservationRequest
origins.issue(issue).then(result => {
  if (result.status === 'issued') {
    reservations.reserve({ ...reserve, origin: result.origin }).then(next => {
      if (next.status === 'reserved') next.reservation.submit()
    })
  }
})
