export type Scalar = string | number | boolean | null

export interface LocalizedText {
  namespace?: string
  key: string
  params?: Record<string, Scalar>
  fallback?: string
}

export interface RouteReference {
  id: string
  params?: Record<string, Scalar>
}

export interface ManagerContentNavigationDeclaration {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-navigation.v1.schema.json'
  schemaVersion: 1
  id: string
  route: RouteReference
  parentRoute?: RouteReference
  header: {
    title:
      | { kind: 'route' }
      | { kind: 'record'; recordIdParam: string; fallback: LocalizedText }
  }
  tabs?: ReadonlyArray<{ id: string; route: RouteReference }>
}

export interface ManagerContentProjection {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-projection.v1.schema.json'
  schemaVersion: 1
  route: RouteReference
  header: {
    title:
      | { kind: 'route'; text: LocalizedText & { fallback: string } }
      | { kind: 'record'; recordId: string; text: LocalizedText & { fallback: string } }
    description?: LocalizedText & { fallback: string }
    icon?: `host:${string}`
  }
  breadcrumbs: ReadonlyArray<{ route: RouteReference; text: LocalizedText & { fallback: string } }>
  back: { available: false } | { available: true; route: RouteReference }
  history: { index: number; length: number; canGoBack: boolean; canGoForward: boolean }
  tabs: ReadonlyArray<{ id: string; route: RouteReference; text: LocalizedText & { fallback: string }; active: boolean; disabled: boolean }>
}
