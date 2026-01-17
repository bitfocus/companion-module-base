import { describe, expect, test } from 'vitest'
import type { HostToModuleEventsV0, ModuleToHostEventsV0 } from '../api.js'
import type { Complete } from '../../util.js'
import { InstanceStatus } from '../../module-api/enums.js'
import { CompanionAdvancedFeedbackResult } from '../../module-api/index.js'

type ObjectToSimpleBoolean<T> = {
	[K in keyof T]: true
}

describe('ModuleToHostEventsV0', () => {
	const basicObj: ObjectToSimpleBoolean<ModuleToHostEventsV0> = {
		'log-message': true,
		'set-status': true,
		setActionDefinitions: true,
		setFeedbackDefinitions: true,
		setVariableDefinitions: true,
		setPresetDefinitions: true,
		setVariableValues: true,
		updateFeedbackValues: true,
		saveConfig: true,
		'send-osc': true,
		parseVariablesInString: true,
		recordAction: true,
		setCustomVariable: true,
		sharedUdpSocketJoin: true,
		sharedUdpSocketLeave: true,
		sharedUdpSocketSend: true,
	}
	const testsBeingRun = new Set<string>()

	function testForParams<T extends keyof typeof basicObj>(...params: Parameters<Complete<ModuleToHostEventsV0>[T]>) {
		const cloned = JSON.parse(JSON.stringify(params))
		expect(cloned).toEqual(params)
	}

	function testForReturn<T extends keyof typeof basicObj>(obj: Complete<ReturnType<ModuleToHostEventsV0[T]>>) {
		const cloned = JSON.parse(JSON.stringify(obj))
		expect(cloned).toEqual(obj)
	}

	test('log-message', () => {
		testsBeingRun.add('log-message')

		testForParams<'log-message'>({
			level: 'info',
			message: 'test',
		})
	})

	test('set-status', () => {
		testsBeingRun.add('set-status')

		testForParams<'set-status'>({
			status: InstanceStatus.BadConfig,
			message: 'test',
		})

		testForParams<'set-status'>({
			status: InstanceStatus.BadConfig,
			message: null,
		})
	})

	test('setActionDefinitions', () => {
		testsBeingRun.add('setActionDefinitions')

		testForParams<'setActionDefinitions'>({
			actions: [
				{
					id: 'test-action',
					name: 'Test Action',
					description: 'Action description',
					options: [],
					hasLearn: false,
					learnTimeout: undefined,
					hasLifecycleFunctions: true,
					optionsToIgnoreForSubscribe: ['abc'],
				},
			],
		})
	})

	test('setFeedbackDefinitions', () => {
		testsBeingRun.add('setFeedbackDefinitions')

		testForParams<'setFeedbackDefinitions'>({
			feedbacks: [
				{
					id: 'test-feedback',
					name: 'Test Feedback',
					description: 'Feedback description',
					options: [],
					type: 'boolean',
					hasLearn: false,
					showInvert: true,
					learnTimeout: undefined,
				},
			],
		})
	})

	test('setVariableDefinitions', () => {
		testsBeingRun.add('setVariableDefinitions')

		testForParams<'setVariableDefinitions'>({
			variables: [
				{
					id: 'test-variable',
					name: 'Test Variable',
				},
			],
		})

		testForParams<'setVariableDefinitions'>({
			variables: [
				{
					id: 'test-variable',
					name: 'Test Variable',
				},
			],
			newValues: [
				{
					id: 'test-variable',
					value: 'test-value',
				},
			],
		})
	})

	test('setPresetDefinitions', () => {
		testsBeingRun.add('setPresetDefinitions')

		testForParams<'setPresetDefinitions'>({
			presets: [
				{
					id: 'test-preset',
					category: 'Test',
					name: 'Test Preset',
					type: 'button',
					style: {
						text: 'Test',
						size: 'auto',
						color: 0xffffff,
						bgcolor: 0x000000,
					},
					steps: [],
					feedbacks: [],
				},
			],
		})
	})

	test('setVariableValues', () => {
		testsBeingRun.add('setVariableValues')

		testForParams<'setVariableValues'>({
			newValues: [
				{
					id: 'test-variable',
					value: 'test-value',
				},
				{
					id: 'numeric-variable',
					value: 42,
				},
				{
					id: 'boolean-variable',
					value: true,
				},
				{
					id: 'undefined-variable',
					value: undefined,
				},
			],
		})
	})

	test('updateFeedbackValues', () => {
		testsBeingRun.add('updateFeedbackValues')

		testForParams<'updateFeedbackValues'>({
			values: [
				{
					id: 'test-feedback',
					controlId: 'test-control',
					value: true,
				},
				{
					id: 'style-feedback',
					controlId: 'style-control',
					value: {
						color: 0xffffff,
						bgcolor: 0x000000,
					},
				},
				{
					id: 'undefined-feedback',
					controlId: 'undefined-control',
					value: undefined,
				},
			],
		})

		testForParams<'updateFeedbackValues'>({
			values: [
				{
					id: 'test-feedback',
					controlId: 'test-control',
					value: {
						color: 0xffffff,
						bgcolor: 0x000000,
						text: 'Test',
						size: 'auto',
						textExpression: false,

						alignment: 'center:center',
						pngalignment: 'center:center',

						png64: 'abcdef',
						show_topbar: false,

						imageBuffer: 'test',
						imageBufferEncoding: { pixelFormat: 'ARGB' },
						imageBufferPosition: {
							x: 0,
							y: 0,
							width: 100,
							height: 100,
							drawScale: 1,
						},
					} satisfies Complete<CompanionAdvancedFeedbackResult>,
				},
			],
		})
	})

	test('saveConfig', () => {
		testsBeingRun.add('saveConfig')

		testForParams<'saveConfig'>({
			config: {
				host: '192.168.1.1',
				port: 8080,
			},
			secrets: {
				apiKey: '123',
				abc: null,
			},
		})
	})

	test('send-osc', () => {
		testsBeingRun.add('send-osc')

		testForParams<'send-osc'>({
			host: 'localhost',
			port: 8000,
			path: '/test',
			args: [
				{ type: 'i', value: 42 },
				{ type: 's', value: 'test' },
				{ type: 'b', value: Buffer.from('test') },
			],
		})
	})

	test('parseVariablesInString', () => {
		testsBeingRun.add('parseVariablesInString')

		testForParams<'parseVariablesInString'>({
			text: 'Hello $(test)',
			controlId: 'test-control',
			feedbackInstanceId: undefined,
			actionInstanceId: undefined,
		})

		const response = {
			text: 'Hello world',
			variableIds: ['test'],
		}

		testForReturn<'parseVariablesInString'>(response)
	})

	test('recordAction', () => {
		testsBeingRun.add('recordAction')

		testForParams<'recordAction'>({
			uniquenessId: 'test-unique-id',
			actionId: 'test-action',
			options: {
				option1: 'value1',
				option2: 42,
			},
			delay: 100,
		})

		testForParams<'recordAction'>({
			uniquenessId: null,
			actionId: 'test-action',
			options: {},
			delay: undefined,
		})
	})

	test('setCustomVariable', () => {
		testsBeingRun.add('setCustomVariable')

		testForParams<'setCustomVariable'>({
			customVariableId: 'test-custom-var',
			value: 'test-value',
			controlId: 'test-control',
		})

		testForParams<'setCustomVariable'>({
			customVariableId: 'test-custom-var',
			value: 42,
			controlId: undefined,
		})
	})

	test('sharedUdpSocketJoin', () => {
		testsBeingRun.add('sharedUdpSocketJoin')

		testForParams<'sharedUdpSocketJoin'>({
			family: 'udp4',
			portNumber: 8000,
		})

		const response = 'handle-id-1234'

		testForReturn<'sharedUdpSocketJoin'>(response)
	})

	test('sharedUdpSocketLeave', () => {
		testsBeingRun.add('sharedUdpSocketLeave')

		testForParams<'sharedUdpSocketLeave'>({
			handleId: 'handle-id-1234',
		})
	})

	test('sharedUdpSocketSend', () => {
		testsBeingRun.add('sharedUdpSocketSend')

		testForParams<'sharedUdpSocketSend'>({
			handleId: 'handle-id-1234',
			message: Buffer.from('test message').toString('base64'),
			address: '192.168.1.100',
			port: 9000,
		})
	})

	// Note: this must be the final test!
	test('Ensure all events were checked', () => {
		const missing: string[] = []
		for (const key of Object.keys(basicObj)) {
			if (!testsBeingRun.has(key)) {
				missing.push(key)
			}
		}

		if (missing.length > 0) {
			throw new Error(`Missing tests for ${missing.join(', ')}`)
		}
	})
})

