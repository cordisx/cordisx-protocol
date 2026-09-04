import type { AgentAdmissionReservationService, AgentAdmissionReservationRequest } from './agent-admission.v2.js'
declare const service: AgentAdmissionReservationService
declare const request: AgentAdmissionReservationRequest
service.reserve(request).then(result => { if (result.status === 'reserved') result.reservation.submit().then(admission => admission.messageId satisfies string) })
