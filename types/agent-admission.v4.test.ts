import type { AgentAdmissionBootstrapTargetService, AgentAdmissionBootstrapReservationService, AgentAdmissionBootstrapTargetRequest, AgentAdmissionBootstrapReservationRequest } from './agent-admission.v4.js'
declare const targets: AgentAdmissionBootstrapTargetService
declare const reservations: AgentAdmissionBootstrapReservationService
declare const issue: AgentAdmissionBootstrapTargetRequest
declare const reserve: AgentAdmissionBootstrapReservationRequest
targets.issue(issue).then(result => { if (result.status === 'issued') reservations.reserve({ ...reserve, origin: result.origin }).then(next => { if (next.status === 'reserved') next.reservation.submit() }) })
