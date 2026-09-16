/** Version 1 embedded schema-form semantics; independent of a rendering framework. */
export interface SchemaFormIssueV1 {
  readonly path: readonly string[]
  readonly message: string
}
export interface SchemaFormSnapshotV1 {
  readonly value: Readonly<Record<string, unknown>>
  readonly valid: boolean
  readonly issues: readonly SchemaFormIssueV1[]
}
/** A trusted plugin's Schemastery object, not an executable document received from a server. */
export type SchemaFormValidationV1 =
  | { readonly value: unknown; readonly issues?: undefined }
  | { readonly issues: readonly { readonly message: string; readonly path?: readonly unknown[] }[] }
export interface SchemaFormSourceV1 {
  readonly type: string
  readonly '~standard': {
    readonly version: 1
    readonly vendor: string
    readonly validate: (value: unknown) => SchemaFormValidationV1 | Promise<SchemaFormValidationV1>
  }
}
export interface SchemaFormOptionsV1 {
  /** Change identity when switching game/package/record. A new identity resets field UI state. */
  readonly identity: string
  readonly schema: SchemaFormSourceV1
  readonly value: Readonly<Record<string, unknown>>
  readonly disabled?: boolean
  readonly locale?: string
  readonly onChange: (snapshot: SchemaFormSnapshotV1) => void
  /** Reports initial validation and subsequent external schema/value changes without creating a draft. */
  readonly onValidationChange?: (snapshot: SchemaFormSnapshotV1) => void
}
