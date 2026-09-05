# Plugin generation artifacts

## Version 1 scope

`plugin-generation-artifact.v1.schema.json` describes one immutable browser
ESM graph built from a plugin package entry for one module generation. It is a
Host-produced artifact document, not an authoring manifest, permission request,
network capability, update transport, or filesystem projection.

Frozen `plugin-package.v1` through `plugin-package.v8` documents keep their
existing meaning. Their `entry` remains the single package-relative source
entry inspected and built by the Host. A producer may represent a legacy
single `module.js` artifact as a version-1 graph containing only that module;
existing stored single-file artifacts remain valid inputs to a compatible
Host and do not require an on-disk artifact document to be rewritten.

The public TypeScript entrypoint is
`@cordisx/protocol/plugin-generation-artifact/v1`. The machine contract is
`plugin-generation-artifact.v1.schema.json`.

## Closed graph

The document contains:

- `format: "browser-esm-graph"`;
- one `entry` logical path naming a listed JavaScript module;
- `initialStyles`, the exact sorted stylesheet set attached to the entry and
  its transitive static-import closure;
- `sharedImports`, the exact sorted subset of closed Host modules used by the
  emitted graph; and
- a path-sorted `files` inventory of modules, stylesheets, and static assets.

Every file records its artifact-root logical path, kind, exact media type,
SHA-256 digest, and byte length. Module records separately list sorted static
module imports, dynamic module imports, styles, and assets. Stylesheet records
list their static assets. These relationships use artifact-root logical paths;
the corresponding emitted ESM and CSS references are relative to the actual
referencing file URL. All listed files must be reachable from `entry`. There
are no optional untracked chunks or resources.

Logical paths begin with `./`, contain one through eight ASCII URL-safe
segments, have no empty, dot, parent, percent-encoded, query, or fragment
component, and are at most 512 characters. Exact and case-folded path
collisions are invalid. A graph contains at most 4,096 files, one file contains
at most 64 MiB, and all file byte lengths sum to at most 256 MiB.

Version 1 accepts these file forms:

| Kind | Extension | Media type |
| --- | --- | --- |
| module | `.js`, `.mjs` | `text/javascript` |
| stylesheet | `.css` | `text/css` |
| image asset | `.avif`, `.gif`, `.jpeg`, `.jpg`, `.png`, `.svg`, `.webp` | matching `image/*` value |
| font asset | `.woff`, `.woff2` | matching `font/*` value |
| WebAssembly asset | `.wasm` | `application/wasm` |

An implementation may choose physical subdirectories and content-derived file
names inside these rules. Such build naming is not protocol identity and a
consumer must use the logical paths rather than infer a producer-specific
layout.

Before any code runs, the Host validates the complete inventory, graph
relations, exact size, digest, path, case-fold, media-type, and containment
rules against an immutable captured output tree. Directories, links, devices,
sockets, undeclared files, and bytes changed after validation are rejected.
Serving a listed file requires digest and byte-length readback from the same
immutable artifact. The existing activation digest continues to bind package
and runtime-manifest identity with the built artifact; per-file digests do not
replace it.

## Module and URL resolution

The Host assigns each candidate module generation one opaque absolute base URL
ending in `/`. It reveals no source or content-store path. Resolving every
logical path against that base must stay inside the same generation root, and
the Host serves only a listed file with its declared media type. Static and
dynamic ESM imports, stylesheet resources, `import.meta.url`, and
`new URL(relativePath, import.meta.url)` therefore retain normal browser URL
semantics. Network, absolute, protocol-relative, `data:`, and `blob:` module or
stylesheet-resource references are not artifact edges and are rejected by the
build validator. This restriction does not add or remove separately brokered
runtime network authority.

Bare module imports are invalid except for the exact values declared in the
artifact's `sharedImports`, which is a subset of this frozen version-1 catalog:

- `cordisx/contracts`
- `cordisx/react`
- `cordisx/react/jsx-runtime`
- `cordisx/react/jsx-dev-runtime`
- `cordisx/ui`
- `react`
- `react/jsx-runtime`
- `react/jsx-dev-runtime`
- `react-dom`
- `react-dom/client`

The Host resolves the catalog against its exact runtime generation. CordisX
React modules and compatible React peer imports return the same Host React
singleton; ReactDOM peer imports return the matching Host ReactDOM singleton.
This artifact exception exists for already validated compatible transitive
peer dependencies. It does not allow plugin source to import React or ReactDOM
directly instead of the documented `cordisx/react` and `cordisx/ui` boundary,
does not allow a private renderer copy, and does not let a manifest add another
shared module. An undeclared catalog import, arbitrary package name, Node
builtin, or external URL fails the candidate before evaluation.

## Loading and demand

Activation begins only `initialStyles` and the entry import. Native ESM then
loads the entry's transitive static module closure. A dynamic module, the
styles attached only to its dynamic closure, and assets reachable only from
that closure must not be requested merely because the entry was activated.
When the plugin executes the corresponding `import()`, the generated ESM graph
and generation-owned resource loader fetch the target closure and apply its
styles before exposing that module as ready. Failure to load or verify any
required module, stylesheet, or asset fails that import; candidate-readiness
failure follows the normal last-good rollback rules.

The same absolute module URL has native ESM identity within one generation, so
repeating an import neither re-evaluates the module nor creates a second style
owner. Listed immutable responses may use immutable HTTP caching. Caching is a
transport optimization only; registration and capability handles remain
fenced by the current plugin generation.

## Generation ownership and cleanup

The artifact base URL, module evaluations, pending imports, styles, and
resource records belong to the exact candidate or active module generation.
Candidate styles remain staged and non-active until the existing whole-closure
publication transaction succeeds. Publication makes candidate styles active
with the candidate registries; candidate failure removes them and preserves
last-good styles.

Replacement, rollback, disable, uninstall, and runtime disposal first fence
the retiring generation against new calls and registrations. They then remove
every style owned by that generation and retire its resource loader. A module,
asset, or stylesheet request that settles after the fence cannot expose a
module to `apply`, attach or reattach a stylesheet, publish a registration, or
make the retired generation current. Failure to remove one style is a cleanup
failure, never permission for the old generation to remain active. Rollback to
the same package bytes creates a fresh module generation and base URL; a
disposed module namespace is not republished.

Module top-level code remains declarative because browser ESM evaluates before
Cordis owns the plugin fiber. All registrations and product effects still
begin in `apply()` and retain their existing disposers.

## Development compatibility

This document governs immutable production package generations. Local
development continues to use the existing development server's ESM graph,
Fast Refresh, and plugin-generation replacement behavior. It introduces no
second WebSocket, CDP notification, or HMR protocol. A development build may
use different URLs and filenames, but it must preserve the shared-runtime
identity and lifecycle rules when a plugin generation is replaced.
