import type {
	CompanionMigrationAction,
	CompanionMigrationFeedback,
	CompanionStaticUpgradeScript,
} from '../module-api/upgrade.js'
import type {
	UpgradeActionInstance,
	UpgradeFeedbackInstance,
	UpgradeActionAndFeedbackInstancesResponse,
} from '../host-api/api.js'
import { Complete, literal } from '../util.js'

function clone<T>(val: T): T {
	return JSON.parse(JSON.stringify(val))
}

/**
 * Run through the upgrade scripts for the given data
 * Note: this updates the inputs in place, but the result needs to be sent back to companion
 * @param allActions Actions that may need upgrading
 * @param allFeedbacks Feedbacks that may need upgrading
 * @param defaultUpgradeIndex The lastUpgradeIndex of the connection, if known
 * @param upgradeScripts The scripts that may be run
 * @param config The current config of the module
 * @returns The upgraded data that needs persisting
 */
export function runThroughUpgradeScripts(
	allActionsArray: UpgradeActionInstance[],
	allFeedbacksArray: UpgradeFeedbackInstance[],
	upgradeScripts: CompanionStaticUpgradeScript<any>[],
	config: unknown,
): UpgradeActionAndFeedbackInstancesResponse {
	// First we group all the actions and feedbacks by the version they currently are.
	const pendingUpgradesGrouped = new Map<number, { feedbacks: string[]; actions: string[] }>()
	const getPendingUpgradeGroup = (i: number) => {
		let v = pendingUpgradesGrouped.get(i)
		if (!v) {
			v = { actions: [], feedbacks: [] }
			pendingUpgradesGrouped.set(i, v)
		}
		return v
	}
	for (const action of allActionsArray) {
		const upgradeIndex = action?.upgradeIndex
		if (action && typeof upgradeIndex === 'number') {
			const pending = getPendingUpgradeGroup(upgradeIndex)
			pending.actions.push(action.id)
		}
	}
	for (const feedback of allFeedbacksArray) {
		const upgradeIndex = feedback?.upgradeIndex
		if (feedback && typeof upgradeIndex === 'number') {
			const pending = getPendingUpgradeGroup(upgradeIndex)
			pending.feedbacks.push(feedback.id)
		}
	}

	const allActions = Object.fromEntries(allActionsArray.map((a) => [a.id, a]))
	const allFeedbacks = Object.fromEntries(allFeedbacksArray.map((a) => [a.id, a]))

	const updatedFeedbacks: Record<string, UpgradeFeedbackInstance> = {}
	const updatedActions: Record<string, UpgradeActionInstance> = {}

	if (pendingUpgradesGrouped.size > 0) {
		// Figure out which script to run first. Note: we track the last index we ran, so it is offset by one
		const pendingUpgradeGroups = Array.from(pendingUpgradesGrouped.keys()).sort()
		const firstUpgradeGroup = Math.min(...pendingUpgradeGroups, -1) + 1

		// Start building arrays of the ids which we are upgrading as we go
		const actionsIdsToUpgrade: string[] = []
		const feedbackIdsToUpgrade: string[] = []

		// Perform the upgrades. We start on the first batch/instance, and work our way up to the last
		const targetCount = upgradeScripts.length
		for (let i = firstUpgradeGroup; i < targetCount; i++) {
			const group = pendingUpgradesGrouped.get(i - 1)
			if (group) {
				// Update the list of objects that need upgrading
				actionsIdsToUpgrade.push(...group.actions)
				feedbackIdsToUpgrade.push(...group.feedbacks)
			}

			// Ensure there is something to upgrade
			if (actionsIdsToUpgrade.length === 0 && feedbackIdsToUpgrade.length === 0) continue

			// We have an upgrade script that can be run
			const fcn = upgradeScripts[i]
			const res = fcn(
				{
					// Pass a clone to avoid mutations
					currentConfig: clone(config) as any,
				},
				{
					config: null,

					// Only pass the actions & feedbacks which need upgrading from this version
					actions: actionsIdsToUpgrade
						.map((id) => {
							const inst = allActions[id]
							if (inst) {
								return literal<Complete<CompanionMigrationAction>>({
									id: inst.id,
									controlId: inst.controlId,

									actionId: inst.actionId,
									options: inst.options !== undefined ? clone(inst.options) : {},
								})
							}
						})
						.filter((v): v is UpgradeActionInstance => !!v),

					feedbacks: feedbackIdsToUpgrade
						.map((id) => {
							const inst = allFeedbacks[id]
							if (inst) {
								return literal<Complete<Omit<CompanionMigrationFeedback, 'style'>>>({
									id: inst.id,
									controlId: inst.controlId,

									feedbackId: inst.feedbackId,
									options: inst.options !== undefined ? clone(inst.options) : {},
									// TODO - style?

									isInverted: inst.isInverted,
								})
							}
						})
						.filter((v): v is UpgradeFeedbackInstance => !!v),
				},
			)

			for (const action of res.updatedActions) {
				if (action) {
					const instance = allActions[action.id]
					if (instance) {
						instance.actionId = action.actionId
						instance.options = action.options

						// Mark it as changed
						updatedActions[action.id] = instance
					}
				}
			}

			for (const feedback of res.updatedFeedbacks) {
				if (feedback) {
					const instance = allFeedbacks[feedback.id]
					if (instance) {
						instance.feedbackId = feedback.feedbackId
						instance.options = feedback.options

						// Mark it as changed
						updatedFeedbacks[feedback.id] = {
							...instance,
							style: updatedFeedbacks[feedback.id]?.style ?? feedback.style,

							isInverted: feedback.isInverted ?? false,
						}
					}
				}
			}
		}

		// Make sure that everything with a upgradeIndex set is sent back
		for (const [id, action] of Object.entries(allActions)) {
			if (!updatedActions[id] && typeof action?.upgradeIndex === 'number') {
				// Send it back to acknowledge that it has been 'upgraded'
				updatedActions[id] = action
			}
		}
		for (const [id, feedback] of Object.entries(allFeedbacks)) {
			if (!updatedFeedbacks[id] && typeof feedback?.upgradeIndex === 'number') {
				// Send it back to acknowledge that it has been 'upgraded'
				updatedFeedbacks[id] = feedback
			}
		}
	}

	return {
		updatedActions: Object.values(updatedActions),
		updatedFeedbacks: Object.values(updatedFeedbacks),
		updatedConfig: null,
		latestUpgradeIndex: upgradeScripts.length - 1,
	}
}

