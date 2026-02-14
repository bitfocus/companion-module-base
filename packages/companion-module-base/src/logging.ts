declare global {
	/**
	 * INTERNAL USE ONLY
	 */
	var COMPANION_LOGGER: LoggingSink | undefined
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface ModuleLogger {
	debug: (message: string) => void
	info: (message: string) => void
	warn: (message: string) => void
	error: (message: string) => void
}

export type LoggingSink = (source: string | undefined, level: LogLevel, message: string) => void

const defaultLoggingSink: LoggingSink = (source, level, message) => {
	// Default logging implementation for unit testing purposes, this should be replaced by the host application
	console.log(`[${level.toUpperCase()}]${source ? ` [${source}]` : ''} ${message}`)
}

function logToSink(source: string | undefined, level: LogLevel, message: string) {
	const sink = typeof global.COMPANION_LOGGER === 'function' ? global.COMPANION_LOGGER : defaultLoggingSink
	sink(source, level, message)
}

/**
 * Create a logger instance
 * @param source The source path to use for the logger
 * @returns A logger instance
 */
export function createModuleLogger(source?: string): ModuleLogger {
	return {
		debug: (message: string) => logToSink(source, 'debug', message),
		info: (message: string) => logToSink(source, 'info', message),
		warn: (message: string) => logToSink(source, 'warn', message),
		error: (message: string) => logToSink(source, 'error', message),
	}
}
