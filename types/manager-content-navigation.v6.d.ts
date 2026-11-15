import type { BrandIconV1 } from './brand-icon.v1.js'
import type { ManagerCollectionIdentityVisualV2 } from './manager-collection.v2.js'
import type { LocalizedText } from './manager-content-navigation.v1.js'
import type { ManagerContentRecordSummaryLeadingVisualV3 } from './manager-content-navigation.v3.js'
import type { ManagerContentNavigationDeclarationV5, ManagerContentProjectionV4 } from './manager-content-navigation.v5.js'

export type ManagerContentSummaryToneV1 = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface ManagerContentSummaryStatusV1 {
  readonly id: string
  readonly label: LocalizedText & { readonly fallback: string }
  readonly icon: BrandIconV1
  readonly tone: ManagerContentSummaryToneV1
}

export interface ManagerContentSummaryMetricV1 extends ManagerContentSummaryStatusV1 {
  /** Non-negative safe integer. Host formats it using the active locale. */
  readonly value: number
}

/** Fixed read-only chrome. No actions, form values, URLs, markup or renderer seats. */
export interface ManagerContentRecordSummaryV6 {
  readonly leadingVisual: ManagerContentRecordSummaryLeadingVisualV3 | ManagerCollectionIdentityVisualV2
  readonly title: LocalizedText & { readonly fallback: string }
  readonly description?: LocalizedText & { readonly fallback: string }
  /** At most four statuses and eight metrics; ids are unique within each list. */
  readonly statuses?: readonly ManagerContentSummaryStatusV1[]
  readonly metrics?: readonly ManagerContentSummaryMetricV1[]
}

export interface ManagerContentNavigationDeclarationV6 extends Omit<ManagerContentNavigationDeclarationV5, '$schema' | 'schemaVersion' | 'recordSummary'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-navigation.v6.schema.json'
  readonly schemaVersion: 6
  readonly recordSummary?: ManagerContentRecordSummaryV6
}

export interface ManagerContentProjectionV5 extends Omit<ManagerContentProjectionV4, '$schema' | 'schemaVersion' | 'recordSummary'> {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-projection.v5.schema.json'
  readonly schemaVersion: 5
  readonly recordSummary?: ManagerContentRecordSummaryV6
}
