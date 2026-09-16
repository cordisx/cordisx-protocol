import type { Context } from '@deepseek-ai/cordis'
import type { ModelProviderSelectorEntryV1, ModelProvidersV1 } from './model-providers.v1.js'

declare const ctx: Context
const providers: ModelProvidersV1 = ctx.modelProviders
const entry: ModelProviderSelectorEntryV1 = {
  id: 'setup',
  label: 'Service',
  icon: 'host:key',
  action: {
    label: 'API key',
    icon: 'host:key',
    run: async signal => {
      signal.throwIfAborted()
    },
  },
}
providers.insert(entry).dispose()
providers.present({
  providerId: 'service',
  title: 'Service',
  icon: 'host:key',
  models: [{ id: 'model', label: 'Model', aliases: ['portable'], group: 'service' }],
}).dispose()
providers.list().forEach(provider => provider.models.forEach(model => String(model.id)))
// @ts-expect-error The renderer never supplies endpoints or secrets.
providers.register({ endpoint: 'https://example.test', apiKey: 'secret' })
