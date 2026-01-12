/**
 * Utility functions available in the context of an action/feedback
 */
export interface CompanionCommonCallbackContext {
	/**
	 * @deprecated Companion now handles this for you, you should no longer need use any version of this function
	 * Parse and replace all the variables in a string
	 * Note: Any uses of this in feedbacks will not correctly update the feedback when the variable changes.
	 * @param text The text to parse
	 * @returns The string with variables replaced with their values
	 */
	parseVariablesInString(text: string): Promise<string>
}
