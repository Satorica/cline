# Cline 调试系统控制指南

## 🎯 调试系统概览

Cline 调试系统提供完整的上下文追踪能力，让您在 F5 调试时看到真实的 LLM 请求和响应。

## 📋 支持的 Provider

- ✅ **DeepSeek** - 完整支持（包含缓存统计）
- ✅ **Anthropic** - 完整支持（流式响应）
- ✅ **OpenAI** - 完整支持
- ✅ **OpenRouter** - 完整支持
- ✅ **Claude Code** - 支持
- ✅ **Cline** - 支持

## 🔧 配置方法

### 1. VSCode 配置（推荐）

在 `settings.json` 中添加：

```json
{
  "cline.debug.enabled": true,
  "cline.debug.logLevel": "debug",
  "cline.debug.logDirectory": "./logs",
  "cline.debug.includeRawRequests": true,
  "cline.debug.includeRawResponses": true,
  "cline.debug.includeAgentContext": true,
  "cline.debug.includeToolMetadata": true,
  "cline.debug.maxLogFileSize": 10,
  "cline.debug.compressOldLogs": true
}
```

### 2. 代码初始化

在 `extension.ts` 中：

```typescript
import { DebugManager } from './src/debug/DebugManager';

// 在激活函数中
export function activate(context: vscode.ExtensionContext) {
  // 读取配置
  const debugConfig = vscode.workspace.getConfiguration('cline.debug');

  // 初始化调试管理器
  DebugManager.initialize({
    enabled: debugConfig.get('enabled', false),
    logLevel: debugConfig.get('logLevel', 'debug'),
    logDirectory: debugConfig.get('logDirectory', './logs'),
    includeRawRequests: debugConfig.get('includeRawRequests', true),
    includeRawResponses: debugConfig.get('includeRawResponses', true),
    includeAgentContext: debugConfig.get('includeAgentContext', true),
    includeToolMetadata: debugConfig.get('includeToolMetadata', true),
    maxLogFileSize: debugConfig.get('maxLogFileSize', 10),
    compressOldLogs: debugConfig.get('compressOldLogs', true),
  });
}
```

### 3. Provider 集成

在 `src/core/api/index.ts` 中：

```typescript
import { DebugManager } from '@/debug/DebugManager';

function createHandlerForProvider(
  apiProvider: string | undefined,
  options: Omit<ApiConfiguration, "apiProvider">,
  mode: Mode,
): ApiHandler {
  let handler: ApiHandler;

  switch (apiProvider) {
    case "deepseek":
      handler = new DeepSeekHandler({
        onRetryAttempt: options.onRetryAttempt,
        deepSeekApiKey: options.deepSeekApiKey,
        apiModelId: mode === "plan" ? options.planModeApiModelId : options.actModeApiModelId,
      });

      // 如果启用调试，自动包装
      if (DebugManager.getStatus().enabled) {
        const WrappedHandler = DebugManager.wrapProvider(DeepSeekHandler, 'deepseek');
        handler = new WrappedHandler({
          onRetryAttempt: options.onRetryAttempt,
          deepSeekApiKey: options.deepSeekApiKey,
          apiModelId: mode === "plan" ? options.planModeApiModelId : options.actModeApiModelId,
        });
      }

      return handler;

    case "anthropic":
      handler = new AnthropicHandler({
        onRetryAttempt: options.onRetryAttempt,
        apiKey: options.apiKey,
        anthropicBaseUrl: options.anthropicBaseUrl,
        apiModelId: mode === "plan" ? options.planModeApiModelId : options.actModeApiModelId,
        thinkingBudgetTokens: mode === "plan" ? options.planModeThinkingBudgetTokens : options.actModeThinkingBudgetTokens,
      });

      // Anthropic 包装器
      if (DebugManager.getStatus().enabled) {
        const WrappedHandler = DebugManager.wrapProvider(AnthropicHandler, 'anthropic');
        handler = new WrappedHandler({
          onRetryAttempt: options.onRetryAttempt,
          apiKey: options.apiKey,
          anthropicBaseUrl: options.anthropicBaseUrl,
          apiModelId: mode === "plan" ? options.planModeApiModelId : options.actModeApiModelId,
          thinkingBudgetTokens: mode === "plan" ? options.planModeThinkingBudgetTokens : options.actModeThinkingBudgetTokens,
        });
      }

      return handler;

    // ... 其他 provider
  }
}
```

## 🎮 控制方式

### 1. 命令面板

调试系统提供 VSCode 命令，可通过 Ctrl+Shift+P 访问：

- `cline.debug.toggle` - 切换调试模式
- `cline.debug.enable` - 启用调试
- `cline.debug.disable` - 禁用调试
- `cline.debug.showStatus` - 显示当前状态
- `cline.debug.flushLogs` - 强制刷新日志

### 2. 代码控制

```typescript
// 检查状态
const status = DebugManager.getStatus();
console.log('Debug enabled:', status.enabled);

// 手动切换
DebugManager.toggle();

// 手动记录事件
DebugManager.logEvent({
  type: 'tool_call',
  data: {
    toolName: 'custom-tool',
    input: { query: 'test' },
    output: { result: 'success' },
    executionTimeMs: 150,
    success: true
  }
});
```

