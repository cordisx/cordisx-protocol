import type {
  ManagerContentNavigationDeclarationV3,
  ManagerContentNavigationSubjectV3,
  ManagerContentProjectionV2,
} from './manager-content-navigation.v3.js'
import type { AgentAvatarRef } from './agent-avatar.v1.js'

declare const avatar: AgentAvatarRef

const subject = {
  kind: 'agent-definition',
  identity: { agentId: 'architect', revision: 'sha256:revision-a' },
} satisfies ManagerContentNavigationSubjectV3

const declaration = {
  $schema:
    'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-navigation.v3.schema.json',
  schemaVersion: 3,
  id: 'entity-detail',
  route: { id: 'entity-detail', params: { memberId: 'member-a' } },
  header: {
    title: { kind: 'record', recordIdParam: 'memberId', fallback: { key: 'entity.unknown', fallback: 'Entity' } },
  },
  subject,
  recordSummary: {
    leadingVisual: { kind: 'agent-avatar', avatar },
    title: { key: 'entity.architect', fallback: 'Architect' },
    description: { key: 'entity.architect.description', fallback: 'Plans the system.' },
  },
  tabs: [{
    id: 'overview',
    route: { id: 'entity-detail', params: { memberId: 'member-a' } },
    label: { key: 'entity.overview', fallback: 'Overview' },
  }],
} satisfies ManagerContentNavigationDeclarationV3

declare const projection: ManagerContentProjectionV2
declaration.subject.identity.revision satisfies string
projection.recordSummary?.leadingVisual.avatar.kind satisfies
  | 'generated'
  | 'asset'
  | 'definition'
  | 'platform'
  | undefined
