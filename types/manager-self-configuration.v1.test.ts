import type { CordisXManagerOpenResult, CordisXManagerService } from './manager-self-configuration.v1.js'

declare const manager: CordisXManagerService

const result: Promise<CordisXManagerOpenResult> = manager.openOwnPluginConfiguration()
void result

// @ts-expect-error the Host derives the calling plugin; no foreign owner is accepted
manager.openOwnPluginConfiguration('foreign')
// @ts-expect-error the capability does not expose general Manager navigation
manager.openPluginConfiguration('foreign')
