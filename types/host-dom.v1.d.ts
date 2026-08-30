export type HostDomRootId = string
export type HostDomReadOperation = 'inspect-structure' | 'read-text' | 'read-attributes' | 'read-state'
export type HostDomModifyOperation = 'set-text' | 'set-attribute' | 'insert-owned-structured-child' | 'remove-owned-child' | 'focus'
export type HostDomOperation = HostDomReadOperation | HostDomModifyOperation
export type HostDomHandle = `hdh_${string}`
export type HostDomNodeRef = `hdn_${string}`

export type HostDomReadableAttribute =
  | 'aria-label' | 'aria-description' | 'aria-expanded' | 'aria-selected' | 'aria-pressed'
  | 'aria-current' | 'aria-disabled' | 'role' | 'title' | 'value' | 'checked' | 'disabled' | 'hidden' | 'tabindex'
export type HostDomMutableAttribute = Exclude<HostDomReadableAttribute, 'role'>
export type HostDomAttributeValue = string | number | boolean | null
export type HostDomCommandArguments = Readonly<Record<string, HostDomAttributeValue>>

export interface LocalizedText {
  namespace?: string
  key: string
  params?: Readonly<Record<string, HostDomAttributeValue>>
  fallback?: string
}

export type HostDomStructuredChild =
  | { id: string; kind: 'text'; text: LocalizedText }
  | { id: string; kind: 'action'; label: LocalizedText; command: { id: string; arguments?: HostDomCommandArguments }; disabled?: { value: boolean; reason?: LocalizedText } }

export interface HostDomRootCatalog {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/host-dom-root-catalog.v1.schema.json'
  schemaVersion: 1
  authority: 'host'
  catalogVersion: string
  hostGeneration: string
  roots: ReadonlyArray<{
    rootId: HostDomRootId
    name: LocalizedText
    description: LocalizedText
    sensitivity: 'general' | 'sensitive' | 'high-risk'
    availability: 'available' | 'unavailable'
    unavailableReason?: 'unsupported' | 'not-mounted' | 'profile-unavailable' | 'generation-replaced'
    readOperations: readonly HostDomReadOperation[]
    modifyOperations: readonly HostDomModifyOperation[]
  }>
}

interface HostDomRequestBase {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/host-dom-bridge-request.v1.schema.json'
  contract: 'cordisx.bound-host-dom/v1'
  schemaVersion: 1
  requestId: string
}

export type HostDomBridgeRequest =
  | (HostDomRequestBase & { type: 'acquire'; capability: 'ui.host-dom.read'; rootId: HostDomRootId; operations: readonly HostDomReadOperation[] })
  | (HostDomRequestBase & { type: 'acquire'; capability: 'ui.host-dom.modify'; rootId: HostDomRootId; operations: readonly HostDomModifyOperation[] })
  | (HostDomRequestBase & { type: 'read'; handle: HostDomHandle; operation: Exclude<HostDomReadOperation, 'read-attributes'>; node?: HostDomNodeRef })
  | (HostDomRequestBase & { type: 'read'; handle: HostDomHandle; operation: 'read-attributes'; node?: HostDomNodeRef; attributes: readonly HostDomReadableAttribute[] })
  | (HostDomRequestBase & { type: 'modify'; handle: HostDomHandle; node: HostDomNodeRef; operation: 'set-text'; text: string })
  | (HostDomRequestBase & { type: 'modify'; handle: HostDomHandle; node: HostDomNodeRef; operation: 'set-attribute'; attribute: HostDomMutableAttribute; value: HostDomAttributeValue })
  | (HostDomRequestBase & { type: 'modify'; handle: HostDomHandle; node: HostDomNodeRef; operation: 'insert-owned-structured-child'; child: HostDomStructuredChild })
  | (HostDomRequestBase & { type: 'modify'; handle: HostDomHandle; node: HostDomNodeRef; operation: 'remove-owned-child'; childId: string })
  | (HostDomRequestBase & { type: 'modify'; handle: HostDomHandle; node: HostDomNodeRef; operation: 'focus' })
  | (HostDomRequestBase & { type: 'release'; handle: HostDomHandle })

export type HostDomReadProjection =
  | { kind: 'structure'; nodes: ReadonlyArray<{ node: HostDomNodeRef; kind: 'root' | 'region' | 'group' | 'text' | 'control' | 'list' | 'list-item' | 'status'; depth: number; childCount: number; owned: boolean }>; truncated: boolean; redacted: boolean }
  | { kind: 'text'; text: string; truncated: boolean; redacted: boolean }
  | { kind: 'attributes'; attributes: ReadonlyArray<{ name: HostDomReadableAttribute; value: HostDomAttributeValue }>; redacted: boolean }
  | { kind: 'state'; visible: boolean; enabled: boolean; focused: boolean; expanded: boolean | null; selected: boolean | null; pressed: boolean | null; redacted: boolean }

interface HostDomResultBase {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/host-dom-bridge-result.v1.schema.json'
  contract: 'cordisx.bound-host-dom/v1'
  schemaVersion: 1
  requestId: string
  hostGeneration: string
}

export type HostDomBridgeResult =
  | (HostDomResultBase & { type: 'acquire'; status: 'accepted'; code: 'allowed'; handle: HostDomHandle; capability: 'ui.host-dom.read'; rootId: HostDomRootId; operations: readonly HostDomReadOperation[] })
  | (HostDomResultBase & { type: 'acquire'; status: 'accepted'; code: 'allowed'; handle: HostDomHandle; capability: 'ui.host-dom.modify'; rootId: HostDomRootId; operations: readonly HostDomModifyOperation[] })
  | (HostDomResultBase & { type: 'read'; status: 'accepted'; code: 'allowed'; handle: HostDomHandle; capability: 'ui.host-dom.read'; rootId: HostDomRootId; operation: HostDomReadOperation; projection: HostDomReadProjection })
  | (HostDomResultBase & { type: 'modify'; status: 'accepted'; code: 'allowed'; handle: HostDomHandle; capability: 'ui.host-dom.modify'; rootId: HostDomRootId; operation: HostDomModifyOperation; changed: boolean; ownedChild?: string })
  | (HostDomResultBase & { type: 'release'; status: 'accepted'; code: 'released' })
  | (HostDomResultBase & { type: 'acquire' | 'read' | 'modify' | 'release'; status: 'denied'; code: 'permission-undeclared' | 'permission-denied' | 'scope-denied' | 'operation-denied' | 'persistent-deny' | 'owner-mismatch' })
  | (HostDomResultBase & { type: 'acquire' | 'read' | 'modify' | 'release'; status: 'unavailable'; code: 'unsupported' | 'unknown-root' | 'root-unavailable' | 'not-mounted' | 'stale-handle' | 'generation-replaced' | 'plugin-disabled' | 'plugin-uninstalled' | 'disposed' })

export interface BoundHostDomClient {
  catalog(): Promise<HostDomRootCatalog>
  request(request: HostDomBridgeRequest): Promise<HostDomBridgeResult>
  dispose(): void
}