### 3. 环境变量

```bash
# 启用调试
export CLINE_DEBUG=true

# 设置日志级别
export CLINE_LOG_LEVEL=debug

# 自定义日志目录
export CLINE_LOG_DIR=/custom/path/logs
```

## 🔍 查看调试信息

### 1. 控制台输出

当您在 VSCode 中按 F5 调试时，会看到：

```bash
🔍 DebugManager initialized with config: { enabled: true, ... }
📖 Debug Usage Guide:
...

📤 [DeepSeek Request] {
  model: "deepseek-chat",
  messagesCount: 2,
  toolsCount: 0
}

📥 [DeepSeek Stream] Content started
📊 [DeepSeek Usage] {
  inputTokens: 150,
  outputTokens: 300,
  cacheReadTokens: 50,
  cacheWriteTokens: 100
}

✅ [DeepSeek Response] {
  contentLength: 1500,
  tokensUsed: 450,
  executionTime: 1200
}
```

### 2. 日志文件

所有请求保存到 `./logs/YYYY-MM-DD.jsonl`：

```json
{"type":"llm_request","timestamp":"2026-04-14T10:30:00.000Z","sessionId":"session_123","model":"deepseek-chat","systemPrompt":"You are a PLC expert...","conversationHistory":[...],"finalPrompt":"Create motor control code...","temperature":0.7,"maxTokens":2000,"otherParams":{"stream":true,"provider":"deepseek"}}

{"type":"llm_response","timestamp":"2026-04-14T10:30:01.200Z","sessionId":"session_123","content":"FUNCTION_BLOCK MotorControl...","tokensUsed":450,"inputTokens":150,"outputTokens":300,"usageMetadata":{"input_tokens":150,"output_tokens":300,"total_tokens":450,"cache_read_tokens":50,"cache_write_tokens":100,"total_cost":0.00045}}

{"type":"tool_call","timestamp":"2026-04-14T10:30:02.000Z","sessionId":"session_123","toolName":"rag","input":{"query":"motor control examples"},"output":{"examples":[...]},"executionTimeMs":1500,"success":true,"agentContext":{"taskDescription":"Create motor control code","reasoning":"Used RAG to find examples"},"toolMetadata":{"provider":"pinecone","version":"1.0.0","timeout":30000,"retries":0}}
```

## 🎨 高级功能

### 1. 条件调试

```typescript
// 只记录特定任务的调试信息
if (taskId === 'motor_control_001') {
  DebugManager.enable();
}
```

### 2. 性能分析

```typescript
const stats = DebugManager.getPerformanceStats();
console.log('内存使用:', stats.memoryUsage);
console.log('运行时间:', stats.uptime);
```

### 3. 自定义事件

```typescript
// 记录自定义事件
DebugManager.logEvent({
  type: 'final_output',
  data: {
    taskId: 'custom_task',
    code: '...',
    metadata: {
      totalTokensUsed: 450,
      totalToolCalls: 2,
      executionTimeMs: 3200
    },
    validation: {
      syntaxCheck: 'passed',
      compilation: 'passed'
    }
  }
});
```

## ⚙️ 配置详解

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enabled` | boolean | false | 是否启用调试 |
| `logLevel` | string | 'debug' | 日志级别：debug, info, warn, error |
| `logDirectory` | string | './logs' | 日志文件目录 |
| `includeRawRequests` | boolean | true | 是否包含原始请求 |
| `includeRawResponses` | boolean | true | 是否包含原始响应 |
| `includeAgentContext` | boolean | true | 是否包含 agent 上下文 |
| `includeToolMetadata` | boolean | true | 是否包含工具元数据 |
| `maxLogFileSize` | number | 10 | 日志文件最大大小（MB） |
| `compressOldLogs` | boolean | true | 是否压缩旧日志 |

## 🔍 故障排除

### 1. 调试未启用

- 检查 `cline.debug.enabled` 是否为 `true`
- 查看 VSCode 控制台是否有初始化日志
- 确认代码中正确调用了 `DebugManager.initialize()`

### 2. 日志文件未生成

- 检查目录权限
- 确认磁盘空间充足
- 查看控制台是否有错误信息

### 3. Provider 未被拦截

- 确认 provider 在支持列表中
- 检查是否正确调用了 `DebugManager.wrapProvider()`
- 查看控制台是否有包装日志

### 4. 性能问题

- 降低 `logLevel`
- 禁用 `includeRawRequests` 和 `includeRawResponses`
- 定期清理日志文件

## 🚀 快速开始

1. **启用调试**：
   ```json
   "cline.debug.enabled": true
   ```

2. **重启插件**：Ctrl+Shift+P → "Developer: Reload Window"

3. **启动调试**：按 F5

4. **查看输出**：打开开发者工具控制台

5. **分析日志**：检查 `./logs` 目录

现在您就可以在调试时看到完整的 DeepSeek 请求和响应了！