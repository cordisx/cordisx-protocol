import type { MarketplacePluginV8 } from './marketplace.v8.js'

const base = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/marketplace-plugin.v8.schema.json',
  schemaVersion: 8,
  id: 'animal',
  fallbackLocale: 'en',
  name: 'Animal',
  description: 'Animal composer plugin.',
  version: '0.1.2',
  source: 'https://github.com/example/plugin-composer-animal',
  license: 'MIT',
  compatibility: { cordisx: '^0.1.0' },
  authors: [{ name: 'Example developer' }],
} as const

const unscoped = {
  ...base,
  artifact: {
    packageName: 'plugin-composer-animal',
    downloadUrl:
      'https://github.com/example/plugin-composer-animal/releases/download/v0.1.2/plugin-composer-animal-0.1.2.tgz',
    integrity: `sha256:${'a'.repeat(64)}`,
  },
} as const satisfies MarketplacePluginV8

const independentlyScoped = {
  ...base,
  artifact: {
    publisherIdentity: 'npm:@example-developer',
    packageName: '@another-scope/plugin-composer-animal',
    downloadUrl: 'https://registry.npmjs.org/@another-scope/plugin-composer-animal/-/plugin-composer-animal-0.1.2.tgz',
    integrity: `sha256:${'b'.repeat(64)}`,
  },
} as const satisfies MarketplacePluginV8

void unscoped
void independentlyScoped

const legacyNamespace = {
  ...base,
  artifact: {
    packageNamespace: '@example',
    packageName: '@example/plugin-composer-animal',
    downloadUrl: 'https://registry.npmjs.org/@example/plugin-composer-animal/-/plugin-composer-animal-0.1.2.tgz',
    integrity: `sha256:${'c'.repeat(64)}`,
  },
} as const

// @ts-expect-error v8 does not carry the scoped-only v3-v7 namespace field.
const invalidLegacyNamespace: MarketplacePluginV8 = legacyNamespace
void invalidLegacyNamespace
