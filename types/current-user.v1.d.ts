/** Public presentation only; subject is opaque and scoped to one plugin and Host profile. */
export interface CurrentUserProfileV1 {
  readonly subject: string
  readonly displayName?: string
  /** Optional canonical inline PNG/JPEG/WebP base64 data URL, at most 65536 characters. */
  readonly avatar?: string
}
export type CurrentUserResultV1 = {
  readonly status: 'available'
  readonly profile: CurrentUserProfileV1
} | {
  readonly status: 'unavailable'
  readonly reason: 'signed-out' | 'host-unavailable' | 'generation-retired'
}
/** Read-only current Host user's display profile. Never a login or an identity attestation. */
export interface CurrentUserV1 {
  readonly contract: 'cordisx.current-user/v1'
  read(): Promise<CurrentUserResultV1>
  /** Emits an initial result and subsequent changes; callbacks are fenced by owner lifetime. */
  subscribe(listener: (result: CurrentUserResultV1) => void): () => void
  dispose(): void
}
