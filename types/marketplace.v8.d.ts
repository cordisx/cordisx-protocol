export * from './marketplace.v7.js'

import type {
  MarketplaceCertificationV1,
  MarketplaceCertificationV2,
  MarketplaceOfficialV1,
  MarketplaceOfficialV2,
} from './marketplace.v7.js'

export type MarketplaceDigestV8 = `sha256:${string}`

export interface MarketplacePluginV8 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/marketplace-plugin.v8.schema.json'
  readonly schemaVersion: 8
  readonly id: string
  readonly fallbackLocale: string
  readonly name: string
  readonly description: string
  readonly localizations?: Readonly<Record<string, Readonly<{
    name?: string
    description?: string
    authors?: readonly string[]
    keywords?: readonly string[]
  }>>>
  readonly version: string
  readonly source: string
  readonly homepage?: string
  readonly icon?: string
  readonly manifest?: string
  readonly artifact?: Readonly<{
    publisherIdentity?: string
    packageName: string
    downloadUrl: string
    integrity: MarketplaceDigestV8
  }>
  readonly commerce?: Readonly<{
    $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/commerce-descriptor.v1.schema.json'
    schemaVersion: 1
    mode: 'external-publisher-v1'
    purchaseUrl: string
    manageUrl?: string
    recoveryUrl?: string
    authorization: Readonly<{ method: 'publisher-grant.v1'; environment: 'sandbox' | 'live' }>
  }>
  readonly license: string
  readonly compatibility: Readonly<{ cordisx: string }>
  readonly authors: readonly Readonly<{ name: string; url?: string }>[]
  readonly keywords?: readonly string[]
}

interface MarketplaceFeedV8Base {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/marketplace-feed.v8.schema.json'
  readonly schemaVersion: 8
  readonly generatedAt: string
  readonly fallbackLocale: string
  readonly name: string
  readonly description: string
  readonly localizations?: Readonly<Record<string, Readonly<{ name?: string; description?: string }>>>
  readonly homepage: string
  readonly plugins: readonly MarketplacePluginV8[]
}

export type MarketplaceFeedV8 = MarketplaceFeedV8Base & (
  | Readonly<{
    trust: Readonly<{
      authority: 'cordisx.marketplace.codeowners/v1'
      root: string
      grantModel: 'protected-merge-chain-v1'
      cryptographicAttestation: 'unsupported'
    }>
    official: readonly MarketplaceOfficialV1[]
    certifications: readonly MarketplaceCertificationV1[]
  }>
  | Readonly<{
    trust: Readonly<{
      authority: 'byted.cordisx-marketplace.codeowners/v1'
      root: string
      grantModel: 'protected-merge-chain-v1'
      cryptographicAttestation: 'unsupported'
    }>
    official: readonly MarketplaceOfficialV2[]
    certifications: readonly MarketplaceCertificationV2[]
  }>
)
