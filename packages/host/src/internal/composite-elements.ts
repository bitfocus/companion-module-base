import { z } from 'zod'
import {
	createModuleLogger,
	type CompanionGraphicsCompositeElementDefinition,
	type CompanionGraphicsCompositeElementDefinitions,
} from '@companion-module/base'
import type { AssertCoversKeys } from '../schema/common.js'
import { elementSchema } from '../schema/elements.js'
import { inputFieldSchema } from '../schema/options.js'
import { BANNED_PROPS } from './util.js'

const logger = createModuleLogger('CompositeElementDefinitionsManager')

const definitionSchema = z.object({
	type: z.literal('composite'),
	name: z.string().min(1),
	sortName: z.string().min(1).optional(),
	description: z.string().optional(),
	options: z.array(inputFieldSchema),
	elements: z.array(elementSchema),
}) satisfies z.ZodType<CompanionGraphicsCompositeElementDefinition>
true satisfies AssertCoversKeys<typeof definitionSchema, CompanionGraphicsCompositeElementDefinition>

export function validateCompositeElementDefinitions(
	definitions: CompanionGraphicsCompositeElementDefinitions<any>,
): void {
	const bannedIds: string[] = []
	const invalidSchema: string[] = []

	for (const [id, defn] of Object.entries(definitions)) {
		if (BANNED_PROPS.has(id)) {
			bannedIds.push(id)
			continue
		}

		if (!defn || typeof defn !== 'object' || !definitionSchema.safeParse(defn).success) {
			invalidSchema.push(id)
		}
	}

	if (bannedIds.length > 0) {
		logger.warn(`The following composite element definitions use a reserved id: ${bannedIds.sort().join(', ')}`)
	}
	if (invalidSchema.length > 0) {
		logger.warn(
			`The following composite element definitions failed to validate against the schema: ${invalidSchema.sort().join(', ')}`,
		)
	}
}
