import type { WorkUsageSnapshotV2 } from './usage.v2.js'
export interface ManagedSourceBindingV1 {
  readonly origin: string
  readonly sourceId: string
  readonly instanceId: string
  readonly audience: 'source-account' | 'work-income'
}
export interface ManagedSourceChallengeV1 extends ManagedSourceBindingV1 {
  readonly contract: 'cordisx.managed-source-challenge/v1'
  readonly nonce: string
  /** Unix milliseconds; valid for at most 30 seconds. */
  readonly expiresAt: number
}
export interface ManagedSourceAssertionV1 extends ManagedSourceBindingV1 {
  readonly audience: 'source-account'
  readonly contract: 'cordisx.managed-source-assertion/v1'
  readonly nonce: string
  readonly expiresAt: number
  /** Opaque identity from the actual signed-in native account, never display identity. */
  readonly subject: string
  readonly displayName?: string
}
export interface ManagedWorkObservationV1
  extends Omit<ManagedSourceAssertionV1, 'contract' | 'displayName' | 'audience'>
{
  readonly audience: 'work-income'
  readonly contract: 'cordisx.managed-work-observation/v1'
  /** New Host owner/account lease or a gap requires a baseline, never historic credit. */
  readonly leaseId: string
  readonly continuity: 'baseline' | 'continuous'
  readonly snapshot: Extract<WorkUsageSnapshotV2, { readonly status: 'ready' }>
}
export interface ManagedSourceEnvelopeV1<T> {
  readonly payload: T
  /** Unpadded canonical base64url of the 64-byte Ed25519 signature. */
  readonly signature: string
}
/** Server signs both the challenge and result; result binds the consumed request nonce and subject. */
export interface ManagedSourceResultV1 extends ManagedSourceBindingV1 {
  readonly contract: 'cordisx.managed-source-result/v1'
  readonly nonce: string
  readonly subject: string
  readonly result: Readonly<Record<string, unknown>>
}
/** UTF-8 of recursively sorted JSON, bounded to 1 MiB; domain separated. */
export function managedSourceBytes(value: unknown): Uint8Array
export function managedSourceBinding(value: unknown): ManagedSourceBindingV1
export function managedSourceChallenge(
  value: unknown,
  binding: ManagedSourceBindingV1,
  now?: number,
): ManagedSourceChallengeV1
