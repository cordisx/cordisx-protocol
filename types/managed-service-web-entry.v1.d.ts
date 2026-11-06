import type { Context } from '@deepseek-ai/cordis'
import type { ManagedServiceBindingV1, ManagedServiceV1 } from './managed-service.v1.js'
import type { ManagedServiceUIGetRequestV1, ManagedServiceUIGetResultV1, ManagedServiceUIRegistryV1 } from './managed-service-ui.v1.js'

export type ManagedServiceWebEntryUnavailableCodeV1 =
  | 'unsupported' | 'owner-unavailable' | 'service-unavailable' | 'stale-generation'
  | 'binding-replaced' | 'disposed' | 'cancelled' | 'timeout' | 'invalid-source'
  | 'ownership-unverified'

export type ManagedServiceWebEntryResultV1 = {
  readonly contract: 'cordisx.managed-service-web-entry-result/v1'
  readonly binding: ManagedServiceBindingV1
  /** Exact generation captured by this handle; never silently retargeted. */
  readonly serviceGeneration: string
} & (
  | { readonly status: 'available'; readonly origin: `http://${string}` | `https://${string}` }
  | { readonly status: 'unavailable'; readonly code: ManagedServiceWebEntryUnavailableCodeV1 }
)

/** Host-generated transport envelope from the captured handle; not caller-selected authority. */
export interface ManagedServiceWebEntryReadRequestV1 {
  readonly contract: 'cordisx.managed-service-web-entry-read/v1'
  readonly binding: ManagedServiceBindingV1
  readonly serviceGeneration: string
}

/** Dedicated read only; no caller URL, operation, owner, proof or lifecycle control. */
export interface ManagedServiceWebEntryV1 {
  readonly contract: 'cordisx.managed-service-web-entry/v1'
  readonly binding: ManagedServiceBindingV1
  readonly serviceGeneration: string
  read(options?: { readonly signal?: AbortSignal }): Promise<ManagedServiceWebEntryResultV1>
}

export interface ManagedServiceWithWebEntryV1 extends ManagedServiceV1 {
  /** Absent on an older Host or a service without a supported declared source. */
  readonly webEntry?: ManagedServiceWebEntryV1
}

export type ManagedServiceWebEntryUIGetResultV1 =
  | { readonly status: 'available'; readonly service: ManagedServiceWithWebEntryV1 }
  | Extract<ManagedServiceUIGetResultV1, { readonly status: 'unavailable' }>

/** Same owner-bound managedServices injection/get path with an optional versioned extension. */
export interface ManagedServiceWebEntryUIRegistryV1 extends ManagedServiceUIRegistryV1 {
  get(request: ManagedServiceUIGetRequestV1): Promise<ManagedServiceWebEntryUIGetResultV1>
}

/** Explicit context view avoids changing the frozen Context augmentation in managed-service-ui/v1. */
export type ManagedServiceWebEntryUIContextV1 = Omit<Context, 'managedServices'> & {
  readonly managedServices: ManagedServiceWebEntryUIRegistryV1
}