/**
//  * Run through the upgrade scripts for the given data
//  * Note: this updates the inputs in place, but the result needs to be sent back to companion
//  * @param defaultUpgradeIndex The lastUpgradeIndex of the connection, if known
//  * @param upgradeScripts The scripts that may be run
//  * @param config The current config of the module
//  * @returns The upgraded data that needs persisting
 */
export function runConfigThroughUpgradeScripts(
	defaultUpgradeIndex: number,
	upgradeScripts: CompanionStaticUpgradeScript<any>[],
	config: unknown,
): { updatedConfig: unknown | undefined; latestUpgradeIndex: number } {
	let updatedConfig: unknown | undefined

	// Perform the upgrades. We start on the first batch/instance, and work our way up to the last
	const targetCount = upgradeScripts.length
	for (let i = defaultUpgradeIndex ?? -1; i < targetCount; i++) {
		const inputConfig = updatedConfig ?? config

		// We have an upgrade script that can be run
		const fcn = upgradeScripts[i]
		const res = fcn(
			{
				// Pass a clone to avoid mutations
				currentConfig: clone(inputConfig) as any,
			},
			{
				config: inputConfig,
				actions: [],
				feedbacks: [],
			},
		)

		// Apply changes
		if (res.updatedConfig) updatedConfig = res.updatedConfig
	}

	return {
		updatedConfig,
		latestUpgradeIndex: upgradeScripts.length - 1,
	}
}
