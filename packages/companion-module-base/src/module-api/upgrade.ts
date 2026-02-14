import type { CompanionFeedbackButtonStyleResult } from './feedback.js'
import type { ExpressionOrValue } from './input.js'
import type { JsonObject, JsonValue } from '../common/json-value.js'

/** Additional utilities for Upgrade Scripts */
export interface CompanionUpgradeContext<TConfig extends JsonObject> {
	/**
	 * Current configuration of the module.
	 * This cannot be changed
	 */
	readonly currentConfig: Readonly<TConfig>
}

/**
 * The items for an upgrade script to upgrade
 */
export interface CompanionStaticUpgradeProps<TConfig extends JsonObject, TSecrets extends JsonObject | undefined> {
	/**
	 * The connection config to upgrade, if any
	 */
	config: TConfig | null
	/**
	 * The connection secrets to upgrade, if any
	 */
	secrets: TSecrets | null
	/**
	 * The actions to upgrade
	 */
	actions: CompanionMigrationAction[]
	/**
	 * The feedbacks to upgrade
	 */
	feedbacks: CompanionMigrationFeedback[]
}

/**
 * The result of an upgrade script
 */
export interface CompanionStaticUpgradeResult<TConfig extends JsonObject, TSecrets extends JsonObject | undefined> {
	/**
	 * The updated config, if any changes were made
	 */
	updatedConfig: TConfig | null
	/**
	 * The updated secrets, if any changes were made
	 */
	updatedSecrets?: TSecrets | null
	/**
	 * Any changed actions
	 */
	updatedActions: CompanionMigrationAction[]
	/**
	 * Any changed feedbacks
	 */
	updatedFeedbacks: CompanionMigrationFeedback[]
}

/**
 * The definition of an upgrade script function
 */
export type CompanionStaticUpgradeScript<
	TConfig extends JsonObject,
	TSecrets extends JsonObject | undefined = undefined,
> = (
	context: CompanionUpgradeContext<TConfig>,
	props: CompanionStaticUpgradeProps<TConfig, TSecrets>,
) => CompanionStaticUpgradeResult<TConfig, TSecrets>

export type CompanionMigrationOptionValues = {
	[key: string]: ExpressionOrValue<JsonValue | undefined> | undefined
}

/**
 * An action that could be upgraded
 */
export interface CompanionMigrationAction {
	/** The unique id for this action */
	readonly id: string
	/** The unique id for the location of this action */
	readonly controlId: string

	/** The id of the action definition */
	actionId: string
	/** The user selected options for the action */
	options: CompanionMigrationOptionValues
}

/**
 * A feedback that could be upgraded
 */
export interface CompanionMigrationFeedback {
	/** The unique id for this feedback */
	readonly id: string
	/** The unique id for the location of this feedback */
	readonly controlId: string

	/** The id of the feedback definition */
	feedbackId: string
	/** The user selected options for the feedback */
	options: CompanionMigrationOptionValues

	/**
	 * If the feedback is being converted to a boolean feedback, the style can be set here.
	 * If it is already a boolean feedback or is a different type of feedback, this will be ignored.
	 */
	style?: Partial<CompanionFeedbackButtonStyleResult>

	/**
	 * Only valid for a boolean feedback.
	 * True if this feedback has been inverted inside Companion, you do not have access to this when the feedback is executed.
	 */
	isInverted?: ExpressionOrValue<boolean>
}

/**
 * A helper upgrade script, which does nothing.
 * Useful to replace a script which is no longer needed
 */
export const EmptyUpgradeScript: CompanionStaticUpgradeScript<any> = () => ({
	updatedConfig: null,
	updatedSecrets: null,
	updatedActions: [],
	updatedFeedbacks: [],
})

/**
 * Definition of how to convert options to style properties for boolean feedbacks
 */
export interface CompanionUpgradeToBooleanFeedbackMap {
	[feedback_id: string]:
		| true
		| {
				// Option name to style property
				[option_key: string]: 'text' | 'size' | 'color' | 'bgcolor' | 'alignment' | 'pngalignment' | 'png64'
		  }
		| undefined
}

/**
 * A helper script to automate the bulk of the process to upgrade feedbacks from 'advanced' to 'boolean'.
 * There are some built-in rules for properties names based on the most common cases.
 * @param upgradeMap The feedbacks to upgrade and the properties to convert
 */
