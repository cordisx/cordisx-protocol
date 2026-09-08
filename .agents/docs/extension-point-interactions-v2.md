# Visual interactions v2

Experimental callable capability exported by `@cordisx/protocol/extension-point-interactions/v2`.
It preserves v1 drag, hover, sequence, permission, generation and disposal semantics.
The factory discriminant is `cordisx.extension-point-interactions/v2`; v1 remains frozen
and supports only its original flat menu declarations. Plugins detect the version
before supplying v2 fields. This is not a serialized wire document.

## Menu tree

`setMenu` accepts null or a readonly tree of `{ id, label, disabled?, icon?, children? }`.
Only these fields are accepted. IDs are nonblank strings of at most 100 characters,
unique across the whole tree; labels are plain nonblank text up to 200 characters.
Disabled is boolean. Icon is a Host semantic key (for example `content.palette` or
`navigation.store`) or built-in token: at most 100 ASCII letters, digits, dots,
underscores or hyphens, beginning with a letter. Icons are resolved by Host;
unknown tokens use its fallback. Raw markup, image URLs and callbacks are forbidden.

Each array contains at most 20 items, the tree at most 64 nodes and at most 3 levels
(root is level 1). Present children must be a nonempty array. Cycles, duplicate IDs,
unknown fields and excess bounds reject the entire update without changing the old
menu. Host stores a recursive immutable copy. Null or an empty root clears the menu.
Disabled branches cannot open; only enabled leaves dispatch their id as actionId.

## Host interaction

The Host owns themed SVG icons, menu surfaces, viewport positioning and browser events.
Pointer entry or activation opens a branch; entering another sibling closes deeper
panels. Up/Down wrap enabled siblings, Home/End move to the first/last sibling,
Right opens a branch, Left closes a submenu and restores its parent focus.
Escape closes the deepest submenu first, then the root; Tab dismisses the whole menu.
Enter/Space use native button activation. Branch opening never emits actionId.
Outside pointer/focus, external scrolling, window blur/resize, permission revocation,
region removal, replacement and disposal dismiss all panels. Leaf selection restores
focus to the connected permitted target. Permission is rechecked at opening and action.
All panels are viewport-clamped; a submenu flips left when needed.

## Compatibility

A v2 Host accepts v1-shaped flat item arrays. Consumers requiring older Hosts must
provide a flat v1 menu when their factory reports v1. The new export does not change
v1's strict accepted keys or version discriminant.

## Security and conformance

V2 adds presentation structure, not permission or command authority. Existing exact
activation grants remain necessary at every open and leaf selection. String-only
icon keys are resolved by Host without network or plugin-supplied SVG parsing.
Recursive bounds and globally unique IDs prevent unbounded menus and ambiguous
selection. Detached or retired panels cannot emit actions. Applications must test
nested keyboard/pointer navigation, disabled branches, malformed and cyclic trees,
immutable copies, atomic replacement, permission withdrawal and disposal. Type
conformance is in `types/extension-point-interactions.v2.test.ts`; browser rendering
and lifecycle tests belong to the Host implementation and do not establish native
visual acceptance by themselves.
