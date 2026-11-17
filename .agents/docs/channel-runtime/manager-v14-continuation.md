# Channel Manager v14: continuation defaults

The additive [v14](../../../types/channel-manager.v14.d.ts) successor mounts a
Host-owned continuation defaults form through `mountContinuationDefaultsForm`.
It uses the existing own-settings-service caller, managed page seat, permission,
revision fence, disposal and generation-scoped draft rules. Opening it never
saves or activates continuation. Older Hosts remain supported by detecting the
method; frozen v13 and earlier behavior is unchanged.

The profile default is disabled (opt-in), with ratio 0.90 when enabled; values
must be finite and strictly greater than zero and at most 0.95. The form explains
that the ratio applies to the effective automatic compaction budget, not the raw
or usable model window. A missing or unavailable budget is not represented as an
effective 90% threshold. Profile defaults govern new Channel sessions; an
explicit per-session override takes precedence for that session, while an absent
or cleared override inherits the profile setting. Editing a profile default does
not erase explicit session overrides. A save uses the Host's revision fence and
reports conflicts; form contents and storage remain Host-owned. This contract
adds neither plugin DOM nor a Host implementation.

Creating a fresh task, readiness, cancellation and history catch-up remain
Host/Channel business flows; the general read-only context service does not
perform them. Protocol conformance does not imply Host adoption or publication.
