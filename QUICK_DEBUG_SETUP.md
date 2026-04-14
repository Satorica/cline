# 快速调试设置指南

## 问题诊断

您现在按 F5 调试时没有看到 logs，这是因为调试系统虽然已创建，但还没有完全集成。让我们一步步解决：

## 步骤 1: 立即启用调试

### A. 创建 VSCode 工作区配置

在项目根目录创建 `.vscode/settings.json`：

```json
{
  "cline.debug.enabled": true
}
```

### B. 添加临时初始化代码

在 `extension.ts` 或主入口文件的开头添加：

```typescript
// 临时添加 - 用于调试
import { DebugManager } from './src/debug/DebugManager';

// 立即初始化调试系统
DebugManager.initialize({
  enabled: true,
  logLevel: 'debug',
  logDirectory: './logs'
});

console.log('🔍 Debug system initialized!');
```

## 步骤 2: 验证集成

我们已经完成了以下修改：

1. ✅ 在 `src/core/api/index.ts` 中导入了 DebugManager
2. ✅ 包装了 DeepSeek handler
3. ✅ 创建了调试管理器

## 步骤 3: 启动调试

1. **重启 VSCode**：Ctrl+Shift+P → "Developer: Reload Window"
2. **检查控制台**：应该看到 "🔍 Debug system initialized!"
3. **启动调试**：按 F5
4. **观察日志**：检查是否出现：
   ```
   🔍 Auto-wrapping DeepSeek handler for debug mode
   📤 [DeepSeek Request] {...}
   ```

## 步骤 4: 手动测试（如果自动不工作）

创建一个测试文件 `test-debug.js`：

```javascript
const { DebugManager } = require('./src/debug/DebugManager');

// 启用调试
DebugManager.enable();

// 模拟请求
DebugManager.logEvent({
  type: 'llm_request',
  data: {
    model: 'deepseek-chat',
    finalPrompt: 'Test prompt',
    systemPrompt: 'System prompt'
  }
});

console.log('Test debug event logged');
```

## 步骤 5: 检查日志目录

运行以下命令检查：

```bash
# 在项目根目录执行
dir logs
# 或
ls -la logs
```

应该看到类似 `2026-04-14.jsonl` 的文件。

## 故障排除

### 如果还是没有日志：

1. **检查配置文件位置**：
   - 确保在项目根目录的 `.vscode/settings.json`
   - 不是用户全局配置

2. **检查修改是否生效**：
   - 确认 `src/core/api/index.ts` 中有 DebugManager 导入
   - 确认 deepseek case 中有包装代码

3. **手动触发**：
   - 在代码中添加 `console.log('Debug status:', DebugManager.getStatus())`

4. **检查错误**：
   - 打开开发者工具（Ctrl+Shift+I）
   - 查看控制台是否有错误信息

## 快速命令

在项目根目录执行：

```bash
# 创建配置文件
mkdir -p .vscode
echo '{"cline.debug.enabled": true}' > .vscode/settings.json

# 检查日志目录
mkdir -p logs

# 运行初始化脚本
node debug-init.js
```

现在重新启动调试，应该能看到调试信息了！