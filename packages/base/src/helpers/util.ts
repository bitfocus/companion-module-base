import { isIPv6 } from 'net'

/**
 * Format a host and port for display, wrapping IPv6 addresses in brackets
 */
export function formatHostPort(host: string, port: number): string {
	return isIPv6(host) ? `[${host}]:${port}` : `${host}:${port}`
}
