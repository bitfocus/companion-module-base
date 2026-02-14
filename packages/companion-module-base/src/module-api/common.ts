/**
 * Utility functions available in the context of an action/feedback
 */
export interface CompanionCommonCallbackContext {
	/** Whether this context is for an action or feedback */
	readonly type: 'action' | 'feedback'
}
