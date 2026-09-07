import type { PluginRuntimeManifestV10 } from './plugin-manifest.v10.js'
import type { ExtensionPointVisualSnapshotV1 } from './extension-point-visual.v1.js'
const manifest: PluginRuntimeManifestV10 = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/plugin-manifest.v10.schema.json',
  schemaVersion: 10,
  id: 'animal',
  capabilities: [
    {
      name: 'ui.extension-points.render',
      required: true,
      scope: { extensionPoints: ['composer.primary-action.visual', 'composer.frame.overlay'] },
    },
    {
      name: 'ui.extension-points.interact',
      required: false,
      scope: { extensionPoints: ['composer.frame.overlay'], events: ['pointer.observe'] },
    },
  ],
  services: [],
}
const snapshot: ExtensionPointVisualSnapshotV1 = {
  schemaVersion: 1,
  sequence: 1,
  action: 'voice',
  enabled: true,
  busy: false,
  draftEmpty: true,
  accessibleLabel: 'Start voice chat',
  theme: 'dark',
  reducedMotion: false,
  bounds: { width: 28, height: 28 },
  pointer: null,
  events: [],
}
void manifest
void snapshot

const dictationSnapshot: import('./extension-point-visual.v2.js').ExtensionPointVisualSnapshotV2 = {
  ...snapshot,
  schemaVersion: 2,
  dictation: 'recording',
}
void dictationSnapshot
