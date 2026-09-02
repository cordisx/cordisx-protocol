import type {
  Session,
  SessionEvent,
  SessionEventDataMap,
  SessionRegistry,
  UserMessage,
} from './sessions.v1.js'

declare const sessions: SessionRegistry
declare const session: Session
declare const message: UserMessage

const event = {
  $schema: 'https://raw.githubusercontent.com/cordisx/cordisx-protocol/main/schemas/session-event.v1.schema.json',
  contract: 'cordisx.session-event/v1',
  schemaVersion: 1,
  sessionId: session.id,
  seq: 0,
  time: 1,
  type: 'user/message',
  data: message,
  surfaceOp: 'append',
} satisfies SessionEvent<'user/message'>

event.data.id satisfies string
session.read({ afterSeq: -1, limit: 100 })
session.snapshot().then(result => {
  if (result.status === 'available') session.read({ afterSeq: -1, snapshotSeq: result.snapshot.snapshotSeq })
})
session.subscribe({ afterSeq: -1 }, async page => { page.phase satisfies 'replay' | 'live' })
sessions.get(session.id)

declare module './sessions.v1.js' {
  interface SessionEventDataMap {
    'example/notice': { readonly value: string }
  }
}

const extension: SessionEvent<'example/notice'> = {
  $schema: event.$schema,
  contract: event.contract,
  schemaVersion: 1,
  sessionId: session.id,
  seq: 1,
  time: 2,
  type: 'example/notice',
  data: { value: 'ok' },
  ignorable: true,
}
extension.data satisfies SessionEventDataMap['example/notice']

// @ts-expect-error non-surface events cannot forge source-event causality
const badSourceSeqs: SessionEvent<'turn/start'> = { ...extension, type: 'turn/start', data: { turn: 1 }, sourceEventSeqs: [0] }
void badSourceSeqs
