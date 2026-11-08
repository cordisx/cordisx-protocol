export const managedServiceWebEntryConsumerFixture =
  `import type { ManagedServiceWebEntryUIContextV1, ManagedServiceWebEntryReadRequestV1 } from '@cordisx/protocol/managed-service-web-entry/v1'
import type { ManagedServiceWebEntryNodeModuleV1, ManagedServiceWebEntryChallengeV1, ManagedServiceWebEntrySourceResultV1, ManagedServiceWebEntryProofV1 } from '@cordisx/protocol/managed-service-web-entry-runtime/v1'
declare const entryContext: ManagedServiceWebEntryUIContextV1
declare const entryModule: ManagedServiceWebEntryNodeModuleV1
declare const entryChallenge: ManagedServiceWebEntryChallengeV1
declare const entrySourceResult: ManagedServiceWebEntrySourceResultV1
declare const entryProof: ManagedServiceWebEntryProofV1
entryModule.managedServiceWebEntry?.contract satisfies 'cordisx.managed-service-web-entry-source/v1' | undefined
entryChallenge.challenge satisfies string
entryProof.proof satisfies string
entrySourceResult.status satisfies 'available' | 'unavailable'
const entryLookup = await entryContext.managedServices.get({ serviceId: 'gateway' })
if (entryLookup.status === 'available' && entryLookup.service.webEntry?.contract === 'cordisx.managed-service-web-entry/v1') {
  const entryCapability = entryLookup.service.webEntry
  const entryResult = await entryCapability.read()
  const entryEnvelope: ManagedServiceWebEntryReadRequestV1 = { contract: 'cordisx.managed-service-web-entry-read/v1', binding: entryCapability.binding, serviceGeneration: entryCapability.serviceGeneration }
  void entryEnvelope
  if (entryResult.status === 'available') entryResult.origin satisfies string
  else {
    entryResult.code satisfies string
    // @ts-expect-error unavailable results have no cached origin
    entryResult.origin
  }
  // @ts-expect-error no caller selected URL
  entryCapability.read({ origin: 'http://127.0.0.1:9000' })
  // @ts-expect-error generation is captured by the handle
  entryCapability.serviceGeneration = 'replacement'
  // @ts-expect-error renderer never receives proof
  entryResult.proof
}

import type { ManagedServiceConsoleUIRegistryV1 } from '@cordisx/protocol/managed-service-console/v1'
import type { ManagedServiceConsoleSourceV1, ManagedServiceBrowserConsoleSourceV1, ManagedServiceBrowserConsoleRequestV1, ManagedServiceBrowserConsoleResultV1 } from '@cordisx/protocol/managed-service-console-runtime/v1'
declare const managedConsoleRegistry: ManagedServiceConsoleUIRegistryV1
declare const managedConsoleSeat: HTMLElement
declare const managedConsoleSource: ManagedServiceConsoleSourceV1
managedConsoleSource.landingPath satisfies ` + '`/${string}`' + `
declare const managedBrowserSource: ManagedServiceBrowserConsoleSourceV1
declare const privateIssueRequest: ManagedServiceBrowserConsoleRequestV1
declare const privateIssueResult: ManagedServiceBrowserConsoleResultV1
managedBrowserSource.contract satisfies 'cordisx.managed-service-browser-console-source/v1'
privateIssueRequest.binding satisfies string
if (privateIssueResult.status === 'issued') privateIssueResult.ticket satisfies string
const consoleLookup = await managedConsoleRegistry.get({ serviceId: 'gateway' })
if (consoleLookup.status === 'available' && consoleLookup.service.authenticatedConsole) {
  const consoleHandle = consoleLookup.service.authenticatedConsole
  const browserEntry = await consoleHandle.readBrowserEntry?.({ signal: new AbortController().signal })
  if (browserEntry?.status === 'available') {
    browserEntry.binding satisfies typeof consoleHandle.binding
    browserEntry.serviceGeneration satisfies string
    browserEntry.origin satisfies string
    browserEntry.url satisfies string
    // @ts-expect-error The one-use URL does not expose a separate credential field
    browserEntry.ticket
  } else if (browserEntry?.status === 'unavailable') {
    browserEntry.reason satisfies string
    // @ts-expect-error An unavailable result has no URL
    browserEntry.url
  }
  // @ts-expect-error Callers cannot select a browser destination
  await consoleHandle.readBrowserEntry?.({ origin: 'http://127.0.0.1:9000' })
  const view = await consoleHandle.mount(managedConsoleSeat)
  // @ts-expect-error Callers cannot select an account when mounting
  await consoleLookup.service.authenticatedConsole.mount(managedConsoleSeat, { account: 'alice' })
  if (view.status === 'mounted') {
    // @ts-expect-error Mount results cannot reveal a cookie
    view.cookie
    await view.dispose()
    await view.closed
  }
}
`
