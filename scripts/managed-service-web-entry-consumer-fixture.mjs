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
`
