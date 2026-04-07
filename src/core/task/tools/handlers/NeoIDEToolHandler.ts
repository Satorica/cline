import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import * as vscode from "vscode"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import type { IFullyManagedTool } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"
import { ToolResultUtils } from "../utils/ToolResultUtils"

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function getNeoIdeApi(): Promise<any> {
	const ext = vscode.extensions.getExtension("your-publisher-id.neoide")
	if (!ext) {
		throw new Error("NeoIDE 插件未安装或未找到。请确认 NeoIDE 已安装并启用。")
	}
	if (!ext.isActive) {
		await ext.activate()
	}
	return ext.exports
}

async function requireApproval(
	toolName: ClineDefaultTool,
	label: string,
	description: string,
	config: TaskConfig,
	_uiHelpers?: StronglyTypedUIHelpers,
): Promise<boolean> {
	const completeMessage = JSON.stringify({ tool: "neoide", path: label, content: description })

	if (config.callbacks.shouldAutoApproveTool(toolName)) {
		await config.callbacks.removeLastPartialMessageIfExistsWithType("ask", "tool")
		await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
		return true
	}

	showNotificationForApproval(description, config.autoApprovalSettings.enableNotifications)
	await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
	return ToolResultUtils.askApprovalAndPushFeedback("tool", completeMessage, config)
}

function apiError(result: { error?: { message?: string; code?: string } }): string {
	return result.error?.message ?? result.error?.code ?? "未知错误"
}

// ---------------------------------------------------------------------------
// neoide_get_project_status
// ---------------------------------------------------------------------------

export class NeoIDEGetStatusHandler implements IFullyManagedTool {
	readonly name = ClineDefaultTool.NEOIDE_GET_STATUS

	getDescription(_block: ToolUse): string {
		return "[neoide_get_project_status]"
	}

	async handlePartialBlock(_block: ToolUse, _uiHelpers: StronglyTypedUIHelpers): Promise<void> {}

	async execute(_config: TaskConfig, _block: ToolUse): Promise<ToolResponse> {
		try {
			const api = await getNeoIdeApi()
			const result = await api.getProjectStatus()
			if (!result.success) {
				return formatResponse.toolError(`获取项目状态失败: ${apiError(result)}`)
			}
			return `项目状态:\n${JSON.stringify(result.data, null, 2)}`
		} catch (err: any) {
			return formatResponse.toolError(err.message ?? String(err))
		}
	}
}

// ---------------------------------------------------------------------------
// neoide_get_plc_config
// ---------------------------------------------------------------------------

export class NeoIDEGetConfigHandler implements IFullyManagedTool {
	readonly name = ClineDefaultTool.NEOIDE_GET_CONFIG

	getDescription(block: ToolUse): string {
		return `[neoide_get_plc_config configType="${block.params.config_type}"]`
	}

	async handlePartialBlock(_block: ToolUse, _uiHelpers: StronglyTypedUIHelpers): Promise<void> {}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const configType: string | undefined = block.params.config_type
		if (!configType) {
			config.taskState.consecutiveMistakeCount++
			return config.callbacks.sayAndCreateMissingParamError(this.name, "config_type")
		}
		config.taskState.consecutiveMistakeCount = 0

		try {
			const api = await getNeoIdeApi()
			const result = await api.getPlcConfig(configType)
			if (!result.success) {
				return formatResponse.toolError(`获取 PLC 配置失败: ${apiError(result)}`)
			}
			return `${configType} 配置:\n${JSON.stringify(result.data, null, 2)}`
		} catch (err: any) {
			return formatResponse.toolError(err.message ?? String(err))
		}
	}
}

// ---------------------------------------------------------------------------
// neoide_create_axis
// ---------------------------------------------------------------------------

export class NeoIDECreateAxisHandler implements IFullyManagedTool {
	readonly name = ClineDefaultTool.NEOIDE_CREATE_AXIS