describe('HostToModuleEventsV0', () => {
	const basicObj: ObjectToSimpleBoolean<HostToModuleEventsV0> = {
		init: true,
		destroy: true,
		updateConfigAndLabel: true,
		updateFeedbacks: true,
		updateActions: true,
		upgradeActionsAndFeedbacks: true,
		executeAction: true,
		getConfigFields: true,
		handleHttpRequest: true,
		learnAction: true,
		learnFeedback: true,
		startStopRecordActions: true,
		sharedUdpSocketMessage: true,
		sharedUdpSocketError: true,
	}
	const testsBeingRun = new Set<string>()

	function testForParams<T extends keyof typeof basicObj>(...params: Parameters<Complete<HostToModuleEventsV0>[T]>) {
		const cloned = JSON.parse(JSON.stringify(params))
		expect(cloned).toEqual(params)
	}

	function testForReturn<T extends keyof typeof basicObj>(obj: Complete<ReturnType<HostToModuleEventsV0[T]>>) {
		const cloned = JSON.parse(JSON.stringify(obj))
		expect(cloned).toEqual(obj)
	}

	test('init', () => {
		testsBeingRun.add('init')

		testForParams<'init'>({
			label: 'Test Module',
			isFirstInit: true,
			config: {
				host: '192.168.1.1',
				port: 1234,
			},
			secrets: {
				abc: 13,
			},
			lastUpgradeIndex: 0,
		})

		testForReturn<'init'>({
			hasHttpHandler: true,
			hasRecordActionsHandler: true,
			newUpgradeIndex: 1,

			updatedConfig: {
				host: '192.168.1.1',
				port: 1234,
				username: 'default',
			},
			updatedSecrets: {
				abc: 13,
			},
		})
	})

	test('destroy', () => {
		testsBeingRun.add('destroy')

		testForParams<'destroy'>({})
	})

	test('updateConfigAndLabel', () => {
		testsBeingRun.add('updateConfigAndLabel')

		testForParams<'updateConfigAndLabel'>({
			label: 'Updated Module',
			config: {
				host: '192.168.1.100',
				port: 5678,
			},
			secrets: {
				a: 123,
				b: null,
			},
		})
	})

	test('updateFeedbacks', () => {
		testsBeingRun.add('updateFeedbacks')

		testForParams<'updateFeedbacks'>({
			feedbacks: {
				'feedback-1': {
					id: 'feedback-1',
					controlId: 'control-1',
					isInverted: false,
					upgradeIndex: null,
					disabled: false,
					feedbackId: 'test-feedback',
					options: {
						option1: 'value1',
						option2: 42,
					},
				},
				'feedback-2': null,
				'feedback-3': {
					id: 'feedback-3',
					controlId: 'control-3',
					isInverted: true,
					upgradeIndex: 0,
					disabled: true,
					feedbackId: 'advanced-feedback',
					options: {},
					image: {
						width: 72,
						height: 72,
					},
				},
			},
		})
	})

	test('updateActions', () => {
		testsBeingRun.add('updateActions')

		testForParams<'updateActions'>({
			actions: {
				'action-1': {
					id: 'action-1',
					controlId: 'control-1',
					upgradeIndex: null,
					disabled: false,
					actionId: 'test-action',
					options: {
						option1: 'value1',
						option2: 42,
					},
				},
				'action-2': null,
				'action-3': undefined,
			},
		})
	})

	test('upgradeActionsAndFeedbacks', () => {
		testsBeingRun.add('upgradeActionsAndFeedbacks')

		testForParams<'upgradeActionsAndFeedbacks'>({
			actions: [
				{
					id: 'action-1',
					controlId: 'control-1',
					upgradeIndex: 0,
					disabled: false,
					actionId: 'test-action',
					options: {
						option1: { value: 'value1', isExpression: true },
						option2: { value: 42, isExpression: false },
					},
				},
			],
			feedbacks: [
				{
					id: 'feedback-1',
					controlId: 'control-1',
					isInverted: false,
					upgradeIndex: 0,
					disabled: false,
					feedbackId: 'test-feedback',
					options: {
						option1: { value: 'value1', isExpression: true },
						option2: { value: 42, isExpression: false },
					},
				},
			],
			defaultUpgradeIndex: 0,
		})

		const response: ReturnType<HostToModuleEventsV0['upgradeActionsAndFeedbacks']> = {
			updatedConfig: {},
			updatedSecrets: {},
			updatedActions: [
				{
					id: 'action-1',
					controlId: 'control-1',
					upgradeIndex: null,
					disabled: false,
					actionId: 'test-action',
					options: {
						option1: { value: 'value1', isExpression: true },
						option2: { value: 42, isExpression: false },
						newOption: { value: true, isExpression: false },
					},
				},
			],
			updatedFeedbacks: [
				{
					id: 'feedback-1',
					controlId: 'control-1',
					isInverted: false,
					upgradeIndex: null,
					disabled: false,
					feedbackId: 'test-feedback',
					options: {
						option1: { value: 'value1', isExpression: true },
						option2: { value: 42, isExpression: false },
						newOption: { value: true, isExpression: false },
					},
				},
			],
			latestUpgradeIndex: 1,
		}

		testForReturn<'upgradeActionsAndFeedbacks'>(response)
	})

	test('executeAction', () => {
		testsBeingRun.add('executeAction')

		testForParams<'executeAction'>({
			action: {
				id: 'action-1',
				controlId: 'control-1',
				upgradeIndex: null,
				disabled: false,
				actionId: 'test-action',
				options: {
					option1: 'value1',
					option2: 42,
				},
			},
			surfaceId: 'streamdeck-1',
		})

		testForParams<'executeAction'>({
			action: {
				id: 'action-2',
				controlId: 'control-2',
				upgradeIndex: null,
				disabled: false,
				actionId: 'another-action',
				options: {},
			},
			surfaceId: undefined,
		})
	})

	test('getConfigFields', () => {
		testsBeingRun.add('getConfigFields')

		testForParams<'getConfigFields'>({})

		const response: ReturnType<HostToModuleEventsV0['getConfigFields']> = {
			fields: [
				{
					id: 'host',
					label: 'Target IP',
					type: 'textinput',
					// default: '192.168.1.1',
					// required: true,
				},
				{
					id: 'port',
					label: 'Target Port',
					type: 'number',
					// default: 80,
					// required: true,
					// min: 1,
					// max: 65535,
				},
			],
		}

		testForReturn<'getConfigFields'>(response)
	})

	test('handleHttpRequest', () => {
		testsBeingRun.add('handleHttpRequest')

		testForParams<'handleHttpRequest'>({
			request: {
				path: '/api/test',
				method: 'GET',
				headers: {
					'user-agent': 'Test Browser',
					'content-type': 'application/json',
				},
				body: '{"test": true}',
				baseUrl: 'http://localhost:8080',
				hostname: 'localhost',
				ip: '10.0.0.0',
				originalUrl: '/api/test?query=1',
				query: {
					query: '1',
				},
			},
		})

		const response = {
			response: {
				statusCode: 200,
				headers: {
					'content-type': 'application/json',
				},
				body: '{"status": "success"}',
			},
		}

		testForReturn<'handleHttpRequest'>(response)
	})

	test('learnAction', () => {
		testsBeingRun.add('learnAction')

		testForParams<'learnAction'>({
			action: {
				id: 'action-1',
				controlId: 'control-1',
				upgradeIndex: null,
				disabled: false,
				actionId: 'test-action',
				options: {
					option1: 'value1',
					option2: 42,
				},
			},
		})

		const response = {
			options: {
				option1: 'learned-value',
				option2: 100,
				newOption: 'discovered',
			},
		}

		testForReturn<'learnAction'>(response)
	})

	test('learnFeedback', () => {
		testsBeingRun.add('learnFeedback')

		testForParams<'learnFeedback'>({
			feedback: {
				id: 'feedback-1',
				controlId: 'control-1',
				isInverted: false,
				upgradeIndex: null,
				disabled: false,
				feedbackId: 'test-feedback',
				options: {
					option1: 'value1',
					option2: 42,
				},
			},
		})

		const response = {
			options: {
				option1: 'learned-value',
				option2: 100,
				newOption: 'discovered',
			},
		}

		testForReturn<'learnFeedback'>(response)
	})

	test('startStopRecordActions', () => {
		testsBeingRun.add('startStopRecordActions')

		testForParams<'startStopRecordActions'>({
			recording: true,
		})

		testForParams<'startStopRecordActions'>({
			recording: false,
		})
	})

	test('sharedUdpSocketMessage', () => {
		testsBeingRun.add('sharedUdpSocketMessage')

		testForParams<'sharedUdpSocketMessage'>({
			handleId: 'handle-id-1234',
			portNumber: 8000,
			message: Buffer.from('test message').toString('base64'),
			source: {
				address: '192.168.1.100',
				port: 9000,
				family: 'IPv4',
				size: 12,
			},
		})
	})

	test('sharedUdpSocketError', () => {
		testsBeingRun.add('sharedUdpSocketError')

		const err = new Error('Socket error')

		testForParams<'sharedUdpSocketError'>({
			handleId: 'handle-id-1234',
			portNumber: 8000,
			errorMessage: err.message,
			errorStack: err.stack,
		})
	})

	// Note: this must be the final test!
	test('Ensure all events were checked', () => {
		const missing: string[] = []
		for (const key of Object.keys(basicObj)) {
			if (!testsBeingRun.has(key)) {
				missing.push(key)
			}
		}

		if (missing.length > 0) {
			throw new Error(`Missing tests for ${missing.join(', ')}`)
		}
	})
})
