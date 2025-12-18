export interface ModuleHostContext<TConfig, TSecrets> {
	// readonly lockingGraphics: LockingGraphicsGenerator
	// readonly cardsGenerator: HostCardGenerator

	// readonly capabilities: HostCapabilities

	// readonly surfaceEvents: HostSurfaceEvents

	// readonly shouldOpenDiscoveredSurface: (info: CheckDeviceResult) => Promise<boolean>
	// readonly notifyOpenedDiscoveredSurface: (info: OpenDeviceResult) => Promise<void>

	// readonly connectionsFound: (connectionInfos: DiscoveredRemoteSurfaceInfo[]) => void
	// readonly connectionsForgotten: (connectionIds: string[]) => void

	saveConfig(newConfig: TConfig | undefined, newSecrets: TSecrets | undefined): void
}
