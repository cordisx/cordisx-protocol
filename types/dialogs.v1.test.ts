import type { DialogChromeV1, DialogResultV1, DialogsV1 } from './dialogs.v1.js'
declare const dialogs: DialogsV1
const handle = dialogs.open({ kind: 'room.details', title: 'Room', content: { id: 'room', props: { roomId: '1' } } })
const result: Promise<DialogResultV1> = handle.result
void result
const chrome: DialogChromeV1 = {
  title: 'Room',
  // @ts-expect-error Arbitrary header rendering is not part of the chrome contract.
  header: () => null,
}
void chrome
