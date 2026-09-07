import type { ExtensionPointDragHandleV1, ExtensionPointDragSnapshotV1 } from './extension-point-drag.v1.js'

export interface ExtensionPointMenuItemV1 {
  readonly id: string
  readonly label: string
  readonly disabled?: boolean
}
export interface ExtensionPointInteractionSnapshotV1 extends ExtensionPointDragSnapshotV1 {
  readonly hovered: boolean
  readonly menuOpen: boolean
  /** Present only on the transition selecting an enabled menu item. */
  readonly actionId?: string
}
export interface ExtensionPointInteractionHandleV1 extends ExtensionPointDragHandleV1 {
  getSnapshot(): ExtensionPointInteractionSnapshotV1
  setMenu(items: readonly ExtensionPointMenuItemV1[] | null): void
  dispose(): void
}
export interface ExtensionPointInteractionsV1 {
  readonly version: 'cordisx.extension-point-interactions/v1'
  /** Same live id returns the same handle; invalid or exhausted requests throw. */
  create(id: string): ExtensionPointInteractionHandleV1
}
