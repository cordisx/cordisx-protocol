import type { CurrentUserProfileV1, CurrentUserResultV1, CurrentUserV1 } from './current-user.v1.js'
const profile = {
  subject: 'host:opaque-local-subject',
  displayName: 'Player',
  avatar: 'data:image/png;base64,AA==',
} satisfies CurrentUserProfileV1
declare const user: CurrentUserV1
user.contract satisfies 'cordisx.current-user/v1'
user.read().then(result => {
  if (result.status === 'available') result.profile.subject satisfies string
  else result.reason satisfies 'signed-out' | 'host-unavailable' | 'generation-retired'
})
const dispose = user.subscribe(result => result.status)
dispose()
const guest = { status: 'unavailable', reason: 'signed-out' } satisfies CurrentUserResultV1
// @ts-expect-error raw native identity is not a display-profile field
const identity = { ...profile, accountId: 'private' } satisfies CurrentUserProfileV1
// @ts-expect-error credentials are never part of the projection
const token = { ...profile, accessToken: 'private' } satisfies CurrentUserProfileV1
// @ts-expect-error unavailable cannot carry stale profile data
const stale = { ...guest, profile } satisfies CurrentUserResultV1
// @ts-expect-error this interface does not create a login flow
user.login()
void [identity, token, stale]
