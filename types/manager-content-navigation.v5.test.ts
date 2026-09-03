import type {
  ManagerContentConfigCommandV1,
  ManagerContentConfigSourceV2,
  ManagerContentNavigationDeclarationV5,
  ManagerContentPluginConfigLocalizedChoiceV2,
  ManagerContentProjectionV4,
} from './manager-content-navigation.v5.js'

const declaration = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-navigation.v5.schema.json',
  schemaVersion: 5,
  id: 'chat-settings',
  route: { id: 'chat-settings' },
  header: { title: { kind: 'route' } },
  body: {
    kind: 'plugin-config-form',
    namespace: 'chatroom',
    defaultMaterialization: { mode: 'missing-only', fields: [{ path: ['shortcutPolicy'], value: 'enter' }] },
  },
} satisfies ManagerContentNavigationDeclarationV5

const enterChoice = {
  value: 'enter',
  label: { key: 'composer.shortcut.enter', fallback: 'Enter sends' },
} satisfies ManagerContentPluginConfigLocalizedChoiceV2

declare const projection: ManagerContentProjectionV4
declare const source: ManagerContentConfigSourceV2
const save = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-config-command.v1.schema.json',
  contract: 'cordisx.manager-content-config-command/v1',
  schemaVersion: 1,
  commandId: 'save-1',
  binding: source.binding,
  expectedRevision: 1,
  operation: 'draft.save',
  mutationId: 'save-mutation-1',
  operations: [{ op: 'set', path: ['shortcutPolicy'], value: 'mod-enter' }],
} satisfies ManagerContentConfigCommandV1

declaration.body.defaultMaterialization.fields[0].value satisfies string | number | boolean | null
projection.body?.configuration.schema.kind satisfies 'schemastery' | 'standard' | undefined
enterChoice.value satisfies string | number | boolean | null
source.execute(save)
