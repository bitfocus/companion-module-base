import { describe, expect, it } from 'vitest'
import { formatHostPort } from '../util.js'

describe('formatHostPort', () => {
	it.each([
		['192.168.0.1', 80, '192.168.0.1:80'],
		['example.com', 443, 'example.com:443'],
		['::1', 80, '[::1]:80'],
		['fe80::1%eth0', 9000, '[fe80::1%eth0]:9000'],
	])('%s %d', (host, port, expected) => {
		expect(formatHostPort(host, port)).toBe(expected)
	})
})
