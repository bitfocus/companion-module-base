export interface InstanceBaseShared<TConfig, TSecrets = undefined> {
	/**
	 * Main initialization function called
	 * once the module is OK to start doing things.
	 */
	init(config: TConfig, isFirstInit: boolean, secrets: TSecrets): void | Promise<void>

	/**
	 * Clean up the instance before it is destroyed.
	 */
	destroy(): void | Promise<void>
}
