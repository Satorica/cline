/**
 * PLC Agent Debug Logger
 *
 * 通过环境变量 CLINE_DEBUG_MODE=true 开启。
 * 关闭时零性能开销，不写任何文件。
 *
 * 日志路径: <cwd>/logs/<taskId>.jsonl
 * 每行一条 JSON 事件（llm_request / llm_response）。
 */

import * as fs from "fs"
import * as path from "path"
import { Logger } from "@/shared/services/Logger"

// ─── Debug 开关 ────────────────────────────────────────────────────────────────
// 直接改这里的值来开启/关闭日志，true = 开启，false = 关闭

export const DEBUG_MODE = true

export function isDebugMode(): boolean {
	return DEBUG_MODE
}

// ─── 内部工具 ──────────────────────────────────────────────────────────────────

// esbuild 将代码打包到 dist/extension.js，
// 所以 __dirname = <项目根>/dist，往上一级即项目根
function logsDir(): string {
	return path.resolve(__dirname, "..", "logs")
}

function appendEntry(taskId: string, entry: Record<string, unknown>): void {
	if (!DEBUG_MODE) return
	try {
		const dir = logsDir()
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true })
		}
		const file = path.join(dir, `${taskId}.jsonl`)
		fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, "utf8")
		Logger.log(`[DebugLogger] ✅ 写入: ${file}`)
	} catch (err) {
		Logger.error(`[DebugLogger] ❌ 写入失败 (目标目录: ${logsDir()}):`, err)
	}
}

// 开启时在控制台输出一次确认信息，便于验证模块已加载
if (DEBUG_MODE) {
	Logger.log(`[DebugLogger] 已启动，日志目录: ${logsDir()}`)
}

// ─── 公开 API ──────────────────────────────────────────────────────────────────

export interface LlmRequestLog {
	model: string
	systemPrompt: string
	messages: unknown[]
	tools?: unknown[]
}

export interface LlmResponseLog {
	model: string
	content: string
	reasoning?: string
	inputTokens: number
	outputTokens: number
	cacheReadTokens?: number
	cacheWriteTokens?: number
	totalCost?: number
}

/**
 * 记录发往 LLM 的完整请求（system prompt + 对话历史 + 工具列表）
 */
export function logLlmRequest(taskId: string, data: LlmRequestLog): void {
	if (!DEBUG_MODE) return
	appendEntry(taskId, {
		type: "llm_request",
		timestamp: new Date().toISOString(),
		model: data.model,
		system_prompt: data.systemPrompt,
		conversation_history: data.messages,
		tools: data.tools ?? [],
	})
}

/**
 * 记录工具注册结果（哪些工具被成功注册，哪些因无 Handler 而跳过）
 */
export function logToolRegistration(taskId: string, registered: string[], skipped: string[]): void {
	const summary = `[ToolRegistry] 已注册 ${registered.length} 个工具，跳过 ${skipped.length} 个`
	Logger.log(summary)
	Logger.log(`[ToolRegistry] ✅ 已注册: ${registered.join(", ")}`)
	if (skipped.length > 0) {
		Logger.log(`[ToolRegistry] ⏭️  已跳过 (无 Handler): ${skipped.join(", ")}`)
	}

	if (!DEBUG_MODE) return
	appendEntry(taskId, {
		type: "tool_registration",
		timestamp: new Date().toISOString(),
		registered_count: registered.length,
		skipped_count: skipped.length,
		registered_tools: registered,
		skipped_tools: skipped,
	})
}

/**
 * 记录从 LLM 收到的完整响应（文本 + 推理 + token 用量）
 */
export function logLlmResponse(taskId: string, data: LlmResponseLog): void {
	if (!DEBUG_MODE) return
	appendEntry(taskId, {
		type: "llm_response",
		timestamp: new Date().toISOString(),
		model: data.model,
		content: data.content,
		reasoning: data.reasoning ?? "",
		tokens_used: {
			input: data.inputTokens,
			output: data.outputTokens,
			cache_read: data.cacheReadTokens ?? 0,
			cache_write: data.cacheWriteTokens ?? 0,
		},
		total_cost: data.totalCost,
	})
}
