import type { ExtensionPointInteractionsV1 } from './extension-point-interactions.v1.js'
import type { ExtensionPointDragHandleV1 } from './extension-point-drag.v1.js'
declare const factory: ExtensionPointInteractionsV1
const entity = factory.create('pet-1')
const legacy: ExtensionPointDragHandleV1 = entity
legacy.setRegion(null)
entity.setMenu([{ id: 'feed', label: 'Feed', disabled: false }])
const snapshot = entity.getSnapshot()
const open: boolean = snapshot.menuOpen
const hover: boolean = snapshot.hovered
const action: string | undefined = snapshot.actionId
void [open, hover, action]
// @ts-expect-error callbacks are not menu authority
entity.setMenu([{ id: 'feed', label: 'Feed', onClick() {} }])
entity.dispose()
