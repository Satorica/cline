import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

// ---------------------------------------------------------------------------
// neoide_get_project_status
// ---------------------------------------------------------------------------

const neoide_get_project_status: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.NEOIDE_GET_STATUS,
	name: "neoide_get_project_status",
	description:
		"查询 NeoIDE 当前项目的状态，包括项目是否已加载、工具链是否就绪、已连接的目标设备 ID 等。" +
		"在执行任何配置修改或编译操作之前，请先调用此工具确认项目已加载且工具链就绪。",
	parameters: [],
}

// ---------------------------------------------------------------------------
// neoide_get_plc_config
// ---------------------------------------------------------------------------

const neoide_get_plc_config: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.NEOIDE_GET_CONFIG,
	name: "neoide_get_plc_config",
	description:
		"查询 NeoIDE 项目的 PLC 配置信息。可查询轴（Axis）、任务（Task）、全局变量（GlobalVar）或 IO 配置。" +
		"在新增或修改配置前，建议先查询现有配置以避免重复或冲突。",
	parameters: [
		{
			name: "config_type",
			required: true,
			instruction: "要查询的配置类型，可选值: Axis | Task | GlobalVar | IO",
			usage: "Axis",
		},
	],
}

// ---------------------------------------------------------------------------
// neoide_create_axis
// ---------------------------------------------------------------------------

const neoide_create_axis: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.NEOIDE_CREATE_AXIS,
	name: "neoide_create_axis",
	description:
		"在 NeoIDE 项目中创建新的伺服轴配置。创建后轴将加入 EtherCAT 主站的从站映射。" +
		"必须先确认 NeoIDE 项目已加载（使用 neoide_get_project_status）。",
	parameters: [
		{
			name: "name",
			required: true,
			instruction: "轴名称，例如 Axis1、XAxis。同一项目中名称必须唯一。",
			usage: "Axis1",
		},
		{
			name: "device_number",
			required: true,
			instruction: "设备编号（整数）",
			usage: "1",
		},
		{
			name: "master_id",
			required: true,
			instruction: "EtherCAT 主站 ID（整数）",
			usage: "0",
		},
		{
			name: "slave_id",
			required: true,
			instruction: "EtherCAT 从站 ID（整数）",
			usage: "1",
		},
		{
			name: "servo_type",
			required: false,
			instruction: "伺服类型，默认 DS402-Generic",
			usage: "DS402-Generic",
		},
		{
			name: "drive_type",
			required: false,
			instruction: "驱动器类型，默认 servo_ds402_rt",
			usage: "servo_ds402_rt",
		},
		{
			name: "drive_ver",
			required: false,
			instruction: "驱动器版本，默认 1.0.0",
			usage: "1.0.0",
		},
		{
			name: "setting",
			required: false,
			instruction:
				"轴参数 JSON 字符串，可包含 mode（POSITION/VELOCITY/TORQUE）、user_unit（MM/DEGREE/PULSE/ROUND）、" +
				"vel_limit、acc_limit、pos_positive_limit、pos_negative_limit、gear_ratio 等字段。",
			usage: '{"mode":"POSITION","user_unit":"MM","vel_limit":1000}',
		},
	],
}

// ---------------------------------------------------------------------------
// neoide_update_axis
// ---------------------------------------------------------------------------

const neoide_update_axis: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.NEOIDE_UPDATE_AXIS,
	name: "neoide_update_axis",
	description: "更新 NeoIDE 中已存在的轴配置。只需传入要修改的字段，未传入的字段保持不变。",
	parameters: [
		{
			name: "id",
			required: true,
			instruction: "要更新的轴 ID（整数），可通过 neoide_get_plc_config 查询获得。",
			usage: "1",
		},
		{
			name: "params",
			required: true,
			instruction: "要更新的字段 JSON 字符串，例如修改名称、setting 等。",
			usage: '{"name":"NewAxisName","setting":{"vel_limit":2000}}',
		},
	],
}

// ---------------------------------------------------------------------------
// neoide_delete_axis
// ---------------------------------------------------------------------------

