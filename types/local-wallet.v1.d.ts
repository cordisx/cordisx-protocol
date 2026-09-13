import type { WorkUsageSnapshotV2 } from './usage.v2.js'

export interface LocalWalletBindingV1 {
  readonly origin: string
  readonly sourceId: string
  readonly instanceId: string
  readonly audience: 'local-wallet-enrollment' | 'local-wallet' | 'local-work-income'
}
export interface LocalWalletChallengeV1 extends LocalWalletBindingV1 {
  readonly contract: 'cordisx.local-wallet-challenge/v1'
  readonly nonce: string
  readonly expiresAt: number
}
/** Signed by the provisioned original-account issuer, under valid original account authority. */
export interface LocalWalletEnrollmentV1 extends LocalWalletBindingV1 {
  readonly contract: 'cordisx.local-wallet-enrollment/v1'
  readonly audience: 'local-wallet-enrollment'
  readonly nonce: string
  readonly expiresAt: number
  readonly nativeSubject: string
  /** host-local: plus unpadded base64url SHA-256 of publicKey's SPKI DER bytes. */
  readonly subject: string
  /** Canonical standard base64 of Ed25519 SPKI DER, never a private key. */
  readonly publicKey: string
}
/** Signed by the enrolled Host-profile local key, not a Native identity assertion. */
export interface LocalWalletAssertionV1 extends LocalWalletBindingV1 {
  readonly contract: 'cordisx.local-wallet-assertion/v1'
  readonly audience: 'local-wallet'
  readonly nonce: string
  readonly expiresAt: number
  readonly subject: string
}
export interface LocalWorkObservationV1 extends Omit<LocalWalletAssertionV1, 'contract' | 'audience'> {
  readonly contract: 'cordisx.local-work-observation/v1'
  readonly audience: 'local-work-income'
  readonly leaseId: string
  readonly continuity: 'baseline' | 'continuous'
  readonly snapshot: Extract<WorkUsageSnapshotV2, { readonly status: 'ready' }>
}
export interface LocalWalletResultV1 extends LocalWalletBindingV1 {
  readonly contract: 'cordisx.local-wallet-result/v1'
  readonly nonce: string
  readonly subject: string
  /** Required for enrollment; absent for local sessions and work observations. */
  readonly nativeSubject?: string
  readonly result: Readonly<Record<string, unknown>>
}
export interface LocalWalletEnvelopeV1<T> {
  readonly payload: T
  readonly signature: string
}
/** Domain-separated canonical sorted JSON. Does not confer signing authority. */
export function localWalletBytes(value: unknown): Uint8Array
export function localWalletBinding(value: unknown): LocalWalletBindingV1
export function localWalletChallenge(
  value: unknown,
  binding: LocalWalletBindingV1,
  now?: number,
): LocalWalletChallengeV1
