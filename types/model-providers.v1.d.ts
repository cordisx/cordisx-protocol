import type { BrandIconV1 } from './brand-icon.v1.js'

export interface ModelProviderModelV1 {
  readonly id: string
  readonly label: string
  /** Explicit equivalence identifiers, not display-name heuristics. */
  readonly aliases?: readonly string[]
  readonly group?: string
}

export interface ModelProviderV1 {
  readonly providerId: string
  readonly title: string
  readonly icon: BrandIconV1
  readonly models: readonly ModelProviderModelV1[]
  readonly defaultModelId?: string
}

export interface ModelProviderPresentationV1 {
  readonly providerId: string
  readonly title: string
  readonly icon: BrandIconV1
  /** Optional presentation/equivalence metadata for already-published model IDs. */
  readonly models?: readonly ModelProviderModelV1[]
}

/** A supplemental row, never a replacement renderer for an actual provider. */
export interface ModelProviderSelectorEntryV1 {
  readonly id: string
  readonly label: string
  readonly icon: BrandIconV1
  readonly action: {
    readonly label: string
    readonly icon: BrandIconV1
    run(signal: AbortSignal): void | Promise<void>
  }
}

export interface ModelProviderContributionV1 {
  dispose(): void
}

/** Owner-bound renderer facade; endpoint and credential registration is Node-only. */
export interface ModelProvidersV1 {
  readonly contract: 'cordisx.model-providers/v1'
  list(): readonly ModelProviderV1[]
  subscribe(listener: () => void): () => void
  refresh(): Promise<void>
  present(input: ModelProviderPresentationV1): ModelProviderContributionV1
  insert(input: ModelProviderSelectorEntryV1): ModelProviderContributionV1
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    readonly modelProviders: ModelProvidersV1
  }
}
