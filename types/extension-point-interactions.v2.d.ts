import type { ExtensionPointInteractionSnapshotV1 } from './extension-point-interactions.v1.js'
import type { ExtensionPointDragHandleV1 } from './extension-point-drag.v1.js'
export type ExtensionPointInteractionSnapshotV2 = ExtensionPointInteractionSnapshotV1
/** Host-rendered tree. Only enabled leaves dispatch actionId. */
export interface ExtensionPointMenuItemV2 {
  readonly id: string
  readonly label: string
  readonly disabled?: boolean
  /** Host semantic icon key or built-in icon token; never SVG or a URL. */
  readonly icon?: string
  readonly children?: readonly ExtensionPointMenuItemV2[]
}
export interface ExtensionPointInteractionHandleV2 extends ExtensionPointDragHandleV1 {
  getSnapshot(): ExtensionPointInteractionSnapshotV2
  setMenu(items: readonly ExtensionPointMenuItemV2[] | null): void
  dispose(): void
}
export interface ExtensionPointInteractionsV2 {
  readonly version: 'cordisx.extension-point-interactions/v2'
  create(id: string): ExtensionPointInteractionHandleV2
}
