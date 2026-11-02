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
