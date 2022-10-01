import PTimeout from 'p-timeout'
import { HostApiNodeJsIpc, HostToModuleEventsInit, ModuleToHostEventsInit } from './host-api/versions.js'
import fs from 'fs/promises'
import { ModuleManifest } from './manifest.js'
import { CompanionStaticUpgradeScript } from './module-api/upgrade.js'
import { InstanceBase } from './module-api/base.js'
import { literal } from './util.js'
import { InstanceBaseProps } from './internal/base.js'
import { init, configureScope } from '@sentry/node'
import '@sentry/tracing'
import { IpcWrapper } from './host-api/ipc-wrapper.js'

let hasEntrypoint = false

export type InstanceConstructor<TConfig> = new (internal: unknown) => InstanceBase<TConfig>

// async function readFileUrl(url: URL): Promise<string> {
// 	// Hack to make json files be loadable after being inlined by webpack
// 	const prefix = 'application/json;base64,'
// 	if (url.pathname.startsWith(prefix)) {
// 		const base64 = url.pathname.substring(prefix.length)
// 		return Buffer.from(base64, 'base64').toString()
// 	}

// 	// Fallback to reading from disk
// 	const buf = await fs.readFile(url)
// 	return buf.toString()
// }

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
	Promise.resolve().then(async () => {
		try {
			// const pkgJsonStr = (await fs.readFile(path.join(__dirname, '../package.json'))).toString()
			// const pkgJson = JSON.parse(pkgJsonStr)
			// if (!pkgJson || pkgJson.name !== '@companion-module/base')
			// 	throw new Error('Failed to find the package.json for @companion-module/base')
			// if (!pkgJson.version) throw new Error('Missing version field in the package.json for @companion-module/base')

			// Ensure only called once per module
			if (hasEntrypoint) throw new Error(`runEntrypoint can only be called once`)
			hasEntrypoint = true

			const manifestPath = process.env.MODULE_MANIFEST
			if (!manifestPath) throw new Error('Module initialise is missing MODULE_MANIFEST')

			// check manifest api field against apiVersion
			const manifestBlob = await fs.readFile(manifestPath)
			const manifestJson: Partial<ModuleManifest> = JSON.parse(manifestBlob.toString())

			if (manifestJson.runtime?.api !== HostApiNodeJsIpc) throw new Error(`Module manifest 'api' mismatch`)
			if (!manifestJson.runtime.apiVersion) throw new Error(`Module manifest 'apiVersion' missing`)
			const apiVersion = manifestJson.runtime.apiVersion

			if (!process.send) throw new Error('Module is not being run with ipc')

			console.log(`Starting up module class: ${factory.name}`)

			const connectionId = process.env.CONNECTION_ID
			if (typeof connectionId !== 'string' || !connectionId)
				throw new Error('Module initialise is missing CONNECTION_ID')

			const verificationToken = process.env.VERIFICATION_TOKEN
			if (typeof verificationToken !== 'string' || !verificationToken)
				throw new Error('Module initialise is missing VERIFICATION_TOKEN')

			// Allow the DSN to be provided as an env variable
			const sentryDsn = process.env.SENTRY_DSN
			const sentryUserId = process.env.SENTRY_USERID
			const sentryCompanionVersion = process.env.SENTRY_COMPANION_VERSION
			if (sentryDsn && sentryUserId && sentryDsn.substring(0, 8) == 'https://') {
				console.log('Sentry enabled')

				init({
					dsn: sentryDsn,
					release: `${manifestJson.name}@${manifestJson.version}`,
					beforeSend(event) {
						if (event.exception) {
							console.log('sentry', 'error', event.exception)
						}
						return event
					},
				})

				configureScope((scope) => {
					scope.setUser({ id: sentryUserId })
					scope.setTag('companion', sentryCompanionVersion)
				})
			} else {
				console.log('Sentry disabled')
			}

			let module: InstanceBase<any> | undefined

			const ipcWrapper = new IpcWrapper<ModuleToHostEventsInit, HostToModuleEventsInit>(
				{},
				(msg) => {
					process.send!(msg)
				},
				5000
			)
			const receiveCallback = (msg: any) => {
				ipcWrapper.receivedMessage(msg)
			}
			process.on('message', receiveCallback)

			ipcWrapper
				.sendWithCb('register', { apiVersion, connectionId, verificationToken })
				.then(
					() => {
						process.off('message', receiveCallback)

						console.log(`Module-host accepted registration`)

						module = new factory(
							literal<InstanceBaseProps<TConfig>>({
								id: connectionId,
								upgradeScripts,
								_isInstanceBaseProps: true,
							})
						)
					},
					(err) => {
						console.error('Module registration failed')

						// Kill the process
						process.exit(11)
					}
				)
				.finally(() => {
					process.off('message', receiveCallback)
				})

			// socket.on('disconnect', async () => {
			// 	console.log(`Disconnected from module-host: ${socket.id}`)

			// 	if (module) {
			// 		// Try and de-init the module before killing it
			// 		try {
			// 			const p = module.destroy()
			// 			if (p) await PTimeout(p, 5000)
			// 		} catch (e) {
			// 			// Ignore
			// 		}
			// 	}

			// 	// Kill the process
			// 	process.exit(11)
			// })
		} catch (e: any) {
			console.error(`Failed to startup module:`)
			console.error(e.stack || e.message)
			process.exit(1)
		}
	})
}
