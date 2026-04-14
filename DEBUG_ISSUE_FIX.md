# 调试系统问题修复指南

## 问题分析

您遇到的问题是因为：
1. TypeScript 编译错误（76个错误）
2. 调试代码与现有类型不兼容
3. 编译失败导致调试代码无法执行

## 解决方案

### 步骤 1: 清理有问题的调试代码
已删除 `src/debug/` 目录中的所有文件，确保编译通过。

### 步骤 2: 验证编译
现在运行 `npm run watch` 应该没有编译错误了。

### 步骤 3: 启用调试的简单方法

#### 方法 A: 使用控制台日志（推荐）
在 `src/core/api/index.ts` 的开头添加：

```typescript
// 简单的调试日志
console.log('🔍 API system initialized');

// 在 DeepSeek handler 创建时添加日志
case "deepseek":
  console.log('🔍 Creating DeepSeek handler...');
  const handler = new DeepSeekHandler({...});
  console.log('✅ DeepSeek handler created');
  return handler;
```

#### 方法 B: 使用临时文件记录
创建 `src/core/api/debug-logger.js`（不参与 TypeScript 编译）：

```javascript
// 专门用于调试的简单日志器
module.exports = {
  log: function(type, data) {
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(__dirname, '../../logs');

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      type: type,
      data: data
    };

    fs.appendFileSync(path.join(logDir, 'api-debug.jsonl'),
      JSON.stringify(logEntry) + '\n');

    console.log(`🔍 [${type}]`, data);
  }
};
```

#### 方法 C: 修改 DeepSeek provider 直接添加日志
在 `src/core/api/providers/deepseek.ts` 的 `createMessage` 方法中添加：

```typescript
async *createMessage(systemPrompt: string, messages: ClineStorageMessage[], tools?: OpenAITool[]): ApiStream {
  const client = this.ensureClient()
  const model = this.getModel()

  // 添加调试日志
  console.log('🔍 DeepSeek Request:', {
    model: model.id,
    messagesCount: messages.length,
    systemPromptLength: systemPrompt?.length
  });

  // 原有的 API 调用逻辑...
}
```

### 步骤 4: 测试调试功能

#### 运行简单测试
```bash
node simple-debug.js
```

这会创建 `logs/` 目录并写入测试日志。

#### 在 VSCode 中查看
1. 按 F5 启动调试
2. 打开开发者工具（Ctrl+Shift+I）
3. 查看控制台输出
4. 检查 `logs/` 目录是否有文件

### 步骤 5: 预期的输出

成功后，您应该看到：

```
🔍 API system initialized
🔍 Creating DeepSeek handler...
✅ DeepSeek handler created
🔍 DeepSeek Request: { model: "deepseek-chat", messagesCount: 2 }
📁 Created logs directory
✅ Test log written to: logs/debug-test.jsonl
```

### 步骤 6: 手动触发日志

在 VSCode 开发者工具控制台中运行：

```javascript
// 手动记录调试信息
console.log('🔍 Debug test - PLC task started');
console.log('📝 Prompt: Create motor control function');
console.log('🤖 Waiting for DeepSeek response...');
```

## 下一步

一旦确认简单调试有效，我们可以：
1. 逐步添加更详细的日志
2. 实现真实的请求拦截
3. 添加日志文件管理

现在请先运行 `npm run watch` 确保编译通过，然后尝试 `node simple-debug.js` 测试基础功能。