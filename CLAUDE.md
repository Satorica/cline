
# PLC Agent Instrumentation & Benchmark Task

**Last Updated:** 2026-04-14

---

### 补充要求 📝

#### 1. 完全一致性保证
- **严格确保**: 测试环境与已打包的 Cline 结果**100%一致**
- **无侵入性**: Instrumentation 层不能对原有 agent 产生任何副作用
- **输出验证**: 生成的 ST 代码必须与正常模式完全相同
- **性能隔离**: Debug 模式仅在开启时生效，关闭时零性能开销

#### 2. 完整上下文追踪 🔍
- **LLM 请求完整记录**:
  ```json
  {
    "type": "llm_request",
    "timestamp": "...",
    "model": "...",
    "system_prompt": "...",
    "conversation_history": [...],
    "final_prompt": "...",
    "temperature": ...,
    "max_tokens": ...,
    "other_params": {...}
  }
  ```

- **LLM 响应完整记录**:
  ```json
  {
    "type": "llm_response",
    "timestamp": "...",
    "content": "...",
    "tokens_used": ...,
    "input_tokens": ...,
    "output_tokens": ...,
    "citations": [...],
    "usage_metadata": {...},
    "raw_response": "..."
  }
  ```

#### 3. Agent 行为追踪
- **决策路径**: 记录 agent 的关键决策点
- **状态变化**: 记录 agent 内部状态的变更
- **工具选择逻辑**: 记录为什么选择某个工具
- **错误处理**: 记录错误处理流程和恢复策略

## Background

We are building a PLC code generation agent based on the Cline framework (VSCode extension).
We need to extend the current system to support:

1. Debug / observability (LLM + tool tracing)
2. Benchmark / batch execution (headless-like evaluation)

The goal is NOT to change core agent logic, but to **add instrumentation and evaluation capabilities**.

---

## Task 1: Add Debug / Trace Mode

### Goal

Introduce a `DEBUG_MODE` that logs:

1. LLM provider requests
2. LLM responses
3. Tool calls (name, input, output)
4. Final generated code

---

### Requirements

#### 1. LLM Request Logging

Wrap the LLM provider call (e.g. Claude/OpenAI endpoint):

Log structure:

```json
{
  "type": "llm_request",
  "timestamp": "...",
  "model": "...",
  "prompt": "...",
  "temperature": ...
}
```

---

#### 2. LLM Response Logging

```json
{
  "type": "llm_response",
  "timestamp": "...",
  "content": "...",
  "tokens": ...
}
```

---

#### 3. Tool Call Logging

Wrap all tool invocations with complete context:

```json
{
  "type": "tool_call",
  "timestamp": "...",
  "tool_name": "...",
  "input": {...},
  "output": {...},
  "execution_time_ms": ...,
  "success": true,
  "error": null,
  "agent_context": {
    "task_description": "...",
    "conversation_history": [...],
    "reasoning": "..."
  },
  "tool_metadata": {
    "provider": "...",
    "version": "...",
    "timeout": ...,
    "retries": ...
  }
}
```

---

#### 4. Output Logging

Save final generated ST code with complete context:

```json
{
  "type": "final_output",
  "timestamp": "...",
  "task_id": "...",
  "code": "...",
  "metadata": {
    "total_tokens_used": ...,
    "total_tool_calls": ...,
    "execution_time_ms": ...,
    "llm_calls": 0,
    "agent_version": "...",
    "debug_session_id": "..."
  },
  "validation": {
    "syntax_check": "passed|failed",
    "compilation": "passed|failed|null",
    "errors": []
  }
}
```

---

#### 5. Storage

* Store logs as JSONL
* Path: `./logs/{task_id}.jsonl`
* Append mode

---

#### 6. Toggle

Add config:

```ts
DEBUG_MODE = true | false
```

When false → no logging overhead

---

## Task 2: Benchmark Runner

### Goal

Create a batch evaluation system that runs multiple tasks automatically.

---

### Input Format

Tasks stored as JSON:

```json
{
  "id": "task_001",
  "prompt": "Button I0.0 controls motor Q0.0",
  "required_tools": ["rag", "compile"]
}
```

---

### Directory Structure

```
bench/
  tasks/
    task_001.json
    task_002.json
  outputs/
  logs/
  results.csv
```

---

### Runner Behavior

For each task:

1. Load task
2. Call agent with prompt
3. Save generated code → `outputs/{task_id}.st`
4. Save debug logs → `logs/{task_id}.jsonl`
5. (Optional) call compile tool
6. Record result

---

### Result Format (CSV)

```csv
task_id,success,compile_error,tool_calls
```

---

### Minimal API

Expose a function:

```ts
async function runTask(task: Task): Promise<Result>
```

And batch runner:

```ts
async function runBenchmark(taskDir: string)
```

---

## Constraints

* DO NOT heavily refactor Cline core
* Prefer wrapper / middleware approach
* Keep compatibility with VSCode usage
* All features should be optional (non-breaking)

---

## Expected Output

1. **Debug logger module** - 支持完整上下文追踪的无侵入式日志系统
2. **Tool wrapper** - 保留所有工具元数据和执行上下文
3. **Benchmark runner script** - 批量执行并生成详细报告
4. **Example task JSON** - 包含各种场景的测试用例
5. **Example logs** - 完整的上下文日志样例
6. **Consistency validation suite** - 确保测试与生产环境完全一致的验证套件

---

## Nice to Have (if time permits)

* Add "tool sequence" extraction from logs
* Add simple metrics:

  * number of tool calls
  * whether compile was called
* CLI command:

```bash
node runBenchmark.js bench/tasks
```

---

## Key Principle

We are transforming the agent from:

"interactive coding assistant"

into:

"observable and evaluatable system"

Focus on engineering robustness, not prompt tuning.

---

### 成功标准 ✅

1. **完全一致性**: Debug 模式开启时行为与正常模式完全一致
2. **零侵入性**: Instrumentation 层不对核心功能产生任何影响
3. **完整性**: 日志包含 agent 与 provider 交互的所有关键数据
4. **可复现性**: 基于日志可完整重现每次执行过程
5. **向后兼容**: 保持与现有 Cline 扩展的完全兼容
