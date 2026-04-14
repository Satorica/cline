# Cline 真实调试集成指南

## 概述
这个指南将告诉您如何在现有的 Cline 代码中集成真实的调试拦截器，让您在 F5 调试时看到完整的 LLM 请求和响应。

## 核心文件说明

### 1. `src/debug/RealInterceptor.ts` - 通用拦截器
- 拦截任何 provider 的 LLM 调用
- 记录请求和响应的完整上下文
- 提供性能统计和错误处理

### 2. `src/debug/AnthropicDebugWrapper.ts` - Anthropic 专用包装器
- 针对 Anthropic provider 的深度集成
- 支持流式响应的实时记录
- 处理复杂的 token 统计

### 3. `src/debug/DebugLogger.ts` - 日志系统
- 全局配置控制
- 文件日志存储（JSONL 格式）
- 多种日志级别控制

## 快速集成步骤

### 步骤 1: 创建调试配置接口

在 `src/core/api/index.ts` 的 `createHandlerForProvider` 函数中添加调试逻辑：

```typescript
import { DebugLogger } from '@/debug/DebugLogger';
import { autoWrapAnthropicHandler } from '@/debug/AnthropicDebugWrapper';

function createHandlerForProvider(
  apiProvider: string | undefined,
  options: Omit<ApiConfiguration, "apiProvider">,
  mode: Mode,
): ApiHandler {
  let handler: ApiHandler;

  switch (apiProvider) {
    case "anthropic":
      handler = new AnthropicHandler({
        onRetryAttempt: options.onRetryAttempt,
        apiKey: options.apiKey,
        anthropicBaseUrl: options.anthropicBaseUrl,
        apiModelId: mode === "plan" ? options.planModeApiModelId : options.actModeApiModelId,
        thinkingBudgetTokens: mode === "plan" ? options.planModeThinkingBudgetTokens : options.actModeThinkingBudgetTokens,
      });

      // 如果启用调试，自动包装 handler
      if (DebugLogger.isEnabled()) {
        handler = autoWrapAnthropicHandler(handler as AnthropicHandler);
      }

      return handler;

    // ... 其他 case 保持不变
  }
}
```

### 步骤 2: 添加全局配置开关

在 VSCode 的 `settings.json` 中：

```json
{
  "cline.debug.enabled": true,
  "cline.debug.logLevel": "debug",
  "cline.debug.logDirectory": "./logs",
  "cline.debug.includeRawRequests": true,
  "cline.debug.includeRawResponses": true
}
```

### 步骤 3: 在入口处初始化调试器

在 `extension.ts` 或主入口文件中：

```typescript
import { DebugLogger } from './src/debug/DebugLogger';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // 读取配置
  const debugConfig = vscode.workspace.getConfiguration('cline.debug');

  // 初始化调试器
  DebugLogger.initialize({
    enabled: debugConfig.get('enabled', false),
    logLevel: debugConfig.get('logLevel', 'debug'),
    logDirectory: debugConfig.get('logDirectory', './logs'),
    includeRawRequests: debugConfig.get('includeRawRequests', true),
    includeRawResponses: debugConfig.get('includeRawResponses', true),
    includeAgentContext: debugConfig.get('includeAgentContext', true),
    includeToolMetadata: debugConfig.get('includeToolMetadata', true),
  });

  if (DebugLogger.isEnabled()) {
    console.log('🔍 Cline debug mode activated');
  }
}
```

### 步骤 4: 拦截工具调用

找到工具处理器的工厂函数（可能在 `src/core/task/tools/handlers/` 中）：

```typescript
import { interceptToolHandler } from '@/debug/RealInterceptor';

function createToolHandler(toolName: string, handler: any) {
  if (DebugLogger.isEnabled()) {
    return interceptToolHandler(toolName, handler);
  }
  return handler;
}
```

## 验证调试功能

### 1. 启用调试模式
```json
{
  "cline.debug.enabled": true
}
```

### 2. 启动调试
- 按 F5 启动插件调试
- 打开开发者工具（Ctrl+Shift+I）

### 3. 查看实时日志
在 VSCode 控制台中你应该看到：

```bash
🔍 Cline debug mode activated
📤 [Anthropic Request] {
  model: "claude-sonnet-4-6",
  systemPromptLength: 1234,
  messagesCount: 2,
  toolsCount: 3
}
📥 [Anthropic Stream] Content started
✅ [Anthropic Response] {
  contentLength: 2345,
  tokensUsed: 450,
  executionTime: 1200
}
```

### 4. 分析日志文件
所有请求都会保存到：
- `./logs/YYYY-MM-DD.jsonl` - 完整的上下文日志

## 高级用法

### 条件调试
只记录特定模式的请求：

```typescript
if (messages.some(msg => msg.content.includes('motor'))) {
  DebugLogger.logLLMRequest(...);
}
```

### 性能分析
记录执行时间：

```typescript
const startTime = Date.now();
// ... 执行代码
console.log(`⏱️ Execution time: ${Date.now() - startTime}ms`);
```

### 错误追踪
记录详细的错误信息：

```typescript
try {
  // ... 调用代码
} catch (error) {
  DebugLogger.logError({
    error: error instanceof Error ? error.message : String(error),
    stack: error.stack,
    context: { messagesCount: messages.length }
  });
}
```

## 注意事项

1. **性能影响**：调试会增加 I/O 开销，生产环境建议关闭
2. **敏感信息**：检查日志是否包含 API keys
3. **存储空间**：定期清理旧的日志文件
4. **流式响应**：当前实现支持流式响应的实时记录

## 故障排除

### 调试未生效
1. 检查 `cline.debug.enabled` 是否设为 `true`
2. 查看控制台是否有初始化日志
3. 确认拦截器是否正确包装

### 日志文件未生成
1. 检查目录权限
2. 确认磁盘空间充足
3. 查看控制台是否有写入错误

### 性能问题
1. 降低日志级别
2. 禁用 raw request/response 记录
3. 定期清理日志文件

这样，您就可以在调试 F5 时看到真实的 Cline 请求流程了！