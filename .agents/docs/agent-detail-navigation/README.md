# Agent detail navigation v1

`agent-detail-navigation/v1` lets a product page open the Host-owned details
view for one current Agent without receiving a URL, an Agent handle, or a
private navigator.

## Current detail projection

`AgentSessionDetailReferenceService.get({ sessionId })` resolves only the
caller's exact current, same-owner Session. The Host checks its current live
Agent record, owner/plugin generation, Session liveness, connection, and an
existing `AgentDetailReference { kind: 'host', ref }`. It returns that cloned
opaque reference or a typed nonaccepted result. It never creates or resumes an
Agent, calls plugin `agents.get`, reads a Room, or derives a reference from a
name, definition, URL, or Session generation.

The projection is current-only. A historical Session that has no current live
Agent detail returns `detail-unavailable` or another typed unavailable result;
it does not manufacture a durable detail reference.

## Host-owned open

`AgentDetailNavigationService.open({ target })` accepts only the existing
opaque host reference. Before navigating, the Host finds exactly one current
same-owner Agent record whose stored detail equals the target and rechecks
owner/plugin generation, Agent/Session liveness, and connection. Zero, stale,
or replaced matches are unavailable; more than one match is denied as
ambiguous. Only then may the Host call its private detail navigator. The Host
owns destination selection, Back, and history.

No public field carries an `AgentLoopTaskDetailsUrl`, external target, raw URL,
path, callback, page route, Room identity, or private Host handle. Legacy raw
details URLs are not translated by this contract.

## Minimal consumer flow

An active Team Session row already knows an exact `sessionId`. Its consumer
calls `get({ sessionId })`, retains the returned `target` only for display
interaction, and calls `open({ target })` on activation. A nonaccepted result
leaves the entry honestly unavailable. The consumer never creates/resumes an
Agent or guesses a URL.
