declare const visualProviderIdBrand: unique symbol

export type VisualData =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<VisualData>
  | { readonly [key: string]: VisualData }

export type VisualTheme = 'light' | 'dark'
export type VisualProviderId = string & Readonly<{ [visualProviderIdBrand]: 'cordisx.visual-provider-id/v1' }>

export interface VisualProjection {
  readonly theme: VisualTheme
  readonly data: VisualData
}

/** Validate, detach, and deeply freeze one opaque visual data value. */
export declare function cloneVisualData(value: unknown): VisualData

/** Validate one owner-local provider id without adding ownership information. */
export declare function parseVisualProviderId(value: unknown): VisualProviderId
