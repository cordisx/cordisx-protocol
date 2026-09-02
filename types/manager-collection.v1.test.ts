import type {
  ManagerCollectionActionResultV1,
  ManagerCollectionQueryV1,
  ManagerCollectionRegistrationV1,
  ManagerCollectionSnapshotV1,
  ManagerCollectionSourceV1,
} from './manager-collection.v1.js'

const registration = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-collection-registration.v1.schema.json',
  contract: 'cordisx.manager-collection-registration/v1',
  schemaVersion: 1,
  id: 'rooms',
  label: { key: 'manager.rooms.label', fallback: 'Rooms' },
  description: { key: 'manager.rooms.description', fallback: 'Manage rooms.' },
  views: [
    { id: 'active', label: { key: 'manager.rooms.active', fallback: 'Active' }, emptyTitle: { key: 'manager.rooms.active.empty', fallback: 'No active rooms' }, emptyDescription: { key: 'manager.rooms.active.empty-description', fallback: 'Active rooms appear here.' } },
    { id: 'archived', label: { key: 'manager.rooms.archived', fallback: 'Archived' }, emptyTitle: { key: 'manager.rooms.archived.empty', fallback: 'No archived rooms' }, emptyDescription: { key: 'manager.rooms.archived.empty-description', fallback: 'Archived rooms appear here.' } },
  ],
  defaultView: 'active',
  search: {
    fields: ['title', 'summary'],
    normalization: 'nfkc-casefold',
    label: { key: 'manager.rooms.search', fallback: 'Search rooms' },
    placeholder: { key: 'manager.rooms.search-placeholder', fallback: 'Search by title or summary' },
    noMatchTitle: { key: 'manager.rooms.no-match', fallback: 'No matching rooms' },
    noMatchDescription: { key: 'manager.rooms.no-match-description', fallback: 'Try a different search.' },
  },
} as const satisfies ManagerCollectionRegistrationV1

const query = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-collection-query.v1.schema.json',
  contract: 'cordisx.manager-collection-query/v1',
  schemaVersion: 1,
  collectionId: 'rooms',
  queryRevision: 4,
  view: 'active',
  search: { input: 'Project', normalized: 'project' },
} as const satisfies ManagerCollectionQueryV1

const snapshot = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-collection-snapshot.v1.schema.json',
  contract: 'cordisx.manager-collection-snapshot/v1',
  schemaVersion: 1,
  collectionId: 'rooms',
  queryRevision: 4,
  view: 'active',
  normalizedSearch: 'project',
  revision: 12,
  items: [{
    id: 'room-1',
    title: { key: 'manager.rooms.dynamic-title', params: { title: 'Project room' }, fallback: 'Project room' },
    summary: { key: 'manager.rooms.dynamic-summary', params: { summary: 'Product planning' }, fallback: 'Product planning' },
    leadingVisual: { kind: 'semantic-icon', icon: 'host:layers' },
    route: { id: 'room-detail', params: { roomId: 'room-1' } },
    order: 100,
    disabled: { value: false },
    actions: [{
      kind: 'text-input-command',
      id: 'rename',
      label: { key: 'manager.rooms.rename', fallback: 'Rename' },
      placement: 'overflow',
      tone: 'neutral',
      pressed: false,
      disabled: { value: false },
      command: { id: 'rename-room', arguments: { roomId: 'room-1' } },
      input: {
        argument: 'title',
        title: { key: 'manager.rooms.rename-title', fallback: 'Rename room' },
        label: { key: 'manager.rooms.rename-label', fallback: 'Room title' },
        submitLabel: { key: 'manager.rooms.rename-submit', fallback: 'Rename' },
        initialValue: 'Project room',
        minLength: 1,
        maxLength: 256,
        trim: 'both',
      },
      feedback: {
        success: { key: 'manager.rooms.rename-success', fallback: 'Room renamed.' },
        failure: { key: 'manager.rooms.rename-failure', fallback: 'Room could not be renamed.' },
      },
    }],
  }],
} as const satisfies ManagerCollectionSnapshotV1

const source: ManagerCollectionSourceV1 = {
  snapshot: async (_query, _signal) => snapshot,
  subscribe: () => () => undefined,
}

const result = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-collection-action-result.v1.schema.json',
  contract: 'cordisx.manager-collection-action-result/v1',
  schemaVersion: 1,
  collectionId: 'rooms',
  itemId: 'room-1',
  actionId: 'rename',
  status: 'applied',
  code: 'renamed',
  revision: 13,
} as const satisfies ManagerCollectionActionResultV1

void registration
void query
void source
void result
