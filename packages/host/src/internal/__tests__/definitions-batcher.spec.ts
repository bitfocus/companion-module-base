import { describe, expect, it, vi } from 'vitest'
import { DefinitionsBatcher } from '../definitions-batcher.js'

interface TestDefinition {
	name: string
}

async function nextTick(): Promise<void> {
	return new Promise((resolve) => setImmediate(resolve))
}

function createBatcher(withUpdate: boolean) {
	const setAll = vi.fn((_definitions: ReadonlyMap<string, TestDefinition>) => {})
	const update = vi.fn((_changed: ReadonlyMap<string, TestDefinition>, _removedIds: string[]) => {})

	// Snapshot the maps, as the batcher may reuse them after the call
	const setAllCalls: Record<string, TestDefinition>[] = []
	setAll.mockImplementation((definitions) => {
		setAllCalls.push(Object.fromEntries(definitions))
	})

	const batcher = new DefinitionsBatcher<TestDefinition>({
		setAll,
		update: withUpdate ? update : undefined,
	})

	return { batcher, setAll, setAllCalls, update }
}

describe('DefinitionsBatcher', () => {
	it('updates the state synchronously, and sends on the next tick', async () => {
		const { batcher, setAll, update } = createBatcher(true)

		batcher.set('a', { name: 'A' })
		expect(batcher.definitions.get('a')).toEqual({ name: 'A' })
		expect(update).toHaveBeenCalledTimes(0)

		await nextTick()

		expect(update).toHaveBeenCalledTimes(1)
		expect(update).toHaveBeenCalledWith(new Map([['a', { name: 'A' }]]), [])
		expect(setAll).toHaveBeenCalledTimes(0)
	})

	it('coalesces multiple changes into one update', async () => {
		const { batcher, update } = createBatcher(true)

		batcher.replaceAll(new Map([['old', { name: 'Old' }]]))
		batcher.flush()

		batcher.set('a', { name: 'A' })
		batcher.set('b', { name: 'B' })
		batcher.set('a', { name: 'A2' })
		batcher.delete('old')
		batcher.set('c', { name: 'C' })
		batcher.delete('c')

		await nextTick()

		expect(update).toHaveBeenCalledTimes(1)
		expect(update).toHaveBeenCalledWith(
			new Map([
				['a', { name: 'A2' }],
				['b', { name: 'B' }],
			]),
			['old', 'c'],
		)
	})

	it('ignores deleting an unknown id', async () => {
		const { batcher, setAll, update } = createBatcher(true)

		batcher.delete('missing')

		await nextTick()

		expect(update).toHaveBeenCalledTimes(0)
		expect(setAll).toHaveBeenCalledTimes(0)
	})

	it('sends the full set after a replaceAll, even with later changes', async () => {
		const { batcher, setAllCalls, update } = createBatcher(true)

		batcher.set('a', { name: 'A' })
		batcher.replaceAll(new Map([['b', { name: 'B' }]]))
		batcher.set('c', { name: 'C' })

		await nextTick()

		expect(update).toHaveBeenCalledTimes(0)
		expect(setAllCalls).toEqual([{ b: { name: 'B' }, c: { name: 'C' } }])
	})

	it('falls back to sending the full set when update is not supported', async () => {
		const { batcher, setAllCalls } = createBatcher(false)

		batcher.replaceAll(new Map([['a', { name: 'A' }]]))
		batcher.flush()

		batcher.set('b', { name: 'B' })
		batcher.delete('a')

		await nextTick()

		expect(setAllCalls).toEqual([{ a: { name: 'A' } }, { b: { name: 'B' } }])
	})

	it('flush sends immediately, and does not send again on the next tick', async () => {
		const { batcher, update } = createBatcher(true)

		batcher.set('a', { name: 'A' })
		batcher.flush()
		expect(update).toHaveBeenCalledTimes(1)

		// Nothing pending, so this is a no-op
		batcher.flush()

		await nextTick()

		expect(update).toHaveBeenCalledTimes(1)
	})
})
