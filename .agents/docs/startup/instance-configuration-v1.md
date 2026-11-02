# Managed-service instance configuration v1

Status: experimental additive Node input in `@cordisx/protocol/startup-runtime/v1`.
This is an in-process callback contract, not a new serialized manifest, account
system, storage format, renderer accessor or public configuration writer.

## Exact caller and input

The Host invokes `StartupManagedServiceNodeModuleV1.apply(context, input)` with
`StartupManagedServiceApplyInputV1`. Its optional `configuration` is a
`StartupManagedServiceConfigurationV1` object with literal contract
`cordisx.managed-service-instance-configuration/v1` and a readonly JSON object
`value`. `StartupManagedServicePrepareInputV1` inherits the same optional input.
The Host passes the same immutable snapshot to base apply and every capability's
prepare for that plugin/service generation, including bounded preparation retries.

The source is the already selected profile's owning plugin instance
configuration, resolved by the Host before Node activation. The owner/source and
profile are determined by the existing Host selection and apply owner binding;
they are not caller-supplied configuration keys or a renderer request. The Host
MUST NOT obtain this input by accepting a renderer `Config` object, private
Context properties, an unchecked cast, runtime `HOME` replacement or global
environment mutation. No new lookup, persistence, profile-selection or account
access API is granted. Existing
[service configuration](../service-configuration/README.md) and
[plugin configuration](../plugin-configuration/README.md) authority boundaries
remain in force; this callback does not merge their stores or revision domains.

## Package-bound Node Config

`StartupManagedServiceNodeModuleV1` may export optional `Config` of type
`StartupManagedServiceConfigV1`. It reuses the public
[`SchemaFormSourceV1` and `SchemaFormValidationV1`](../../../types/schema-form.v1.d.ts)
validation vocabulary, narrows `~standard.validate` to synchronous results,
and requires `toJSON()` returning an explicit, closed raw object-root field tree.
This Node-only subset reuses field and reserved-role semantics; it is not a claim
that a Schemastery instance's `toJSON()` or the existing loosely typed descriptor
envelope has this representation. For example, Node `Config.toJSON()` returns:

```json
{"type":"object","dict":{"account":{"type":"object","dict":{"root":{"type":"string"}}}}}
```

A `{ "uid": ..., "refs": ... }` serialization, the
`{ "kind": "schemastery", "envelope": ... }` descriptor wrapper, a JSON string
and a root without `type: "object"` plus `dict` are invalid return values. A package
using a full Schemastery instance must explicitly declare this Node field tree
or convert its schema into the supported closed subset before returning it;
blindly forwarding the instance's `toJSON()` is not conformant. Reference
hydration, uid/refs decoding and a new form schema system are outside this seam.
The TypeScript root constraint excludes those forms; nested completeness still
requires Host validation, not a structural type assertion. The portable closed
subset contains object nodes with explicit `dict`, array nodes with explicit
`inner`, and string/number/boolean leaf nodes, plus the existing `meta.role` and
`meta.default` meaning. Every descendant must be inspectable; arbitrary/open
records, lazy references and unresolved `list` branches are not proof of closure.
Hosts reject unsupported constructs rather than guess missing sensitive positions. This Node `Config` must come from
the exact admitted service entry module whose package source/digest and owner
have already been validated; an object from a renderer fiber, another package,
a runtime config value or an arbitrary resolver cannot replace it.

After authorized Node module import and before base apply, the Host reads this
schema and validates its complete data projection with its existing configuration
policy. All supplied input fields, nested fields, array elements and normalized
output fields must be accounted for by supported projected nodes. Unknown keys
are rejected even if the validator would silently strip or preserve them. Missing
object dictionaries/item shapes, unknown node types, unresolved lazy/reference
nodes and uninspectable union branches fail closed when the Host cannot prove
complete sensitive positions and value coverage. The root must describe an object.
A plain Standard Schema validator, `type`/vendor string, empty `toJSON` result,
`safe` boolean, or package parser alone is not proof of a complete schema. A
conforming Host may reject unsupported projection constructs; it must never treat
them as evidence that there are no secrets.

The Host reuses the reserved roles `secret`, `credential`, `credential-ref`,
`permission` and `capability` and existing sensitive-default rejection. It first
checks safe input shape and projected field coverage, then removes reserved-role
values before passing a detached nonsecret candidate to `~standard.validate`.
Secret values/handles are never given to this callback by this seam. Validation
must return a synchronous successful value: issues, a thrown exception, a Promise
or any thenable reject activation with a bounded nonsecret error. The Host then
checks the normalized output for safe JSON, complete projected field coverage and
reserved-role fields again before cloning/freezing the final configuration.
A validator cannot add an unknown field, restore a secret field, or smuggle a
callback/handle through normalization. Reserved-role defaults are invalid rather
than silently materialized. Schema and value must remain paired to the admitted
module and activation generation; caching by plugin id alone is insufficient.

No selected override (undefined or an empty object) may retain legacy/default
behavior with `Config` omitted. A nonempty override without this complete proof
MUST fail closed before apply/prepare, not be silently ignored or forwarded raw.
If `Config` is present, its schema/default checks also apply to the empty candidate.
A schema needed only for Node input does not register a renderer form or merge
renderer/service config planes. Packages should declare their nonsecret account
options as explicit object fields in this schema; no account-system contract,
secret writer, filesystem grant or special built-in account field is introduced.

## Validation and authority

Before invocation, the Host MUST select the exact owner instance, validate the
JSON data shape, remove all declared secret/credential/reference fields using
its existing configuration policy, and clone and recursively freeze the supplied
snapshot. Numbers must be finite; functions, accessors, cycles, process objects,
non-JSON instances and handles are invalid. The Host MUST fail closed instead of
forwarding a partially redacted object when sensitive positions cannot be
established. Field-name heuristics alone do not prove that a value is nonsecret.
Only the nonsecret resolved instance value is passed, never the raw profile,
configuration-store path, credential bytes, secret handles or account contents.

The package owns the meaning and validation of its nonsecret fields, including
root, site, layout and storage choices. Before registering a definition or
starting preparation it MUST validate interpreted values and reject unsupported
modes or paths under its existing resource/permission policy. A path is data, not
a grant to read or write that location. Choosing an account-directory path does
not authorize discovering credentials, copying account files or broadening
filesystem authority. The package may use validated values to derive its
existing status/authentication and gateway/launch definitions consistently from
one snapshot; it cannot use the input to bypass the existing managed-service
executable, protected-binding, filesystem or authentication contracts.

Host validation covers provenance, safe data and redaction; package validation
covers product-specific values. Neither step substitutes for the other. No
implicit shell evaluation, environment-variable interpolation or process-global
environment write is part of this contract. Observation snapshots MUST NOT copy
this configuration into renderer-visible startup state.

## Defaults and changes

Omission means the Host supplies no instance override. An empty `value` supplies
no field overrides. Both retain the package's established service-home and
authentication defaults; old v14 apply behavior and existing definitions stay
unchanged. A package requiring an explicit override must reject its absence
clearly rather than infer it from private Host state or an environment variable.
An older Host may omit this optional input; packages must not claim an override
was honored in that case.

The snapshot is fixed for one activation generation. A mutation to the selected
configuration follows the existing application mode, candidate/last-good,
generation fencing and atomic component update transaction. The Host MUST NOT
mutate an already handed-out value, switch only prepare to another revision,
or replace just the authentication/status definition while retaining a gateway
built from an older value. Retries within the same generation reuse its snapshot;
configuration replacement uses the existing generation transition. This input
changes no startup wait policy, base-apply completion requirement or fingerprint
semantics, and performs no service restart by itself.
