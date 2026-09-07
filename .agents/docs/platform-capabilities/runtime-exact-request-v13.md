# Runtime exact-request Platform scope

Status: normative additive manifest/package v13 contract for Host-bound,
non-DOM Platform calls. Manifest and package v1-v12 remain frozen.

## Declaration

Manifest v13 adds one closed scope marker for five sensitive Platform
capabilities:

```json
{
  "name": "tasks.content.read",
  "required": false,
  "scope": { "runtime": "exact-request" }
}
```

The allowed names are `tasks.content.read`, `tasks.create`, `tasks.control`,
`turns.submit`, and `turns.control`. `required` is always `false`. The scope has
only `runtime: "exact-request"`; a plugin cannot add a provider, workspace,
Session, wildcard, selector, request id, policy, fingerprint, or grant. Existing
static Platform declarations remain available through the frozen predecessor
shape. A manifest cannot declare the same capability twice across the static
and exact-request forms.

The marker declares that the feature can request authority later. It is not a
maximum wildcard, normalized permission scope, authorization decision, or
durable policy key.

## Host materialization

Immediately before each operation, the Host validates the real call arguments
and materializes one concrete scope:

| Capability | Call-owned target | Concrete permission scope |
| --- | --- | --- |
| `tasks.create` | `model.providerId` and canonical absolute `cwd` | `{ providers: [providerId], cwdRoots: [cwd] }` |
| `tasks.content.read` | complete `session` | `{ sessions: [session] }` |
| `tasks.control` | complete `session` | `{ sessions: [session] }` |
| `turns.submit` | complete `session` | `{ sessions: [session] }` |
| `turns.control` | complete `session` | `{ sessions: [session] }` |

The Host derives this value itself from the same validated request it will
dispatch. It does not accept a second caller-supplied authorization scope. A
missing, malformed, stale, unresolved, or unavailable provider, CWD, or Session
fails closed before prompting or dispatch. Task creation additionally validates
the complete model through the resolved provider; Session operations preserve
both `providerId` and `remoteSessionId`.

For task creation, the Host resolves dot segments and platform separators using
the filesystem semantics explicitly selected by the execution environment; it
does not infer the platform from path spelling. POSIX accepts only POSIX
absolute paths. Windows accepts only drive-qualified absolute paths or complete
ordinary server/share UNC paths; device namespaces and current-drive-root paths
are rejected. Relative, drive-relative, control-character, cross-platform, or
otherwise ambiguous paths fail closed.
The canonical absolute CWD in the permission scope is the same value used for
the eventual provider dispatch; the Host cannot authorize one path and execute
another.

The Host then evaluates the existing capability catalog against that concrete
scope and computes the existing security/scope fingerprint from it. The current
catalog applies `dynamic-scope` to `tasks.content.read`, `tasks.create`, and
`turns.submit`; it applies `always` to `tasks.control` and `turns.control`.
Authorization happens before every dispatch. An `always` entry requires a new
explicit runtime decision even when the same target was approved earlier.

Manifest v13 refines install, update, and enable review for this marker. Every
ordinary static capability declaration still appears once in the existing
authorization plan and decision. Each exact-request marker instead appears once
in a separate Host-rendered, read-only “authorized at use” explanation. It is
excluded from the plan's authorizable `declarations` array because no concrete
permission scope or security fingerprint exists yet. It produces no decision,
policy write, ticket, or grant, and its optional unresolved state never blocks
activation. Omitting it from both the authorization plan and that explanation
is non-conforming.

The Host must not convert `exact-request` into an empty, provider-wide,
workspace-wide, Session-wide, or all-target scope. When the catalog permits a
durable decision for a `dynamic-scope` capability, that decision is keyed only
to the materialized concrete scope and its fingerprint. It can never be stored
under the marker or widened by omitting a dimension. Existing one-shot cleanup,
generation fencing, policy withdrawal, audit, and prompt ownership remain in
force.

## Package and compatibility

Package v13 preserves every package-v12 distribution, path, dependency,
runtime-ABI, entity-template, and digest boundary. It only adds manifest v13 to
the closed runtime-manifest schema list. A package still includes the manifest
schema in `compatibility.protocolSchemas`, validates its digest, and requires
package/runtime ids to match before activation.

Older Hosts reject manifest or package v13 as unsupported. They must not drop
the marker, reinterpret it as `{}`, or fall back to a frozen static declaration.
Manifest and package v1-v12 retain their original bytes and semantics.
