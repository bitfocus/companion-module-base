import { createModuleLogger } from '../logging.js'

/**
 * All the possible status levels that an instance can use.
 * Note: When adding more, companion needs to be updated to know how they should be displayed
 */
export enum InstanceStatus {
	Ok = 'ok',
	Connecting = 'connecting',
	Disconnected = 'disconnected',
	ConnectionFailure = 'connection_failure',
	BadConfig = 'bad_config',
	UnknownError = 'unknown_error',
	UnknownWarning = 'unknown_warning',
	AuthenticationFailure = 'authentication_failure',
	InsufficientPermissions = 'insufficient_permissions',
}

const RegexValues = {
	/**
	 * @deprecated Use `IPV4` instead, or preferably a `textinput` field without a regex so that hostnames and IPv6 addresses can be entered
	 */
	IP: '/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/',
	/**
	 * Matches an IPv4 address, e.g. `192.168.0.1`.
	 * Only use this if the device requires an IPv4 address, otherwise allow any text so that hostnames can be entered
	 */
	IPV4: '/^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])$/',
	/**
	 * Matches an IPv6 address, e.g. `2001:db8::1` or `fe80::1%eth0`. Square brackets are not accepted.
	 * Only use this if the device requires an IPv6 address, otherwise allow any text so that hostnames can be entered
	 */
	IPV6: '/^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(:[0-9a-fA-F]{1,4}){1,6}|:((:[0-9a-fA-F]{1,4}){1,7}|:)|([0-9a-fA-F]{1,4}:){6}((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])|::([0-9a-fA-F]{1,4}:){0,5}((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])|([0-9a-fA-F]{1,4}:){1}:([0-9a-fA-F]{1,4}:){0,4}((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])|([0-9a-fA-F]{1,4}:){2}:([0-9a-fA-F]{1,4}:){0,3}((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])|([0-9a-fA-F]{1,4}:){3}:([0-9a-fA-F]{1,4}:){0,2}((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])|([0-9a-fA-F]{1,4}:){4}:([0-9a-fA-F]{1,4}:){0,1}((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])|([0-9a-fA-F]{1,4}:){5}:((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9]))(%[0-9a-zA-Z._-]+)?$/',
	/** @deprecated Use a `textinput` field without a regex instead, with `minLength: 1` if a value is required */
	HOSTNAME:
		'/^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/',
	/** @deprecated Use a `checkbox` input field instead */
	BOOLEAN: '/^(true|false|0|1)$/i',
	/** @deprecated Use a `number` input field with `min: 1` and `max: 65535` instead */
	PORT: '/^([1-9]|[1-8][0-9]|9[0-9]|[1-8][0-9]{2}|9[0-8][0-9]|99[0-9]|[1-8][0-9]{3}|9[0-8][0-9]{2}|99[0-8][0-9]|999[0-9]|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-4])$/',
	MAC_ADDRESS: '/^(?:[a-fA-F0-9]{2}:){5}([a-fA-F0-9]{2})$/',
	/** @deprecated Use a `number` input field with `min: 0` and `max: 100` instead */
	PERCENT: '/^(100|[0-9]|[0-9][0-9])$/',
	/** @deprecated Use a `number` input field instead */
	FLOAT: '/^([0-9]*\\.)?[0-9]+$/',
	/** @deprecated Use a `number` input field instead */
	SIGNED_FLOAT: '/^[+-]?([0-9]*\\.)?[0-9]+$/',
	/** @deprecated Use a `number` input field instead */
	FLOAT_OR_INT: '/^([0-9]+)(\\.[0-9]+)?$/',
	/** @deprecated Use a `number` input field instead */
	NUMBER: '/^\\d+$/',
	/** @deprecated Use a `number` input field instead */
	SIGNED_NUMBER: '/^[+-]?\\d+$/',
	/** @deprecated Use `minLength: 1` on the `textinput` field instead */
	SOMETHING: '/^.+$/',
	TIMECODE: '/^(0*[0-9]|1[0-9]|2[0-4]):(0*[0-9]|[1-5][0-9]|60):(0*[0-9]|[1-5][0-9]|60):(0*[0-9]|[12][0-9]|30)$/',
} as const

const deprecatedRegexKeys: ReadonlyMap<string, string> = new Map([
	['IP', 'Use IPV4 instead, or preferably allow any text so that hostnames and IPv6 addresses can be entered'],
	['HOSTNAME', 'Allow any text instead, as hostnames can take many forms'],
	['PORT', 'Use a number input field with min: 1 and max: 65535 instead'],
	['PERCENT', 'Use a number input field instead'],
	['FLOAT', 'Use a number input field instead'],
	['SIGNED_FLOAT', 'Use a number input field instead'],
	['FLOAT_OR_INT', 'Use a number input field instead'],
	['NUMBER', 'Use a number input field instead'],
	['SIGNED_NUMBER', 'Use a number input field instead'],
	['BOOLEAN', 'Use a checkbox input field instead'],
	['SOMETHING', 'Use minLength: 1 on the textinput field instead'],
])
const warnedRegexKeys = new Set<string>()

function warnRegexOnce(key: string, message: string): void {
	if (warnedRegexKeys.has(key)) return
	warnedRegexKeys.add(key)
	createModuleLogger().warn(message)
}

/**
 * Some common regex patterns, for use in the `regex` property of `textinput` fields
 */
export const Regex: typeof RegexValues = new Proxy(RegexValues, {
	get(target, prop, receiver) {
		if (typeof prop === 'string') {
			if (!Reflect.has(target, prop)) {
				warnRegexOnce(prop, `Regex.${prop} does not exist, so is undefined. This is a bug in the module`)
			} else {
				const replacement = deprecatedRegexKeys.get(prop)
				if (replacement) warnRegexOnce(prop, `Regex.${prop} is deprecated. ${replacement}`)
			}
		}
		return Reflect.get(target, prop, receiver)
	},
})