	getDescription(block: ToolUse): string {
		return `[neoide_create_axis name="${block.params.name}"]`
	}

	async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		const name = block.params.name || ""
		const msg = JSON.stringify({
			tool: "neoide",
			path: name,
			content: `创建轴: ${uiHelpers.removeClosingTag(block, "name", name)}`,
		})
		await uiHelpers.removeLastPartialMessageIfExistsWithType("say", "tool")
		await uiHelpers.ask("tool", msg, block.partial).catch(() => {})
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const name: string | undefined = block.params.name
		const deviceNumber: string | undefined = block.params.device_number
		const masterId: string | undefined = block.params.master_id
		const slaveId: string | undefined = block.params.slave_id

		if (!name) {
			config.taskState.consecutiveMistakeCount++
			return config.callbacks.sayAndCreateMissingParamError(this.name, "name")
		}
		if (deviceNumber === undefined) {
			config.taskState.consecutiveMistakeCount++
			return config.callbacks.sayAndCreateMissingParamError(this.name, "device_number")
		}
		if (masterId === undefined) {
			config.taskState.consecutiveMistakeCount++
			return config.callbacks.sayAndCreateMissingParamError(this.name, "master_id")
		}
		if (slaveId === undefined) {
			config.taskState.consecutiveMistakeCount++
			return config.callbacks.sayAndCreateMissingParamError(this.name, "slave_id")
		}
		config.taskState.consecutiveMistakeCount = 0

		const didApprove = await requireApproval(
			ClineDefaultTool.NEOIDE_CREATE_AXIS,
			name,
			`在 NeoIDE 中创建轴 "${name}" (master=${masterId}, slave=${slaveId})`,
			config,
		)
		if (!didApprove) return formatResponse.toolDenied()

		try {
			const api = await getNeoIdeApi()
			let setting: object | undefined
			if (block.params.setting) {
				try {
					setting = JSON.parse(block.params.setting)
				} catch {
					return formatResponse.toolError("setting 参数不是合法的 JSON 对象")
				}
			}
			const result = await api.createAxis({
				name,
				device_number: Number(deviceNumber),
				master_id: Number(masterId),
				slave_id: Number(slaveId),
				servo_type: block.params.servo_type,
				drive_type: block.params.drive_type,
				drive_ver: block.params.drive_ver,
				setting,
			})
			if (!result.success) {
				return formatResponse.toolError(`创建轴失败: ${apiError(result)}`)
			}
			return `轴 "${result.data.name}" 创建成功，ID=${result.data.id}`
		} catch (err: any) {
			return formatResponse.toolError(err.message ?? String(err))
		}
	}
}

// ---------------------------------------------------------------------------
// neoide_update_axis
// ---------------------------------------------------------------------------

export class NeoIDEUpdateAxisHandler implements IFullyManagedTool {
	readonly name = ClineDefaultTool.NEOIDE_UPDATE_AXIS

	getDescription(block: ToolUse): string {
		return `[neoide_update_axis id="${block.params.id}"]`
	}

	async handlePartialBlock(_block: ToolUse, _uiHelpers: StronglyTypedUIHelpers): Promise<void> {}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const id: string | undefined = block.params.id
		const params: string | undefined = block.params.params

		if (!id) {
			config.taskState.consecutiveMistakeCount++
			return config.callbacks.sayAndCreateMissingParamError(this.name, "id")
		}
		if (!params) {
			config.taskState.consecutiveMistakeCount++
			return config.callbacks.sayAndCreateMissingParamError(this.name, "params")
		}
		config.taskState.consecutiveMistakeCount = 0

		let parsedParams: object
		try {
			parsedParams = JSON.parse(params)
		} catch {
			return formatResponse.toolError("params 参数不是合法的 JSON 对象")
		}

		const didApprove = await requireApproval(ClineDefaultTool.NEOIDE_UPDATE_AXIS, id, `更新轴 ID=${id}`, config)
		if (!didApprove) return formatResponse.toolDenied()

