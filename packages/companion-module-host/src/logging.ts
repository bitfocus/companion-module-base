import type { LoggingSink } from '@companion-module/base'

export function registerLoggingSink(sink: LoggingSink): void {
	global.SURFACE_LOGGER = sink
}
