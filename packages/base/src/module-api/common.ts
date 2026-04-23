/**
 * Utility functions available in the context of an action/feedback
 */
export interface CompanionCommonCallbackContext {
	/** Whether this context is for an action or feedback */
	readonly type: 'action' | 'feedback'
}

export interface CompanionLearnCallbackContext extends CompanionCommonCallbackContext {
	/**
	 * A signal that will abort if the user cancels the learn process. 
	 * Once the signal is aborted, the learn process should be stopped as soon as possible, with the return value or any thrown error being ignored.
	 */
	readonly signal: AbortSignal
}