export interface SupportedApiVersion {
	minVersion: string
	maxVersion: string
}

export const SupportedApiVersions: SupportedApiVersion[] = [
	// Primary group
	{ minVersion: '2.0.0-0', maxVersion: '2.0.0' },
]
