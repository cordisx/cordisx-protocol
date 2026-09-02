import type { LocalizedText, RouteReference } from './manager-content-navigation.v1.js'

export type ManagerContentNavigationLocalizedTextV2 = LocalizedText
export type ManagerContentNavigationRouteReferenceV2 = RouteReference

export interface ManagerContentNavigationTabV2 {
  id: string
  route: ManagerContentNavigationRouteReferenceV2
  /** Explicit tab chrome text; absent means derive the target route title exactly as v1. */
  label?: ManagerContentNavigationLocalizedTextV2
}

export interface ManagerContentNavigationDeclarationV2 {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-navigation.v2.schema.json'
  schemaVersion: 2
  id: string
  route: ManagerContentNavigationRouteReferenceV2
  parentRoute?: ManagerContentNavigationRouteReferenceV2
  header: {
    title:
      | { kind: 'route' }
      | { kind: 'record'; recordIdParam: string; fallback: ManagerContentNavigationLocalizedTextV2 }
  }
  tabs?: ReadonlyArray<ManagerContentNavigationTabV2>
}
