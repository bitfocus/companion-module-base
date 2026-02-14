import type { LoggingSink } from '@companion-module/base'

export function registerLoggingSink(sink: LoggingSink): void {
	global.COMPANION_LOGGER = sink
}
