import type { ManagedServiceBindingV1 } from './managed-service.v1.js'
import type {
  ManagedServiceWebEntryUIGetResultV1,
  ManagedServiceWebEntryUIRegistryV1,
  ManagedServiceWithWebEntryV1,
} from './managed-service-web-entry.v1.js'
import type { ManagedServiceUIGetRequestV1 } from './managed-service-ui.v1.js'

export interface ManagedServiceConsoleUnavailableV1 {
  readonly status: 'unavailable'
  readonly reason:
    | 'unsupported'
    | 'sign-in-required'
    | 'owner-unavailable'
    | 'stale-generation'
    | 'cancelled'
    | 'failed'
}

export type ManagedServiceConsoleMountResultV1 =
  | { readonly status: 'mounted'; readonly closed: Promise<void>; dispose(): Promise<void> }
  | ManagedServiceConsoleUnavailableV1

export type ManagedServiceConsoleBrowserEntryResultV1 =
  | {
    readonly status: 'available'
    readonly binding: ManagedServiceBindingV1
    readonly serviceGeneration: string
    readonly origin: `http://${string}` | `https://${string}`
    /** Single-use navigation credential. Use immediately in the owning embedded view. */
    readonly url: string
  }
  | ManagedServiceConsoleUnavailableV1

/** Owner-bound capability; the target must be a live body seat owned by the invoking page. */
export interface ManagedServiceConsoleV1 {
  readonly contract: 'cordisx.managed-service-console/v1'
  readonly binding: ManagedServiceBindingV1
  readonly serviceGeneration: string
  mount(target: HTMLElement, options?: { readonly signal?: AbortSignal }): Promise<ManagedServiceConsoleMountResultV1>
  readBrowserEntry?(options?: { readonly signal?: AbortSignal }): Promise<ManagedServiceConsoleBrowserEntryResultV1>
}

export interface ManagedServiceWithConsoleV1 extends ManagedServiceWithWebEntryV1 {
  readonly authenticatedConsole?: ManagedServiceConsoleV1
}

export interface ManagedServiceConsoleUIRegistryV1 extends ManagedServiceWebEntryUIRegistryV1 {
  get(request: ManagedServiceUIGetRequestV1): Promise<
    | { readonly status: 'available'; readonly service: ManagedServiceWithConsoleV1 }
    | Extract<ManagedServiceWebEntryUIGetResultV1, { readonly status: 'unavailable' }>
  >
}
