/* eslint-disable no-process-exit */
import { CompanionStaticUpgradeScript } from './module-api/upgrade'
import { InstanceBase } from './module-api/base'

let hasEntrypoint = false
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let moduleInstance: InstanceBase<any> | undefined

export type InstanceConstructor<TConfig> = new (internal: unknown) => InstanceBase<TConfig>
export type InternalApiGenerator<TConfig> = (
	factory: InstanceConstructor<TConfig>,
	upgradeScripts: CompanionStaticUpgradeScript<TConfig>[]
) => Promise<InstanceBase<TConfig>>

/**
 * Setup the module for execution
 * This should be called once per-module, to register the class that should be executed
 * @param factory The class for the module
 * @param upgradeScripts Upgrade scripts
 */
export function runEntrypoint<TConfig>(
	factory: InstanceConstructor<TConfig>,
	upgradeScripts: CompanionStaticUpgradeScript<TConfig>[]
): void {
	Promise.resolve()
		.then(async () => {
			// Ensure only called once per module
			if (hasEntrypoint) throw new Error(`runEntrypoint can only be called once`)
			hasEntrypoint = true

			const internalApiPath = process.env.MODULE_API_PATH
			if (!internalApiPath) throw new Error('Module initialise is missing MODULE_API_PATH')

			// eslint-disable-next-line node/no-unsupported-features/es-syntax
			const internalApiRaw: InternalApiGenerator<TConfig> = (await import(internalApiPath)).default

			moduleInstance = await internalApiRaw(factory, upgradeScripts)
		})
		.catch((e) => {
			console.error(`Failed to startup module:`)
			console.error(e.stack || e.message)
			process.exit(1)
		})
}
