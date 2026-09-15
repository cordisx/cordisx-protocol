export type CordisXManagerOpenResult = 'opened' | 'unavailable'

/**
 * Opens the calling plugin's own actionable configuration in the Host Manager.
 * The Host derives and revalidates the caller; no owner or route is accepted.
 */
export interface CordisXManagerService {
  openOwnPluginConfiguration(): Promise<CordisXManagerOpenResult>
}
