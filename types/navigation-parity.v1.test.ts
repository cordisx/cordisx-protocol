import type { EntitySettingsNavigationService } from './entity-settings-navigation.v1.js'
import type { RouteLinkResolution } from './route-link-resolution.v1.js'
import type { MarkdownEditorHandle } from './controlled-markdown-editor.v1.js'
declare const settings: EntitySettingsNavigationService
declare const navigation: RouteLinkResolution
declare const editor: MarkdownEditorHandle
async function useCapabilities() {
  const identity = { agentId: 'agent', revision: 'frozen' }
  if ((await settings.get({ identity })).status === 'available') await settings.open({ identity })
  await navigation.resolveLink({ id: 'room', params: { roomId: 'one' } })
  editor.focus({ preventScroll: true })
  const selection = editor.getSelection()
  editor.setSelection(selection.start, selection.end)
  // @ts-expect-error no source impersonation
  await settings.open({ identity, source: 'foreign' })
  // @ts-expect-error no raw URL input
  await settings.open({ url: 'app://private' })
  // @ts-expect-error no native DOM capability
  editor.element.focus()
  // @ts-expect-error no caller-supplied owner in a route reference
  await navigation.resolveLink({ id: 'room', owner: 'foreign' })
}
void useCapabilities
