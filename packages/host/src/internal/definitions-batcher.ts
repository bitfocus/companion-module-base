export interface DefinitionsBatcherTarget<TDefinition> {
	/** Send the complete set of definitions */
	setAll: (definitions: ReadonlyMap<string, TDefinition>) => void
	/** Send only the changed definitions. When not provided, `setAll` is used instead */
	update: ((changed: ReadonlyMap<string, TDefinition>, removedIds: string[]) => void) | undefined
}

/**
 * Tracks the current set of host definitions of one kind, and batches changes to them
 * so that multiple updates within the same tick are sent to the host as a single message.
 *
 * The current state is always updated synchronously, only the sending is delayed.
 */
export class DefinitionsBatcher<TDefinition> {
	readonly #target: DefinitionsBatcherTarget<TDefinition>

	#definitions = new Map<string, TDefinition>()

	#pendingReplaceAll = false
	readonly #pendingChanges = new Map<string, TDefinition | null>()
	#flushImmediate: NodeJS.Immediate | undefined

	constructor(target: DefinitionsBatcherTarget<TDefinition>) {
		this.#target = target
	}

	get definitions(): ReadonlyMap<string, TDefinition> {
		return this.#definitions
	}

	/** Replace all of the definitions */
	replaceAll(definitions: Map<string, TDefinition>): void {
		this.#definitions = definitions

		this.#pendingReplaceAll = true
		this.#pendingChanges.clear()
		this.#scheduleFlush()
	}

	/** Add or replace a definition */
	set(id: string, definition: TDefinition): void {
		this.#definitions.set(id, definition)

		if (!this.#pendingReplaceAll) this.#pendingChanges.set(id, definition)
		this.#scheduleFlush()
	}

	/** Remove a definition */
	delete(id: string): void {
		if (!this.#definitions.delete(id)) return

		if (!this.#pendingReplaceAll) this.#pendingChanges.set(id, null)
		this.#scheduleFlush()
	}

	/** Send any pending changes to the host immediately */
	flush(): void {
		if (this.#flushImmediate) {
			clearImmediate(this.#flushImmediate)
			this.#flushImmediate = undefined
		}

		if (this.#pendingReplaceAll || !this.#target.update) {
			if (!this.#pendingReplaceAll && this.#pendingChanges.size === 0) return

			this.#pendingReplaceAll = false
			this.#pendingChanges.clear()

			this.#target.setAll(this.#definitions)
		} else {
			if (this.#pendingChanges.size === 0) return

			const changed = new Map<string, TDefinition>()
			const removedIds: string[] = []
			for (const [id, definition] of this.#pendingChanges) {
				if (definition === null) {
					removedIds.push(id)
				} else {
					changed.set(id, definition)
				}
			}
			this.#pendingChanges.clear()

			this.#target.update(changed, removedIds)
		}
	}

	#scheduleFlush(): void {
		if (this.#flushImmediate) return
		this.#flushImmediate = setImmediate(() => {
			this.#flushImmediate = undefined
			this.flush()
		})
	}
}
