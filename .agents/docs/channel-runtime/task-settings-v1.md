# Channel task settings v1 and Manager v12

The `channel-task-settings/v1` successor defines consumer-owned Provider,
model and effort preferences separately from Channel transport and credentials.
`channel-manager/v12` adds the `task-models` section and a Host-rendered model
form for an opaque active binding. Frozen predecessor forms are preserved.

The Host supplies only its admitted catalog. A saved default is not evidence of
an available model or successful authentication. Global defaults merge with
matching account, conversation, kind, user-group and user defaults, with more
specific values winning. Equal-specificity conflicting values are unavailable,
never selected by declaration order. No binding cardinality limit is introduced.

Model mutations evaluate every changed field, including model changes implied
by selecting a Provider. Account/conversation allow buckets intersect; within a
bucket any matching allow applies. User and user-group selectors intersect
when both are present. Provider, Provider-qualified model and effort constraints
intersect with those scopes. Deny rules win. No remote mutation is allowed in
the absence of an applicable allow rule; querying does not require a mutation
grant. Names are display data and cannot establish user authority.

An authorized user may change settings directly. Other users receive a fixed
request for one target, patch and captured revision. Card or message approval
must come from an authenticated Channel actor currently authorized for those
same fields and values; general command approval is insufficient. Bindings,
revision, catalog and authority are rechecked before applying. Requests expire,
are single-use, and cannot be widened by a later Agent call. Unknown native
outcomes are not automatically repeated.

Native Provider switching occurs only while a task is idle. Active tasks keep
their current turn; accepted changes queue for the next turn. Creation defaults
apply before the first native task turn, including its effort. Actual native
state is distinct from saved or queued preferences.

Host forms retain actual caller source/generation ownership, revision fencing,
permission checks and disposal from Manager v11. Mounting a form never saves or
grants authority. Older Hosts omit v12; plugins keep v11 settings and execution
forms and report model settings unavailable without private Host fallbacks.
Protocol conformance is not Host adoption or live platform verification.
