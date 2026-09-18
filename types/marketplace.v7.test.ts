import type {
  MarketplaceCertificationV2,
  MarketplaceCertifiedEligibilityCeilingV2,
  MarketplaceCertifiedPermissionProjectionV2,
  MarketplaceOfficialV2,
} from './marketplace.v7.js'

const ceiling = {
  capability: 'ui.extension-points.render',
  scope: { extensionPoints: ['manager.settings.navigation-items', 'manager.content'] },
} as const satisfies MarketplaceCertifiedEligibilityCeilingV2

const sourceEvidence = {
  repository: 'https://code.byted.org/fe/cordisx-plugins',
  sourceCommit: '7a7885204c874ff2dddf4288fa98402450f7ff64',
  mergeRequest: 'https://code.byted.org/fe/cordisx-plugins/merge_requests/4',
  mergeCommit: '033b595570f40f9a370f313e86f546bd84637f5d',
} as const

declare const official: MarketplaceOfficialV2
// @ts-expect-error Official identity cannot carry permission eligibility.
official.eligibilityCeiling

const certification = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/marketplace-certification.v2.schema.json',
  schemaVersion: 2,
  level: 'cordisx-certified',
  identity: {
    pluginId: 'aiden',
    canonicalSource: 'https://code.byted.org/fe/cordisx-plugins',
    packageName: '@byted/cordisx-plugin-aiden',
    version: '0.1.2',
    downloadUrl: 'https://bnpm.byted.org/@byted/cordisx-plugin-aiden/-/cordisx-plugin-aiden-0.1.2.tgz',
    integrity: `sha256:${'a'.repeat(64)}`,
    sourceEvidence,
  },
  eligibilityCeiling: ceiling,
  reviewPolicy: { id: 'cordisx-marketplace-review', version: '1.0.0' },
  reviewedAt: '2026-09-18T07:06:37.000Z',
  expiresAt: '2027-09-18T07:06:37.000Z',
  reviewer: {
    authority: 'byted.cordisx-marketplace.codeowners/v1',
    evidenceRef: 'https://code.byted.org/fe/cordisx-marketplace/merge_requests/5',
  },
  status: 'active',
  label: { key: 'certified.label', fallback: 'Certified' },
  description: { key: 'certified.description', fallback: 'Reviewed exact artifact.' },
} as const satisfies MarketplaceCertificationV2

const projection = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/marketplace-certified-permission-projection.v2.schema.json',
  schemaVersion: 2,
  kind: 'cordisx-certified-permission-eligibility',
  status: 'active',
  canonicalSource: certification.identity.canonicalSource,
  pluginId: certification.identity.pluginId,
  packageName: certification.identity.packageName,
  version: certification.identity.version,
  downloadUrl: certification.identity.downloadUrl,
  integrity: certification.identity.integrity,
  sourceEvidence,
  reviewPolicy: certification.reviewPolicy,
  reviewedAt: certification.reviewedAt,
  expiresAt: certification.expiresAt,
  evidence: { kind: 'protected-marketplace-review', reference: certification.reviewer.evidenceRef },
  eligibilityCeiling: ceiling,
  feed: {
    generatedAt: '2026-09-18T08:00:00.000Z',
    root: 'https://lf0-fast-deliver-inner.bytedance.net/obj/eden-internal/cordisx-marketplace/marketplace.json',
    authority: 'byted.cordisx-marketplace.codeowners/v1',
  },
  fingerprint: `sha256:${'b'.repeat(64)}`,
  revision: '2026-09-18T08:00:00.000Z',
} as const satisfies MarketplaceCertifiedPermissionProjectionV2

const modelCeiling: MarketplaceCertifiedEligibilityCeilingV2 = {
  // @ts-expect-error Non-rendering capabilities are outside the v2 ceiling.
  capability: 'models.read',
  // @ts-expect-error The v2 ceiling requires the exact two Manager points.
  scope: { extensionPoints: [] },
}

const expandedCeiling: MarketplaceCertifiedEligibilityCeilingV2 = {
  capability: 'ui.extension-points.render',
  // @ts-expect-error The exact ceiling cannot include additional extension points.
  scope: { extensionPoints: ['manager.settings.navigation-items', 'manager.content', 'workspace.toolbar'] },
}

void [certification, projection, modelCeiling, expandedCeiling]
