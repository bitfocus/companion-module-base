import type { CompanionStaticUpgradeScript } from './module-api/upgrade.js'
import type { InstanceBase } from './module-api/base.js'

declare global {
	/**
	 * INTERNAL USE ONLY
	 */
	var COMPANION_ENTRYPOINT_INFO:
		| {
				factory: InstanceConstructor<any, any>
				upgradeScripts: CompanionStaticUpgradeScript<any, any>[]
		  }
		| undefined
}

export type InstanceConstructor<TConfig, TSecrets> = new (internal: unknown) => InstanceBase<TConfig, TSecrets>

/**
 * Setup the module for execution
 * This should be called once per-module, to register the class that should be executed
 * @param factory The class for the module
 * @param upgradeScripts Upgrade scripts
 */
export function runEntrypoint<TConfig, TSecrets>(
	factory: InstanceConstructor<TConfig, TSecrets>,
	upgradeScripts: CompanionStaticUpgradeScript<TConfig, TSecrets>[],
): void {
	if (global.COMPANION_ENTRYPOINT_INFO) throw new Error(`runEntrypoint can only be called once`)

	// Future: In v2.0 of the api, this method should be removed and replaced with the module exporting a default class
	global.COMPANION_ENTRYPOINT_INFO = { factory, upgradeScripts }
}
