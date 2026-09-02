import type {
  ManagerContentNavigationDeclarationV2,
  ManagerContentNavigationTabV2,
} from './manager-content-navigation.v2.js'

const labeledTab = {
  id: 'records',
  route: { id: 'records' },
  label: { key: 'manager.records.tab', fallback: 'Records' },
} satisfies ManagerContentNavigationTabV2

const routeDerivedTab = {
  id: 'audit',
  route: { id: 'audit' },
} satisfies ManagerContentNavigationTabV2

const declaration = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/manager-content-navigation.v2.schema.json',
  schemaVersion: 2,
  id: 'record-manager',
  route: { id: 'record-manager' },
  header: { title: { kind: 'route' } },
  tabs: [labeledTab, routeDerivedTab],
} as const satisfies ManagerContentNavigationDeclarationV2

void declaration