		try {
			const api = await getNeoIdeApi()
			const result = await api.updateAxis(Number(id), parsedParams)
			if (!result.success) {
				return formatResponse.toolError(`更新轴失败: ${apiError(result)}`)
			}
			return `轴 ID=${id} 更新成功`
		} catch (err: any) {
			return formatResponse.toolError(err.message ?? String(err))
		}
	}
}

// ---------------------------------------------------------------------------
// neoide_delete_axis
// ---------------------------------------------------------------------------

export class NeoIDEDeleteAxisHandler implements IFullyManagedTool {
	readonly name = ClineDefaultTool.NEOIDE_DELETE_AXIS

	getDescription(block: ToolUse): string {
		return `[neoide_delete_axis id="${block.params.id}"]`
	}

	async handlePartialBlock(_block: ToolUse, _uiHelpers: StronglyTypedUIHelpers): Promise<void> {}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const id: string | undefined = block.params.id
		if (!id) {
			config.taskState.consecutiveMistakeCount++
			return config.callbacks.sayAndCreateMissingParamError(this.name, "id")
		}
		config.taskState.consecutiveMistakeCount = 0

		const didApprove = await requireApproval(
			ClineDefaultTool.NEOIDE_DELETE_AXIS,
			id,
			`删除轴 ID=${id}（此操作不可撤销）`,
			config,
		)
		if (!didApprove) return formatResponse.toolDenied()

		try {
			const api = await getNeoIdeApi()
			const result = await api.deleteAxis(Number(id))
			if (!result.success) {
				return formatResponse.toolError(`删除轴失败: ${apiError(result)}`)
			}
			return `轴 ID=${id} 已删除`
		} catch (err: any) {
			return formatResponse.toolError(err.message ?? String(err))
		}
	}
}

// ---------------------------------------------------------------------------
// neoide_create_task
// ---------------------------------------------------------------------------

export class NeoIDECreateTaskHandler implements IFullyManagedTool {
	readonly name = ClineDefaultTool.NEOIDE_CREATE_TASK

	getDescription(block: ToolUse): string {
		return `[neoide_create_task name="${block.params.name}"]`
	}

	async handlePartialBlock(_block: ToolUse, _uiHelpers: StronglyTypedUIHelpers): Promise<void> {}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const params: string | undefined = block.params.params
		if (!params) {
			config.taskState.consecutiveMistakeCount++
			return config.callbacks.sayAndCreateMissingParamError(this.name, "params")
		}
		config.taskState.consecutiveMistakeCount = 0

		let parsedParams: object
		try {
			parsedParams = JSON.parse(params)
		} catch {
			return formatResponse.toolError("params 参数不是合法的 JSON 对象")
		}

		const taskName = block.params.name || JSON.stringify(parsedParams)
		const didApprove = await requireApproval(ClineDefaultTool.NEOIDE_CREATE_TASK, taskName, `创建任务 "${taskName}"`, config)
		if (!didApprove) return formatResponse.toolDenied()

		try {
			const api = await getNeoIdeApi()
			const result = await api.createTask(parsedParams)
			if (!result.success) {
				return formatResponse.toolError(`创建任务失败: ${apiError(result)}`)
			}
			return `任务创建成功:\n${JSON.stringify(result.data, null, 2)}`
		} catch (err: any) {
			return formatResponse.toolError(err.message ?? String(err))
		}
	}
}

// ---------------------------------------------------------------------------
// neoide_update_task
// ---------------------------------------------------------------------------

export class NeoIDEUpdateTaskHandler implements IFullyManagedTool {
	readonly name = ClineDefaultTool.NEOIDE_UPDATE_TASK

	getDescription(block: ToolUse): string {
		return `[neoide_update_task id="${block.params.id}"]`
	}

	async handlePartialBlock(_block: ToolUse, _uiHelpers: StronglyTypedUIHelpers): Promise<void> {}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const id: string | undefined = block.params.id
		const params: string | undefined = block.params.params

