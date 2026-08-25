import type { ManagerContentNavigationDeclaration, ManagerContentProjection } from './manager-content-navigation.v1.js'

const declaration = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-navigation.v1.schema.json',
  schemaVersion: 1,
  id: 'channel-detail',
  route: { id: 'channel-detail', params: { channelId: 'channel-42' } },
  parentRoute: { id: 'channels' },
  header: { title: { kind: 'record', recordIdParam: 'channelId', fallback: { key: 'channel.unknown', fallback: 'Channel' } } },
  tabs: [{ id: 'overview', route: { id: 'channel-detail', params: { channelId: 'channel-42' } } }],
} satisfies ManagerContentNavigationDeclaration

const projection = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-projection.v1.schema.json',
  schemaVersion: 1,
  route: { id: 'channels:channel-detail', params: { channelId: 'channel-42' } },
  header: { title: { kind: 'record', recordId: 'channel-42', text: { key: 'channel.name', fallback: 'Support channel' } } },
  breadcrumbs: [{ route: { id: 'channels:channels' }, text: { key: 'channels.title', fallback: 'Channels' } }],
  back: { available: true, route: { id: 'channels:channels' } },
  history: { index: 1, length: 2, canGoBack: true, canGoForward: false },
  tabs: [{ id: 'overview', route: { id: 'channels:channel-detail', params: { channelId: 'channel-42' } }, text: { key: 'channel.overview', fallback: 'Overview' }, active: true, disabled: false }],
} satisfies ManagerContentProjection

void declaration
void projection
