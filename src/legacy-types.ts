import { InputValue } from './module-api'

/**
 * @deprecated
 */
export interface LegacyAction {
	id: string
	actionId: string // aka 'type'
	controlId: string
	options: { [key: string]: InputValue | undefined }
}

/**
 * @deprecated
 */
export interface LegacyFeedback {
	id: string
	feedbackId: string // aka 'type'
	controlId: string
	options: { [key: string]: InputValue | undefined }
}
