import type { UsageV1 } from './usage.v1.js'
import type { PluginRuntimeManifestV11 } from './plugin-manifest.v11.js'
declare const usage: UsageV1
const snapshot = await usage.read()
if (snapshot.status === 'ready') {
  const tokens: number = snapshot.eligibleTokens
  void tokens
} else {
  // @ts-expect-error unavailable usage cannot fabricate a zero aggregate
  snapshot.eligibleTokens
}
const release = usage.subscribe(() => {})
release()
const capability: PluginRuntimeManifestV11['capabilities'][number] = {
  name: 'usage.read',
  required: false,
  scope: { profile: 'current' },
}
void capability
// @ts-expect-error callers cannot select another profile
usage.read({ profile: 'other' })
