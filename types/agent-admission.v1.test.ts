import type { AgentAdmissionCaptureService, AgentAdmissionReceipt, AgentCommandOrigin } from './agent-admission.v1.js'
import type { AgentAdmission } from './agents.v1.js'
import type { AgentHandle } from './agents.v1.js'

declare const capture: AgentAdmissionCaptureService
declare const handle: AgentHandle
declare const admission: Extract<AgentAdmission, { readonly status: 'accepted' }>
declare const origin: AgentCommandOrigin

capture.capture({ handle, admission, origin }).then(result => {
  if (result.status === 'captured') {
    const receipt: AgentAdmissionReceipt = result.handle.receipt
    receipt.origin.room.roomId satisfies string
    result.handle.closed.then(closed =>
      closed.code satisfies
        | 'command-complete'
        | 'command-replaced'
        | 'agent-replaced'
        | 'plugin-generation-replaced'
        | 'connection-replaced'
        | 'disposed'
    )
  }
})

// @ts-expect-error denied or unavailable admissions cannot be captured as accepted mutations
capture.capture({ handle, admission: { status: 'denied', messageId: 'message-1', code: 'source-denied' }, origin })

// @ts-expect-error Host command origin is required; room metadata cannot be invented by a plugin
capture.capture({ handle, admission, origin: { ...origin, room: undefined } })
