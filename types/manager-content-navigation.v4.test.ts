import type {
  ManagerContentConfigCommandV1,
  ManagerContentConfigResultV1,
  ManagerContentConfigSourceV1,
  ManagerContentNavigationDeclarationV4,
  ManagerContentProjectionV3,
} from './manager-content-navigation.v4.js'

const declaration = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-navigation.v4.schema.json',
  schemaVersion: 4,
  id: 'chat-settings',
  route: { id: 'chat-settings' },
  header: { title: { kind: 'route' } },
  body: {
    kind: 'plugin-config-form',
    namespace: 'chatroom',
    defaultMaterialization: { mode: 'missing-only', fields: [{ path: ['shortcutPolicy'], value: 'enter' }] },
  },
} satisfies ManagerContentNavigationDeclarationV4

declare const projection: ManagerContentProjectionV3
declare const source: ManagerContentConfigSourceV1
const save = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-config-command.v1.schema.json',
  contract: 'cordisx.manager-content-config-command/v1',
  schemaVersion: 1,
  commandId: 'save-1',
  binding: source.binding,
  expectedRevision: 1,
  operation: 'draft.save',
  mutationId: 'save-mutation-1',
  operations: [{ op: 'set', path: ['shortcutPolicy'], value: 'mod-enter' }],
} satisfies ManagerContentConfigCommandV1

declare const result: ManagerContentConfigResultV1
declaration.body.defaultMaterialization.fields[0].value satisfies string | number | boolean | null
projection.body?.configuration.applies satisfies
  | 'live'
  | 'plugin-restart'
  | 'service-restart'
  | 'app-restart'
  | undefined
source.execute(save)
if (result.status === 'conflict') result.currentRevision satisfies number
