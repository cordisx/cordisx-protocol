export type MarketplaceDigestV7 = `sha256:${string}`

export interface MarketplaceLocalizedTextV7 {
  readonly key: string
  readonly fallback: string
  readonly values?: Readonly<Record<string, string>>
}

export interface MarketplaceProtectedReviewV7 {
  readonly authority: 'cordisx.marketplace.codeowners/v1' | 'byted.cordisx-marketplace.codeowners/v1'
  readonly evidenceRef: string
}

export interface MarketplaceOfficialV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/marketplace-official.v1.schema.json'
  readonly schemaVersion: 1
  readonly designation: 'cordisx-official'
  readonly identity: Readonly<{
    pluginId: string
    canonicalSource: string
    publisherIdentity: 'npm:@cordisx'
    packageNamespace: '@cordisx'
    packageName: `@cordisx/${string}`
  }>
  readonly verificationPolicy: Readonly<{ id: 'cordisx-official-publisher'; version: string }>
  readonly verifiedAt: string
  readonly reviewer: MarketplaceProtectedReviewV7 & Readonly<{ authority: 'cordisx.marketplace.codeowners/v1' }>
  readonly status: 'active' | 'revoked'
  readonly revokedAt?: string
  readonly label: MarketplaceLocalizedTextV7
  readonly description: MarketplaceLocalizedTextV7
}

export interface MarketplaceOfficialV2 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/marketplace-official.v2.schema.json'
  readonly schemaVersion: 2
  readonly designation: 'cordisx-official'
  readonly identity: Readonly<{
    pluginId: string
    canonicalSource: 'https://code.byted.org/fe/cordisx-plugins'
    publisherIdentity: 'npm:@byted'
    packageNamespace: '@byted'
    packageName: `@byted/cordisx-plugin-${string}`
  }>
  readonly verificationPolicy: Readonly<{ id: 'cordisx-official-publisher'; version: string }>
  readonly verifiedAt: string
  readonly reviewer: MarketplaceProtectedReviewV7 & Readonly<{
    authority: 'byted.cordisx-marketplace.codeowners/v1'
  }>
  readonly status: 'active' | 'revoked'
  readonly revokedAt?: string
  readonly label: MarketplaceLocalizedTextV7
  readonly description: MarketplaceLocalizedTextV7
}

export interface MarketplaceCertificationV1 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/marketplace-certification.v1.schema.json'
  readonly schemaVersion: 1
  readonly level: 'cordisx-certified'
  readonly identity: Readonly<{
    pluginId: string
    version: string
    canonicalSource: string
    integrity: MarketplaceDigestV7
  }>
  readonly reviewPolicy: Readonly<{ id: 'cordisx-marketplace-review'; version: string }>
  readonly reviewedAt: string
  readonly expiresAt: string
  readonly reviewer: MarketplaceProtectedReviewV7 & Readonly<{ authority: 'cordisx.marketplace.codeowners/v1' }>
  readonly status: 'active' | 'revoked' | 'expired'
  readonly revokedAt?: string
  readonly label: MarketplaceLocalizedTextV7
  readonly description: MarketplaceLocalizedTextV7
}

export interface MarketplaceSourceEvidenceV2 {
  readonly repository: 'https://code.byted.org/fe/cordisx-plugins'
  readonly sourceCommit: string
  readonly mergeRequest: string
  readonly mergeCommit: string
}

export interface MarketplaceCertifiedEligibilityCeilingV2 {
  readonly capability: 'ui.extension-points.render'
  readonly scope: Readonly<{
    extensionPoints: readonly ['manager.settings.navigation-items', 'manager.content']
  }>
}

export interface MarketplaceCertificationV2 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/marketplace-certification.v2.schema.json'
  readonly schemaVersion: 2
  readonly level: 'cordisx-certified'
  readonly identity: Readonly<{
    pluginId: string
    canonicalSource: 'https://code.byted.org/fe/cordisx-plugins'
    packageName: `@byted/cordisx-plugin-${string}`
    version: string
    downloadUrl: string
    integrity: MarketplaceDigestV7
    sourceEvidence: MarketplaceSourceEvidenceV2
  }>
  readonly eligibilityCeiling: MarketplaceCertifiedEligibilityCeilingV2
  readonly reviewPolicy: Readonly<{ id: 'cordisx-marketplace-review'; version: string }>
  readonly reviewedAt: string
  readonly expiresAt: string
  readonly reviewer: MarketplaceProtectedReviewV7 & Readonly<{
    authority: 'byted.cordisx-marketplace.codeowners/v1'
  }>
  readonly status: 'active' | 'revoked' | 'expired'
  readonly revokedAt?: string
  readonly label: MarketplaceLocalizedTextV7
  readonly description: MarketplaceLocalizedTextV7
}

export interface MarketplacePluginV7 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/marketplace-plugin.v7.schema.json'
  readonly schemaVersion: 7
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
    publisherIdentity: string
    packageNamespace: string
    packageName: string
    downloadUrl: string
    integrity: MarketplaceDigestV7
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

interface MarketplaceFeedV7Base {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/marketplace-feed.v7.schema.json'
  readonly schemaVersion: 7
  readonly generatedAt: string
  readonly fallbackLocale: string
  readonly name: string
  readonly description: string
  readonly localizations?: Readonly<Record<string, Readonly<{ name?: string; description?: string }>>>
  readonly homepage: string
  readonly plugins: readonly MarketplacePluginV7[]
}

export type MarketplaceFeedV7 = MarketplaceFeedV7Base & (
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

export interface MarketplaceCertifiedPermissionProjectionV2 {
  readonly $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/marketplace-certified-permission-projection.v2.schema.json'
  readonly schemaVersion: 2
  readonly kind: 'cordisx-certified-permission-eligibility'
  readonly status: 'active'
  readonly canonicalSource: 'https://code.byted.org/fe/cordisx-plugins'
  readonly pluginId: string
  readonly packageName: `@byted/cordisx-plugin-${string}`
  readonly version: string
  readonly downloadUrl: string
  readonly integrity: MarketplaceDigestV7
  readonly sourceEvidence: MarketplaceSourceEvidenceV2
  readonly reviewPolicy: Readonly<{ id: 'cordisx-marketplace-review'; version: string }>
  readonly reviewedAt: string
  readonly expiresAt: string
  readonly evidence: Readonly<{ kind: 'protected-marketplace-review'; reference: string }>
  readonly eligibilityCeiling: MarketplaceCertifiedEligibilityCeilingV2
  readonly feed: Readonly<{
    generatedAt: string
    root: string
    authority: 'byted.cordisx-marketplace.codeowners/v1'
  }>
  readonly fingerprint: MarketplaceDigestV7
  readonly revision: string
}
