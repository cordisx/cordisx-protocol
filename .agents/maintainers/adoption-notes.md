# Historical adoption notes

These are informative handoff records, not normative specifications or current
implementation status. They were separated from the public specifications on
2026-09-05 using repository commit
[`be4905a7471e9829d2b834d9c3f17ac2404951f3`](https://github.com/cordisx/cordisx-protocol/tree/be4905a7471e9829d2b834d9c3f17ac2404951f3).
The capture date records this documentation move; it does not date or verify a
Host or consumer release. Recheck owning repository revisions and runtime
evidence before using an old handoff to plan new work.

## Agent and Session adoption

Source: [Agent runtime minimum consumption at the captured revision](https://github.com/cordisx/cordisx-protocol/blob/be4905a7471e9829d2b834d9c3f17ac2404951f3/.agents/docs/agent-runtime/README.md#minimum-consumption).
The source described this incremental adoption sequence:

Host adds three typed Cordis services to its public context and binds them to
one Host-owned runtime authority. It may keep the existing AgentLoop v4
registration active in parallel.

Chatroom may adopt `ctx.agents.create/resume/get` and an acquired Agent's
`followup`, `steer`, `inject`, `discard`, `cancel`, and `whenIdle` incrementally.
It should keep the accepted current AgentLoop path until the Host-provided new
services are available and verified.

Trace calls `ctx.sessions.get(sessionId)`, captures `snapshot()`, reads pages
pinned to `snapshotSeq`, and then subscribes after the last committed sequence.
It renders durable state only from SessionEvent and observes
`subscription.closed` as a terminal fence.

## AgentLoop checkpoint

Source: [AgentLoop at the captured revision](https://github.com/cordisx/cordisx-protocol/blob/be4905a7471e9829d2b834d9c3f17ac2404951f3/.agents/docs/agent-loop/README.md).
The source called v4 a local additive Protocol candidate and allowed the first
Host/Chatroom checkpoint to project text parts end to end. That checkpoint note
did not establish support for image rendering. The frozen Shell v1 text-only
shape and explicit handling of unsupported image references remain in the
[normative AgentLoop specification](../docs/agent-loop/README.md#content-and-proactive-events).
Protocol maturity remains a separate label from where a change has merged or
which consumer has adopted it.

## Historical planning list

Source: [the specification index at the captured revision](https://github.com/cordisx/cordisx-protocol/blob/be4905a7471e9829d2b834d9c3f17ac2404951f3/.agents/docs/README.md).
The index listed isolated execution, remote distribution, publisher-key
registration UX, activation-registry deployment, transparency, and public
marketplace activation as planned areas. This is retained as historical context;
it is not a current availability matrix or an instruction to implement them.

## Conversation renderer retirement preparation, 2026-09-08

[Chatroom #74](https://github.com/cordisx/plugin-chatroom/issues/74) prepares a
plugin-owned replacement for the Host business renderer. The
[Host bounded consumer audit](https://github.com/cordisx/cordisx/blob/6536b5157f63a7a891e818ca7265541e857712e5/.agents/docs/conversation-ui-boundary.md)
records exact fetched plugin revisions and the replacement gate. It is a
preparation candidate, not a Host removal or accepted native preview.

Renderer retirement does not remove frozen Shell schema/type exports. Current
Agent execution code and Chatroom still reuse historical item and command
contexts; their compatibility is distinct from UI ownership. No Shell version
is added for the new product layout. The historical unloaded-session navigation
gap is isolated in [detail navigation v2](../docs/agent-detail-navigation/v2.md),
with explicit new methods and the v1 current-only methods preserved.
