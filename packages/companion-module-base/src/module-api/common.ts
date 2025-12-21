/**
 * Utility functions available in the context of an action/feedback
 */
export interface CompanionCommonCallbackContext {
	/**
	 * @deprecated Companion now handles this for you, you should no longer need to use this
	 * Parse and replace all the variables in a string
	 * Note: it is important to use this version when in a feedback, so that the feedback will react properly when the variables parsed change
	 * @param text The text to parse
	 * @returns The string with variables replaced with their values
	 */
	parseVariablesInString(text: string): Promise<string>
}