		if (!id) {
			config.taskState.consecutiveMistakeCount++
			return config.callbacks.sayAndCreateMissingParamError(this.name, "id")
		}
		if (!params) {
			config.taskState.consecutiveMistakeCount++
			return config.callbacks.sayAndCreateMissingParamError(this.name, "params")
		}
		config.taskState.consecutiveMistakeCount = 0

		let parsedParams: object
		try {
			parsedParams = JSON.parse(params)
		} catch {
			return formatResponse.toolError("params 参数不是合法的 JSON 对象")
		}

		const didApprove = await requireApproval(ClineDefaultTool.NEOIDE_UPDATE_TASK, id, `更新任务 ID=${id}`, config)
		if (!didApprove) return formatResponse.toolDenied()

		try {
			const api = await getNeoIdeApi()
			const result = await api.updateTask(Number(id), parsedParams)
			if (!result.success) {
				return formatResponse.toolError(`更新任务失败: ${apiError(result)}`)
			}
			return `任务 ID=${id} 更新成功`
		} catch (err: any) {
			return formatResponse.toolError(err.message ?? String(err))
		}
	}
}

// ---------------------------------------------------------------------------
// neoide_delete_task
// ---------------------------------------------------------------------------

export class NeoIDEDeleteTaskHandler implements IFullyManagedTool {
	readonly name = ClineDefaultTool.NEOIDE_DELETE_TASK

	getDescription(block: ToolUse): string {
		return `[neoide_delete_task id="${block.params.id}"]`
	}

	async handlePartialBlock(_block: ToolUse, _uiHelpers: StronglyTypedUIHelpers): Promise<void> {}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const id: string | undefined = block.params.id
		if (!id) {
			config.taskState.consecutiveMistakeCount++
			return config.callbacks.sayAndCreateMissingParamError(this.name, "id")
		}
		config.taskState.consecutiveMistakeCount = 0

		const didApprove = await requireApproval(
			ClineDefaultTool.NEOIDE_DELETE_TASK,
			id,
			`删除任务 ID=${id}（此操作不可撤销）`,
			config,
		)
		if (!didApprove) return formatResponse.toolDenied()

		try {
			const api = await getNeoIdeApi()
			const result = await api.deleteTask(Number(id))
			if (!result.success) {
				return formatResponse.toolError(`删除任务失败: ${apiError(result)}`)
			}
			return `任务 ID=${id} 已删除`
		} catch (err: any) {
			return formatResponse.toolError(err.message ?? String(err))
		}
	}
}

// ---------------------------------------------------------------------------
// neoide_set_global_var
// ---------------------------------------------------------------------------

export class NeoIDESetGlobalVarHandler implements IFullyManagedTool {
	readonly name = ClineDefaultTool.NEOIDE_SET_GLOBAL_VAR

	getDescription(block: ToolUse): string {
		return `[neoide_set_global_var name="${block.params.name}"]`
	}

	async handlePartialBlock(_block: ToolUse, _uiHelpers: StronglyTypedUIHelpers): Promise<void> {}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const name: string | undefined = block.params.name
		const address: string | undefined = block.params.address
		const dataType: string | undefined = block.params.data_type
		const initValue: string | undefined = block.params.init_value

		if (!name) {
			config.taskState.consecutiveMistakeCount++
			return config.callbacks.sayAndCreateMissingParamError(this.name, "name")
		}
		if (!address) {
			config.taskState.consecutiveMistakeCount++
			return config.callbacks.sayAndCreateMissingParamError(this.name, "address")
		}
		if (!dataType) {
			config.taskState.consecutiveMistakeCount++
			return config.callbacks.sayAndCreateMissingParamError(this.name, "data_type")
		}
		if (initValue === undefined) {
			config.taskState.consecutiveMistakeCount++
			return config.callbacks.sayAndCreateMissingParamError(this.name, "init_value")
		}
		config.taskState.consecutiveMistakeCount = 0

