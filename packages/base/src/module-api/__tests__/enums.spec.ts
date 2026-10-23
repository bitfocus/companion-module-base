import { isIPv4, isIPv6 } from 'net'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { Regex } from '../enums.js'

function compile(regex: string): RegExp {
	// Matches how the host parses these strings
	const match = /^\/(.*)\/(.*)$/.exec(regex)
	if (!match) throw new Error(`Invalid regex: ${regex}`)
	return new RegExp(match[1], match[2])
}

describe('Regex', () => {
	const sink = vi.fn()
	global.COMPANION_LOGGER = sink

	beforeEach(() => {
		sink.mockClear()
	})

	test('non-deprecated access does not warn', () => {
		expect(Regex.MAC_ADDRESS).toMatch(/^\/.*\/$/)
		expect(Regex.TIMECODE).toBeTruthy()
		expect(Regex.IPV4).toBeTruthy()
		expect(Regex.IPV6).toBeTruthy()
		expect(sink).not.toHaveBeenCalled()
	})

	test('deprecated access warns only once', () => {
		expect(Regex.NUMBER).toBe('/^\\d+$/')
		expect(Regex.NUMBER).toBe('/^\\d+$/')
		expect(sink).toHaveBeenCalledTimes(1)
		expect(sink).toHaveBeenCalledWith(undefined, 'warn', expect.stringContaining('Regex.NUMBER is deprecated'))
	})

	test('SOMETHING suggests minLength', () => {
		expect(Regex.SOMETHING).toBe('/^.+$/')
		expect(sink).toHaveBeenCalledWith(undefined, 'warn', expect.stringContaining('minLength: 1'))
	})

	test('unknown access warns only once', () => {
		const anyRegex = Regex as Record<string, unknown>
		expect(anyRegex.Port).toBeUndefined()
		expect(anyRegex.Port).toBeUndefined()
		expect(sink).toHaveBeenCalledTimes(1)
		expect(sink).toHaveBeenCalledWith(undefined, 'warn', expect.stringContaining('Regex.Port does not exist'))
	})

	describe('IP', () => {
		const re = compile(Regex.IP)

		test.each(['192.168.0.1', '0.0.0.0', '255.255.255.255'])('matches %s', (value) => {
			expect(re.test(value)).toBe(true)
		})

		test.each(['10.0.0.256', '1.2.3', 'localhost', '::1'])('rejects %s', (value) => {
			expect(re.test(value)).toBe(false)
		})
	})

	describe('IPV4', () => {
		const re = compile(Regex.IPV4)

		test.each(['192.168.0.1', '0.0.0.0', '255.255.255.255', '10.0.0.1'])('matches %s', (value) => {
			expect(re.test(value)).toBe(true)
			expect(isIPv4(value)).toBe(true)
		})

		test.each(['10.0.0.256', '1.2.3', '1.2.3.4.5', '01.2.3.4', '192.168.0.1:80', 'localhost', '::1', ' 1.2.3.4', ''])(
			'rejects %j',
			(value) => {
				expect(re.test(value)).toBe(false)
				expect(isIPv4(value)).toBe(false)
			},
		)
	})

	describe('IPV6', () => {
		const re = compile(Regex.IPV6)

		test.each([
			'::',
			'::1',
			'2001:db8::1',
			'2001:0db8:0000:0000:0000:ff00:0042:8329',
			'fe80::1%eth0',
			'::ffff:192.168.0.1',
			'64:ff9b::192.0.2.33',
			'1:2:3:4:5:6:7::',
		])('matches %s', (value) => {
			expect(re.test(value)).toBe(true)
			expect(isIPv6(value)).toBe(true)
		})

		test.each([
			'',
			'[::1]',
			'1::2::3',
			':::',
			'1:2:3:4:5:6:7:8:9',
			'g::1',
			'::ffff:192.168.0.256',
			'192.168.0.1',
			'localhost',
		])('rejects %j', (value) => {
			expect(re.test(value)).toBe(false)
			expect(isIPv6(value)).toBe(false)
		})
	})
})
