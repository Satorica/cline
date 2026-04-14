/**
 * LoggingApiHandler
 *
 * 透明代理任何 ApiHandler，在请求前后分别写入 debug 日志。
 * 仅当 CLINE_DEBUG_MODE=true 时此文件才会被实例化（由调用方判断）。
 */

import { logLlmRequest, logLlmResponse } from "@core/debug/logger"
import { ClineStorageMessage } from "@/shared/messages/content"
import { ClineTool } from "@/shared/tools"
import { ApiHandler, ApiHandlerModel } from "./"
import { ApiStream, ApiStreamUsageChunk } from "./transform/stream"

export class LoggingApiHandler implements ApiHandler {
	private inner: ApiHandler
	private taskId: string

	constructor(inner: ApiHandler, taskId: string) {
		this.inner = inner
		this.taskId = taskId
	}

	async *createMessage(
		systemPrompt: string,
		messages: ClineStorageMessage[],
		tools?: ClineTool[],
		useResponseApi?: boolean,
	): ApiStream {
		const model = this.inner.getModel()

		// ── 记录请求 ─────────────────────────────────────────────────────────
		logLlmRequest(this.taskId, {
			model: model.id,
			systemPrompt,
			messages,
			tools,
		})

		// ── 流式透传并累积响应 ────────────────────────────────────────────────
		let content = ""
		let reasoning = ""
		let inputTokens = 0
		let outputTokens = 0
		let cacheReadTokens = 0
		let cacheWriteTokens = 0
		let totalCost: number | undefined

		try {
			for await (const chunk of this.inner.createMessage(systemPrompt, messages, tools, useResponseApi)) {
				switch (chunk.type) {
					case "text":
						content += chunk.text
						break
					case "reasoning":
						reasoning += chunk.reasoning
						break
					case "usage":
						inputTokens = chunk.inputTokens
						outputTokens = chunk.outputTokens
						cacheReadTokens = chunk.cacheReadTokens ?? 0
						cacheWriteTokens = chunk.cacheWriteTokens ?? 0
						totalCost = chunk.totalCost
						break
				}
				yield chunk
			}
		} finally {
			// 无论正常结束还是中途抛错，都落盘已累积到的响应
			logLlmResponse(this.taskId, {
				model: model.id,
				content,
				reasoning: reasoning || undefined,
				inputTokens,
				outputTokens,
				cacheReadTokens,
				cacheWriteTokens,
				totalCost,
			})
		}
	}

	getModel(): ApiHandlerModel {
		return this.inner.getModel()
	}

	async getApiStreamUsage(): Promise<ApiStreamUsageChunk | undefined> {
		return this.inner.getApiStreamUsage?.()
	}

	abort(): void {
		this.inner.abort?.()
	}
}
