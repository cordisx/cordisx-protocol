import type { ExtensionPointVisualSnapshotV1 } from './extension-point-visual.v1.js'
/** Semantic status only: no audio, transcript, amplitude, or recording control. */
export type ComposerDictationStateV2 = 'unavailable' | 'idle' | 'starting' | 'recording' | 'transcribing' | 'retry'
export interface ExtensionPointVisualSnapshotV2 extends Omit<ExtensionPointVisualSnapshotV1, 'schemaVersion'> {
  readonly schemaVersion: 2
  readonly dictation: ComposerDictationStateV2
}
