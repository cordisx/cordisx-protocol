import type {
  AgentPageAdmissionAcceptedDelivery,
  AgentPageComposerCommandAdapter,
  AgentPageComposerCommandContext,
  AgentPageComposerCommandRequest,
  AgentPageComposerCommandResult,
  AgentPageFreshRoomNavigationService,
} from './agent-page-admission.v2.js'

declare const adapter: AgentPageComposerCommandAdapter
declare const request: AgentPageComposerCommandRequest
declare const navigation: AgentPageFreshRoomNavigationService
declare const context: AgentPageComposerCommandContext
declare const completion: AgentPageComposerCommandResult

adapter.execute(request).then((result) => {
  if (result.status === 'accepted') {
    result.code satisfies 'submitted'
    result.deliveries[0].messageId satisfies string
  } else if (result.status === 'failed') {
    result.deliveries satisfies readonly unknown[]
  }
})

if (context.freshRoomNavigation !== undefined) {
  navigation.navigate({
    navigation: context.freshRoomNavigation,
    route: { outlet: 'main', routeDefinitionId: 'room', param: 'roomId', roomId: 'room-fresh' },
  })
}

declare const delivery: AgentPageAdmissionAcceptedDelivery
delivery.status satisfies 'accepted'
void completion
