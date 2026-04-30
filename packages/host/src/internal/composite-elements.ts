import { createModuleLogger, type CompanionGraphicsCompositeElementDefinitions } from '@companion-module/base'
import { BANNED_PROPS, hasInvalidElementType } from './util.js'

const logger = createModuleLogger('CompositeElementDefinitionsManager')

export function validateCompositeElementDefinitions(
	definitions: CompanionGraphicsCompositeElementDefinitions<any>,
): void {
	const invalidEntries: string[] = []
	const bannedIds: string[] = []
	const invalidIds: string[] = []
	const invalidOptions: string[] = []
	const invalidElements: string[] = []
	const invalidElementTypes: string[] = []

	for (const [id, defn] of Object.entries(definitions)) {
		if (!defn || typeof defn !== 'object') {
			invalidEntries.push(id)
			continue
		}

		if (BANNED_PROPS.has(id)) {
			bannedIds.push(id)
			continue
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
