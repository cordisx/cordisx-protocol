export interface RouteLinkReference {
  readonly id: string
  readonly params?: Readonly<Record<string, string | number | boolean | null>>
}
export type RouteLinkResolutionResult =
  | { readonly status: 'accepted'; readonly url: string }
  | {
      readonly status: 'unavailable'
      readonly code: 'invalid-route' | 'route-unavailable' | 'caller-unavailable' | 'host-unavailable'
    }
/** Resolves a Host-generated link; does not navigate or access the clipboard. */
export interface RouteLinkResolution {
  resolveLink(reference: RouteLinkReference): Promise<RouteLinkResolutionResult>
}
