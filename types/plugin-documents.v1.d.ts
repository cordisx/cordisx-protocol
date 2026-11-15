/** Package-owned documentation, read by the Host; it supplies no instructions or capabilities. */
export interface PluginDocumentsV1 {
  readonly contract: 'cordisx.plugin-documents/v1'
  readonly documents: readonly {
    readonly id: string
    readonly title: string
    readonly path: `./${string}`
    readonly locale?: string
  }[]
}
export interface PluginDocumentReadbackV1 {
  readonly contract: 'cordisx.plugin-document-readback/v1'
  readonly pluginId: string
  readonly id: string
  readonly title: string
  readonly locale?: string
  readonly content: string
}
