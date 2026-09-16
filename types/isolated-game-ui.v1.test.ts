import type { GameUiClientV1, GameUiParticipantV1, GameUiSeatV1, GameUiSnapshotV1 } from './isolated-game-ui.v1.js'
const legacy: GameUiSnapshotV1 = {
  matchId: 'match',
  sequence: 0,
  observation: {},
  status: 'waiting',
  canAct: false,
  readOnly: false,
  theme: 'light',
}
const participant: GameUiParticipantV1 = { seatIndex: 0, name: 'Player', kind: 'human', isOwner: true }
const current: GameUiSnapshotV1 = { ...legacy, participants: [participant] }
declare const seat: GameUiSeatV1
seat.publish(legacy)
seat.publish(current)
declare const client: GameUiClientV1
client.subscribe(snapshot => {
  snapshot.participants?.[0].seatIndex satisfies number | undefined
})
// @ts-expect-error participant metadata never carries account identity
const account: GameUiParticipantV1 = { ...participant, accountId: 'private' }
// @ts-expect-error seatIndex is the only public seat field
const alternate: GameUiParticipantV1 = { ...participant, seat: 0 }
// @ts-expect-error kind is bounded
const kind: GameUiParticipantV1 = { ...participant, kind: 'owner' }
// @ts-expect-error ownership must be explicit
const missingOwner: GameUiParticipantV1 = { seatIndex: 0, name: 'Player', kind: 'human' }
// @ts-expect-error the snapshot projection is readonly
current.participants?.push(participant)
void [account, alternate, kind, missingOwner]
