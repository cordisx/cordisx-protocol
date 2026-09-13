# Embedded schema form v1

The embedded form uses the same Host field presenters and validation as plugin configuration. A Host may expose a framework adapter such as `SchemaForm`; it must not require plugins to import implementation files. The form owns no page header, footer, persistence or outer scroll container. It can be placed in a page, panel or dialog body.

`identity` scopes field state and nested editors. `value` is controlled; `onChange` reports the next draft, validity and path-addressed issues. Invalid input remains editable and must not be submitted as valid. `onValidationChange` reports initial and externally changed values without treating these as user edits. Changing identity resets field-local state. Unmounting must release every listener and nested presenter.

A source is a synchronous trusted Schemastery object. Data received from a remote game must first be checked against a bounded data-only schema vocabulary and compiled using safe factories. Hosts and plugins must never pass arbitrary serialized callbacks to a schema constructor. Unsupported kinds or asynchronous validators produce a diagnostic, never a silently substituted control. Validation supplements the source with Host presenter validation. Disabled fields remain in the draft; consumers enforce business authorization server-side.

Defaults are supplied by the schema author and materialized by the caller before passing a draft. A schema replacement does not implicitly carry values across unrelated fields or games. Consumers must scope drafts by immutable game version/package identity, remove invalidated fields and revalidate prior to submission. All server inputs are independently validated.

Older Hosts without an embedded adapter report unsupported capability. Consumers must not access private Host renderers as a fallback. This contract grants no persistence, network, credential or code-execution authority.

Types: [schema-form.v1.d.ts](../../types/schema-form.v1.d.ts).
