import { createModuleLogger, type CompanionGraphicsCompositeElementDefinition } from '@companion-module/base'
import { BANNED_PROPS, hasInvalidElementType } from './util.js'

const logger = createModuleLogger('CompositeElementDefinitionsManager')

export function validateCompositeElementDefinitions(definitions: CompanionGraphicsCompositeElementDefinition[]): void {
	const seenIds = new Set<string>()
	const invalidEntries: number[] = []
	const bannedIds: string[] = []
	const invalidIds: string[] = []
	const duplicateIds: string[] = []
	const invalidOptions: string[] = []
	const invalidElements: string[] = []
	const invalidElementTypes: string[] = []

	for (let i = 0; i < definitions.length; i++) {
		const defn = definitions[i]

		if (!defn || typeof defn !== 'object') {
			invalidEntries.push(i)
			continue
		}

		const { id } = defn

		if (BANNED_PROPS.has(id)) {
			bannedIds.push(id)
			continue
		}
		if (typeof id !== 'string' || id.length === 0) {
			invalidIds.push(`index ${i}`)
			continue
		}

		if (seenIds.has(id)) {
			duplicateIds.push(id)
		} else {
			seenIds.add(id)
		}

		if (!Array.isArray(defn.options)) {
			invalidOptions.push(id)
		}

		if (!Array.isArray(defn.elements)) {
			invalidElements.push(id)
		} else if (hasInvalidElementType(defn.elements)) {
			invalidElementTypes.push(id)
		}
	}

	if (invalidEntries.length > 0) {
		logger.warn(`${invalidEntries.length} composite element definition(s) are not valid objects and were skipped`)
	}
	if (bannedIds.length > 0) {
		logger.warn(`The following composite element definitions use a reserved id: ${bannedIds.sort().join(', ')}`)
	}
	if (invalidIds.length > 0) {
		logger.warn(`The following composite element definitions have an invalid id: ${invalidIds.join(', ')}`)
	}
	if (duplicateIds.length > 0) {
		logger.warn(`The following composite element ids are duplicated: ${duplicateIds.sort().join(', ')}`)
	}
	if (invalidOptions.length > 0) {
		logger.warn(
			`The following composite element definitions have invalid options (expected an array): ${invalidOptions.sort().join(', ')}`,
		)
	}
	if (invalidElements.length > 0) {
		logger.warn(
			`The following composite element definitions have invalid elements (expected an array): ${invalidElements.sort().join(', ')}`,
		)
	}
	if (invalidElementTypes.length > 0) {
		logger.warn(
			`The following composite element definitions contain elements with unrecognised types: ${invalidElementTypes.sort().join(', ')}`,
		)
	}
}