export function CreateConvertToBooleanFeedbackUpgradeScript<TConfig extends JsonObject = JsonObject>(
	upgradeMap: CompanionUpgradeToBooleanFeedbackMap,
): CompanionStaticUpgradeScript<TConfig, any> {
	// Warning: the unused parameters will often be null
	return (_context, props) => {
		const changedFeedbacks: CompanionStaticUpgradeResult<any, any>['updatedFeedbacks'] = []

		for (const feedback of props.feedbacks) {
			let upgrade_rules = upgradeMap[feedback.feedbackId]
			if (upgrade_rules === true) {
				// These are some automated built in rules. They can help make it easier to migrate
				upgrade_rules = {
					bg: 'bgcolor',
					bgcolor: 'bgcolor',
					fg: 'color',
					color: 'color',
					png64: 'png64',
					png: 'png64',
				}
			}

			if (upgrade_rules) {
				if (!feedback.style) feedback.style = {}

				for (const [option_key, style_key] of Object.entries(upgrade_rules)) {
					const rawVal = feedback.options[option_key]
					if (rawVal !== undefined) {
						feedback.style[style_key] = rawVal as any
						delete feedback.options[option_key]

						changedFeedbacks.push(feedback)
					}
				}
			}
		}

		return {
			updatedConfig: null,
			updatedSecrets: null,
			updatedActions: [],
			updatedFeedbacks: changedFeedbacks,
		}
	}
}

/**
 * A helper script to automate the bulk of the process to upgrade feedbacks from having a module defined 'invert' field, to use the builtin one.
 * The feedback definitions must be updated manually, this can only help update existing usages of the feedback.
 * @param upgradeMap The feedbacks to upgrade and the id of the option to convert
 */
export function CreateUseBuiltinInvertForFeedbacksUpgradeScript<TConfig extends JsonObject = JsonObject>(
	upgradeMap: Record<string, string>,
): CompanionStaticUpgradeScript<TConfig> {
	// Warning: the unused parameters will often be null
	return (_context, props) => {
		const changedFeedbacks: CompanionStaticUpgradeResult<TConfig, undefined>['updatedFeedbacks'] = []

		for (const feedback of props.feedbacks) {
			const propertyName = upgradeMap[feedback.feedbackId]
			if (typeof propertyName !== 'string') continue

			// Retrieve and delete the old value
			const rawValue = feedback.options[propertyName]
			if (rawValue === undefined) continue
			delete feedback.options[propertyName]

			// Interpret it to a boolean, it could be stored in a few ways
			if (!rawValue.isExpression) {
				feedback.isInverted = {
					isExpression: false,
					value: rawValue.value === 'true' || Boolean(rawValue.value) === true || Number(rawValue.value) > 0,
				}
			} else {
				// We can't fix this case for them
				feedback.isInverted = rawValue
			}

			changedFeedbacks.push(feedback)
		}

		return {
			updatedConfig: null,
			updatedSecrets: null,
			updatedActions: [],
			updatedFeedbacks: changedFeedbacks,
		}
	}
}

/**
 * Helper to fix up values which could be a number or a string of variables into the new expression format
 * This has some logic to try to preserve the existing behaviour as much as possible, while also keeping the output user friendly
 * @param value The value to fix up
 * @returns The fixed up value, or the original value if it did not need to be changed
 */
export function FixupNumericOrVariablesValueToExpressions(
	value: ExpressionOrValue<JsonValue | undefined> | undefined,
): ExpressionOrValue<JsonValue | undefined> | undefined {
	// Nothing to do if already an expression!
	if (!value || value.isExpression) return value

	const oldValNum = Number(value.value)
	const oldValRaw = value.value
	if (
		typeof value.value === 'number' ||
		(typeof value.value === 'string' && value.value.trim() !== '' && !isNaN(oldValNum))
	) {
		// It looks like a plain number, so store it as one
		return {
			isExpression: false,
			value: oldValNum,
		}
	} else if (typeof oldValRaw === 'string') {
		const trimmedStr = oldValRaw.trim()
		// Crudely check if it looks like a simple variable
		if (trimmedStr.startsWith('$(') && trimmedStr.endsWith(')') && !trimmedStr.slice(2).includes('$(')) {
			// It does, so we can treat that as a plain expression!
			return {
				isExpression: true,
				value: oldValRaw,
			}
		} else {
			// Otherwise its something more complex, so wrap it in a parseVariables and hope for the best!
			return {
				isExpression: true,
				value: `parseVariables("${oldValRaw.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`,
			}
		}
	} else {
		// Its not a string, or anything vaguely sane..
		// Nothing really we can do
		return value
	}
}
