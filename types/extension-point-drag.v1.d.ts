/** CSS-pixel rectangle relative to the current visual point; Host clips it to that point. */
export interface ExtensionPointDragRegionV1 {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly label: string
}
/** Deltas are relative to the start of this gesture, never native screen coordinates. */
export interface ExtensionPointDragSnapshotV1 {
  readonly sequence: number
  readonly gesture: number
  readonly phase: 'idle' | 'start' | 'move' | 'end' | 'cancel' | 'activate'
  readonly deltaX: number
  readonly deltaY: number
}
/** Optional, generation-scoped capability. Missing handle means dragging is unavailable. */
export interface ExtensionPointDragHandleV1 {
  getSnapshot(): ExtensionPointDragSnapshotV1
  subscribe(listener: () => void): () => void
  setRegion(region: ExtensionPointDragRegionV1 | null): void
}