const neoide_delete_axis: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.NEOIDE_DELETE_AXIS,
	name: "neoide_delete_axis",
	description: "删除 NeoIDE 中的轴配置。此操作不可撤销，请谨慎使用。",
	parameters: [
		{
			name: "id",
			required: true,
			instruction: "要删除的轴 ID（整数）",
			usage: "1",
		},
	],
}

// ---------------------------------------------------------------------------
// neoide_create_task
// ---------------------------------------------------------------------------

const neoide_create_task: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.NEOIDE_CREATE_TASK,
	name: "neoide_create_task",
	description:
		"在 NeoIDE 项目中创建新的运动控制任务（Task）。支持周期触发、边沿触发、电平触发等触发类型。" +
		"可配置 CPU 亲和性和优先级以满足实时性要求。",
	parameters: [
		{
			name: "name",
			required: false,
			instruction: "任务名称（可选，用于显示）",
			usage: "MainTask",
		},
		{
			name: "params",
			required: true,
			instruction:
				"任务配置 JSON 字符串。必填字段: id（任务ID）、group（IEC_TASK/SCHEDULED_TASK/COMMUNICATION_TASK）、" +
				"trigger（CYCLIC/RISING/FALLING/HIGH/LOW/FREE/ONE_SHOT）。" +
				"可选字段: periodUs（周期微秒）、priority（0-31）、cpuAffinityMode（free/bind）、cpuId。",
			usage: '{"id":1,"group":"IEC_TASK","trigger":"CYCLIC","periodUs":1000,"priority":10}',
		},
	],
}

// ---------------------------------------------------------------------------
// neoide_update_task
// ---------------------------------------------------------------------------

const neoide_update_task: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.NEOIDE_UPDATE_TASK,
	name: "neoide_update_task",
	description: "更新 NeoIDE 中已存在的任务配置。只需传入要修改的字段。",
	parameters: [
		{
			name: "id",
			required: true,
			instruction: "要更新的任务 ID（整数）",
			usage: "1",
		},
		{
			name: "params",
			required: true,
			instruction: "要更新的字段 JSON 字符串",
			usage: '{"periodUs":2000,"priority":15}',
		},
	],
}

// ---------------------------------------------------------------------------
// neoide_delete_task
// ---------------------------------------------------------------------------

const neoide_delete_task: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.NEOIDE_DELETE_TASK,
	name: "neoide_delete_task",
	description: "删除 NeoIDE 中的任务配置。此操作不可撤销。",
	parameters: [
		{
			name: "id",
			required: true,
			instruction: "要删除的任务 ID（整数）",
			usage: "1",
		},
	],
}

// ---------------------------------------------------------------------------
// neoide_set_global_var
// ---------------------------------------------------------------------------

const neoide_set_global_var: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.NEOIDE_SET_GLOBAL_VAR,
	name: "neoide_set_global_var",
	description:
		"在 NeoIDE 中创建或更新全局变量。全局变量可在所有 POU（程序组织单元）中访问。" + "若同名变量已存在则更新，不存在则创建。",
	parameters: [
		{
			name: "name",
			required: true,
			instruction: "变量名称，例如 GVL_Speed。同一项目中名称必须唯一。",
			usage: "GVL_Speed",
		},
		{
			name: "address",
			required: true,
			instruction: "变量地址，例如 %MW100、%IX0.0",
			usage: "%MW100",
		},
		{
			name: "data_type",
			required: true,
			instruction: "数据类型，例如 INT、REAL、BOOL、DWORD",
			usage: "REAL",
		},
		{
			name: "init_value",
			required: true,
			instruction: "初始值（字符串形式），例如 0、0.0、TRUE、FALSE",
			usage: "0.0",
		},
		{
			name: "comment",
			required: false,
			instruction: "变量注释说明",
			usage: "主轴速度给定",
		},
		{
			name: "retain",
			required: false,
			instruction: "是否为保持型变量（掉电保持），true 或 false，默认 false",
			usage: "false",
		},
		{
			name: "constant",
			required: false,
			instruction: "是否为常量，true 或 false，默认 false",
			usage: "false",
		},
	],
}

// ---------------------------------------------------------------------------
// neoide_delete_global_var
// ---------------------------------------------------------------------------

