/** Standard Host chrome only. Plugins render body content, never header DOM. */
export type Scalar = string | number | boolean | null
export type JsonValue = Scalar | readonly JsonValue[] | { readonly [key: string]: JsonValue }
export interface LocalizedText {
  readonly namespace?: string
  readonly key: string
  readonly params?: Readonly<Record<string, Scalar>>
  readonly fallback?: string
}
export type Condition =
  | { readonly key: string; readonly exists: boolean }
  | { readonly key: string; readonly equals: Scalar }
  | { readonly key: string; readonly notEquals: Scalar }
  | { readonly all: readonly Condition[] }
  | { readonly any: readonly Condition[] }
  | { readonly not: Condition }
export type PageHeaderVisualV4 =
  | { readonly kind: 'avatar'; readonly src?: string }
  | { readonly kind: 'image'; readonly src: string }
export interface PageHeaderCommandV4 {
  readonly id: string
  readonly label: LocalizedText
  readonly ariaLabel?: LocalizedText
  readonly icon?: `host:${string}`
  readonly command: { readonly id: string; readonly arguments?: JsonValue }
  readonly when?: Condition
  readonly disabled?: { readonly value: boolean; readonly reason?: LocalizedText }
}
export type PageHeaderActionV4 =
  | (PageHeaderCommandV4 & { readonly visual?: PageHeaderVisualV4; readonly menu?: never; readonly presentation?: 'icon'; readonly variant?: never })
  | (PageHeaderCommandV4 & { readonly visual?: never; readonly menu?: never; readonly presentation: 'primary'; readonly variant?: 'outlined' })
  | (PageHeaderCommandV4 & { readonly visual?: never; readonly menu?: never; readonly presentation: 'text'; readonly variant?: never })
  | (Omit<PageHeaderCommandV4, 'command'> & {
    readonly command?: never
    readonly presentation?: never
    readonly variant?: never
    readonly visual?: PageHeaderVisualV4
    readonly menu: readonly PageHeaderCommandV4[]
  })
export interface PageMetadataV4 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/page.v4.schema.json'
  readonly schemaVersion: 4
  readonly id: string
  readonly title: LocalizedText
  readonly description: LocalizedText
  readonly icon?: `host:${string}`
  readonly chrome?: 'standard' | 'body-only'
  /** Host body inset only; omission retains the existing standard inset. */
  readonly contentInset?: 'standard' | 'none'
  readonly breadcrumbs?: readonly LocalizedText[]
  readonly tabs?: readonly { readonly id: string; readonly label: LocalizedText; readonly icon?: `host:${string}` }[]
  readonly headerActions?: readonly PageHeaderActionV4[]
}
