'use strict'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mimicFn = require('mimic-fn')

module.exports = (inputFunction, options = {}) => {
	if (typeof inputFunction !== 'function') {
		throw new TypeError(`Expected the first argument to be a function, got \`${typeof inputFunction}\``)
	}

	const { wait = 0, maxWait = 0, before = false, after = true } = options

	if (!before && !after) {
		throw new Error("Both `before` and `after` are false, function wouldn't be called.")
	}

	let timeout
	let maxTimeout
	let result

	const debouncedFunction = function (...arguments_) {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const context = this

		const later = () => {
			timeout = undefined

			if (maxTimeout) {
				clearTimeout(maxTimeout)
				maxTimeout = undefined
			}

			if (after) {
				result = inputFunction.apply(context, arguments_)
			}
		}

		const maxLater = () => {
			maxTimeout = undefined

			if (timeout) {
				clearTimeout(timeout)
				timeout = undefined
			}

			result = inputFunction.apply(context, arguments_)
		}

		const shouldCallNow = before && !timeout
		clearTimeout(timeout)
		timeout = setTimeout(later, wait)

		if (maxWait > 0 && !maxTimeout && after) {
			maxTimeout = setTimeout(maxLater, maxWait)
		}

		if (shouldCallNow) {
			result = inputFunction.apply(context, arguments_)
		}

		return result
	}

	mimicFn(debouncedFunction, inputFunction)

	debouncedFunction.cancel = () => {
		if (timeout) {
			clearTimeout(timeout)
			timeout = undefined
		}

		if (maxTimeout) {
			clearTimeout(maxTimeout)
			maxTimeout = undefined
		}
	}

	return debouncedFunction
}
