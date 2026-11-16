import type { ChannelManagerV11 } from './channel-manager.v11.js'
import type { ChannelManagerV12 } from './channel-manager.v12.js'
import type { ChannelTaskConfigV1 } from './channel-task-settings.v1.js'
declare const manager: ChannelManagerV12
const prior: ChannelManagerV11 = manager
void prior
const config: ChannelTaskConfigV1 = {
  defaults: { providerId: 'example', model: 'm', effort: 'high' },
  scopes: [{ id: 'group', conversationId: 'group', userIds: ['alice'], settings: { effort: 'medium' } }],
  permissions: [{
    id: 'owner',
    effect: 'allow',
    userGroupIds: ['owners'],
    fields: ['model'],
    models: [{ providerId: 'example', model: 'm' }],
  }],
}
void config