const neoide_delete_global_var: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.NEOIDE_DELETE_GLOBAL_VAR,
	name: "neoide_delete_global_var",
	description: "删除 NeoIDE 中的全局变量。此操作不可撤销。",
	parameters: [
		{
			name: "name",
			required: true,
			instruction: "要删除的变量名称",
			usage: "GVL_Speed",
		},
	],
}

// ---------------------------------------------------------------------------
// neoide_trigger_compile
// ---------------------------------------------------------------------------

const neoide_trigger_compile: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.NEOIDE_COMPILE,
	name: "neoide_trigger_compile",
	description:
		"触发 NeoIDE 项目编译。编译完成后返回结果，包含编译耗时、输出文件列表及错误/警告信息。" +
		"在完成所有配置修改（轴、任务、全局变量等）后调用此工具以验证配置正确性。",
	parameters: [],
}

// ---------------------------------------------------------------------------
// neoide_create_pou
// ---------------------------------------------------------------------------

const neoide_create_pou: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.NEOIDE_CREATE_POU,
	name: "neoide_create_pou",
	description:
		"在 NeoIDE 项目中创建新的程序组织单元（POU）。支持三种类型：" +
		"PRG（程序）、FB（功能块）、FC（功能）。" +
		"POU 名称必须唯一，且符合 IEC 61131-3 命名规范。" +
		"创建后可通过 write_to_file 工具向 POU 写入 ST 代码。",
	parameters: [
		{
			name: "name",
			required: true,
			instruction: "POU 名称，例如 MotorControl、MainProgram。必须唯一且符合 IEC 61131-3 命名规范。",
			usage: "MotorControl",
		},
		{
			name: "type",
			required: true,
			instruction: "POU 类型，可选值: PRG（程序）、FB（功能块）、FC（功能）。",
			usage: "FB",
		},
	],
}

// ---------------------------------------------------------------------------
// neoide_delete_pou
// ---------------------------------------------------------------------------

const neoide_delete_pou: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.NEOIDE_DELETE_POU,
	name: "neoide_delete_pou",
	description: "删除 NeoIDE 中的程序组织单元（POU）。此操作不可撤销，请谨慎使用。",
	parameters: [
		{
			name: "name",
			required: true,
			instruction: "要删除的 POU 名称",
			usage: "MotorControl",
		},
	],
}

// ---------------------------------------------------------------------------
// neoide_update_pou
// ---------------------------------------------------------------------------

const neoide_update_pou: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.NEOIDE_UPDATE_POU,
	name: "neoide_update_pou",
	description: "更新 NeoIDE 中已存在的 POU 属性。只需传入要修改的字段，未传入的字段保持不变。",
	parameters: [
		{
			name: "name",
			required: true,
			instruction: "要更新的 POU 名称",
			usage: "MotorControl",
		},
		{
			name: "params",
			required: true,
			instruction: "要更新的字段 JSON 字符串，例如修改 POU 名称、类型等。",
			usage: '{"name":"NewMotorControl"}',
		},
	],
}

// ---------------------------------------------------------------------------
// neoide_get_pou_content
// ---------------------------------------------------------------------------

const neoide_get_pou_content: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.NEOIDE_GET_POU_CONTENT,
	name: "neoide_get_pou_content",
	description:
		"获取 NeoIDE 中指定 POU 的内容和属性信息。返回 POU 的类型、变量声明区和代码区。" +
		"在修改 POU 代码之前，建议先调用此工具查看当前内容。",
	parameters: [
		{
			name: "name",
			required: true,
			instruction: "要查询的 POU 名称",
			usage: "MotorControl",
		},
	],
}

// ---------------------------------------------------------------------------
// Export all variants
// ---------------------------------------------------------------------------

export const neoide_tools_variants: ClineToolSpec[] = [
	neoide_get_project_status,
	neoide_get_plc_config,
	neoide_create_axis,
	neoide_update_axis,
	neoide_delete_axis,
	neoide_create_task,
	neoide_update_task,
	neoide_delete_task,
	neoide_set_global_var,
	neoide_delete_global_var,
	neoide_trigger_compile,
	neoide_create_pou,
	neoide_delete_pou,
	neoide_update_pou,
	neoide_get_pou_content,
]
