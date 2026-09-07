import type { ExtensionPointDragHandleV1, ExtensionPointDragSnapshotV1 } from './extension-point-drag.v1.js'
declare const handle: ExtensionPointDragHandleV1
handle.setRegion({ x: 1, y: 2, width: 30, height: 40, label: 'Move avatar' })
handle.setRegion(null)
const snapshot: ExtensionPointDragSnapshotV1 = handle.getSnapshot()
const release: () => void = handle.subscribe(() => snapshot.phase)
release()
// @ts-expect-error native nodes are not exposed
handle.element
// @ts-expect-error native event handlers are not accepted
handle.setRegion({ x: 1, y: 1, width: 20, height: 20, label: 'Move', onPointerDown() {} })
