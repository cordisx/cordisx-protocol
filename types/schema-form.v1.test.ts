import type { SchemaFormOptionsV1, SchemaFormSnapshotV1 } from './schema-form.v1.js'
const options: SchemaFormOptionsV1 = {
  identity: 'package:one',
  schema: { type: 'object', '~standard': { version: 1, vendor: 'schemastery', validate: value => ({ value }) } },
  value: { size: 15 },
  onChange(snapshot) {
    const valid: boolean = snapshot.valid
    void valid
    // @ts-expect-error Controlled snapshots are read-only.
    snapshot.value.size = 9
  },
}
const error: SchemaFormSnapshotV1 = {
  value: { size: 'invalid' },
  valid: false,
  issues: [{ path: ['size'], message: 'Expected a number' }],
}
options.onChange(error)
// @ts-expect-error Identity scopes the field lifecycle and is required.
const missingIdentity: SchemaFormOptionsV1 = { schema: options.schema, value: {}, onChange() {} }
void missingIdentity
