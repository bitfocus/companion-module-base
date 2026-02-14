import { vi } from 'vitest'

const orgSetTimeout = setTimeout
export async function runAllTimers(): Promise<void> {
	// Run all timers, and wait, multiple times.
	// This is to allow timers AND internal promises to resolve in inner functions
	for (let i = 0; i < 50; i++) {
		vi.runOnlyPendingTimers()
		await new Promise((resolve) => orgSetTimeout(resolve, 0))
	}
}

export async function runTimersUntilNow(): Promise<void> {
	// Run all timers, and wait, multiple times.
	// This is to allow timers AND internal promises to resolve in inner functions
	for (let i = 0; i < 50; i++) {
		vi.advanceTimersByTime(0)
		await new Promise((resolve) => orgSetTimeout(resolve, 0))
	}
}
