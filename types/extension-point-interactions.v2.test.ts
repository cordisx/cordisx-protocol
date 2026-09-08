import type { ExtensionPointInteractionsV2 } from './extension-point-interactions.v2.js'
import type { ExtensionPointDragHandleV1 } from './extension-point-drag.v1.js'
declare const factory: ExtensionPointInteractionsV2
const handle = factory.create('cat')
const drag: ExtensionPointDragHandleV1 = handle
handle.setMenu([{ id: 'care', label: 'Care', icon: 'action.favorite', children: [{ id: 'feed', label: 'Feed' }] }])
handle.setMenu([{ id: 'old', label: 'Flat compatibility' }])
// @ts-expect-error callbacks are not menu authority
handle.setMenu([{ id: 'x', label: 'X', onClick() {} }])
// @ts-expect-error no raw vector descriptors
handle.setMenu([{ id: 'x', label: 'X', icon: { paths: [] } }])
void drag
