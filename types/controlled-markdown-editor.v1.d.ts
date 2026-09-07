/** Text selection offsets use the native editing surface's UTF-16 indices. */
export interface MarkdownEditorSelection {
  readonly start: number
  readonly end: number
}
/** Imperative editing capability; never exposes a Host element or Room model. */
export interface MarkdownEditorHandle {
  focus(options?: { readonly preventScroll?: boolean }): void
  getSelection(): MarkdownEditorSelection
  setSelection(start: number, end: number): void
}