		const didApprove = await requireApproval(
			ClineDefaultTool.NEOIDE_SET_GLOBAL_VAR,
			name,
			`设置全局变量 "${name}" (${dataType} @ ${address})`,
			config,
		)
		if (!didApprove) return formatResponse.toolDenied()

		try {
			const api = await getNeoIdeApi()
			const result = await api.setGlobalVar({
				name,
				address,
				dataType,
				initValue,
				comment: block.params.comment,
				retain: block.params.retain === "true",
				constant: block.params.constant === "true",
			})
			if (!result.success) {
				return formatResponse.toolError(`设置全局变量失败: ${apiError(result)}`)
			}
			return `全局变量 "${name}" 设置成功`
		} catch (err: any) {
			return formatResponse.toolError(err.message ?? String(err))
		}
	}
}

// ---------------------------------------------------------------------------
// neoide_delete_global_var
// ---------------------------------------------------------------------------

export class NeoIDEDeleteGlobalVarHandler implements IFullyManagedTool {
	readonly name = ClineDefaultTool.NEOIDE_DELETE_GLOBAL_VAR

	getDescription(block: ToolUse): string {
		return `[neoide_delete_global_var name="${block.params.name}"]`
	}

	async handlePartialBlock(_block: ToolUse, _uiHelpers: StronglyTypedUIHelpers): Promise<void> {}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const name: string | undefined = block.params.name
		if (!name) {
			config.taskState.consecutiveMistakeCount++
			return config.callbacks.sayAndCreateMissingParamError(this.name, "name")
		}
		config.taskState.consecutiveMistakeCount = 0

		const didApprove = await requireApproval(
			ClineDefaultTool.NEOIDE_DELETE_GLOBAL_VAR,
			name,
			`删除全局变量 "${name}"`,
			config,
		)
		if (!didApprove) return formatResponse.toolDenied()

		try {
			const api = await getNeoIdeApi()
			const result = await api.deleteGlobalVar(name)
			if (!result.success) {
				return formatResponse.toolError(`删除全局变量失败: ${apiError(result)}`)
			}
			return `全局变量 "${name}" 已删除`
		} catch (err: any) {
			return formatResponse.toolError(err.message ?? String(err))
		}
	}
}

// ---------------------------------------------------------------------------
// neoide_trigger_compile
// ---------------------------------------------------------------------------

export class NeoIDECompileHandler implements IFullyManagedTool {
	readonly name = ClineDefaultTool.NEOIDE_COMPILE

	getDescription(_block: ToolUse): string {
		return "[neoide_trigger_compile]"
	}

	async handlePartialBlock(_block: ToolUse, _uiHelpers: StronglyTypedUIHelpers): Promise<void> {}

	async execute(config: TaskConfig, _block: ToolUse): Promise<ToolResponse> {
		const didApprove = await requireApproval(ClineDefaultTool.NEOIDE_COMPILE, "compile", "触发 NeoIDE 项目编译", config)
		if (!didApprove) return formatResponse.toolDenied()

		try {
			const api = await getNeoIdeApi()
			const result = await api.triggerCompile()
			if (!result.success) {
				return formatResponse.toolError(`触发编译失败: ${apiError(result)}`)
			}
			const report = result.data
			if (!report.success) {
				const errList = report.errors
					.filter((e: any) => e.severity === "error")
					.map((e: any) => `  ${e.location.file}:${e.location.line} - ${e.message}`)
					.join("\n")
				return formatResponse.toolError(`编译失败（耗时 ${report.duration}ms）:\n${errList}`)
			}
			const warnCount = report.errors.filter((e: any) => e.severity === "warning").length
			return `编译成功，耗时 ${report.duration}ms${warnCount > 0 ? `，${warnCount} 个警告` : ""}。\n输出文件: ${report.outputFiles.join(", ")}`
		} catch (err: any) {
			return formatResponse.toolError(err.message ?? String(err))
		}
	}
}
