# 品牌替换指南

本文档说明如何将 Cline 的品牌名称和图标替换为你自己的品牌，以及如何为 PLC ST 代码 Agent 开发准备目录结构。

---

## 一、图标替换

### 1.1 Webview 内的 Logo 组件（React SVG）

这些文件是 TypeScript 写的 React SVG 组件，直接在 UI 里渲染机器人图标。

| 文件 | 用途 | 使用位置 |
|------|------|----------|
| `webview-ui/src/assets/ClineLogoWhite.tsx` | WelcomeView 欢迎页白色 Logo | `WelcomeView.tsx` |
| `webview-ui/src/assets/ClineLogoBlack.tsx` | 黑色 Logo（备用） | 目前未主动使用 |
| `webview-ui/src/assets/ClineLogoVariable.tsx` | 主界面 Home 页 Logo，跟随 VSCode 主题变色 | `HomeHeader.tsx` |
| `webview-ui/src/assets/ClineLogoSanta.tsx` | 12 月专用节日版 Logo | `HomeHeader.tsx` |
| `webview-ui/src/assets/ClineCompactIcon.tsx` | 16x16 紧凑图标 | 部分地方引用 |

**替换方法：**

每个文件的结构如下：
```tsx
// ClineLogoWhite.tsx 示例
const ClineLogoWhite = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 47 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* 这里是机器人的 SVG path */}
  </svg>
)
export default ClineLogoWhite
```

你只需要：
1. 用你的品牌 SVG 设计工具（Figma、Illustrator 等）导出 SVG
2. 将 `<svg>` 内部的 path/shape 替换掉
3. 文件名和导出名保持不变（`ClineLogoWhite`），这样不需要修改其他引用文件

> 💡 建议先替换 `ClineLogoVariable.tsx`（主页显示）和 `ClineLogoWhite.tsx`（欢迎页显示），其他的可以后续再做。

### 1.2 VS Code 扩展图标（Activity Bar）

| 文件 | 用途 |
|------|------|
| `assets/icons/icon.png` | 扩展市场和扩展管理器里的图标（128×128 PNG）|
| `assets/icons/icon.svg` | Activity Bar（左侧边栏）图标 |
| `assets/icons/cline-bot.svg` | 自定义字体图标源文件（IcoMoon 生成） |
| `assets/icons/cline-bot.ttf` | 字体图标 TTF 文件 |
| `assets/icons/cline-bot.woff` | 字体图标 WOFF 文件 |

**替换方法：**

**Activity Bar 图标（最重要）：**
1. 准备一个 `icon.svg`，建议黑色 `#24292F`，viewBox `0 0 92 96`
2. 直接替换 `assets/icons/icon.svg` 和 `assets/icons/icon.png`

**字体图标（用于 VS Code 命令图标）：**
1. 去 [IcoMoon App](https://icomoon.io/app/) 上传你的 SVG
2. 导出 Font，得到 `.ttf` / `.woff` / `.svg` 三个文件
3. 替换 `assets/icons/` 下对应的三个文件
4. 在 `package.json` 的 `contributes.icons` 中字体引用路径保持不变，无需改

---

## 二、品牌名称替换

### 2.1 VS Code 扩展 Manifest（`package.json`）

这是影响范围最广的文件，修改以下字段：

```json
{
  "name": "你的扩展ID",           // line 2，扩展唯一标识符（小写，用连字符）
  "displayName": "你的品牌名",    // line 3，VS Code 里显示的名称
  "description": "...",           // line 4，扩展描述
  "author": {
    "name": "你的公司名"          // line 15
  }
}
```

Activity Bar 标题（侧边栏鼠标悬停时的名称）：
```json
// 大约 line 119
"title": "你的品牌名"
```

### 2.2 Webview UI 中的 "Cline" 文字

**欢迎页（最直接可见）：**

文件：`webview-ui/src/components/welcome/WelcomeView.tsx`
```tsx
// 修改这行
<h2 className="text-lg font-semibold">Hi, I'm Cline</h2>
// 改为
<h2 className="text-lg font-semibold">Hi, I'm 你的名字</h2>
```

**Settings 里的 About 页面 Tooltip：**

文件：`webview-ui/src/components/settings/SettingsView.tsx`
```tsx
tooltipText: "About Cline",   // 改为你的品牌名
headerText: "About",
```

**Chat 对话消息中的动作描述（量最多）：**

文件：`webview-ui/src/components/chat/ChatRow.tsx`

这个文件里有 20+ 处类似这样的字符串：
```
"Cline wants to edit this file:"
"Cline is creating patches to edit this file:"
"Cline wants to execute this command:"
...
```

**推荐做法：** 提取为常量，统一管理：
```tsx
// 在 ChatRow.tsx 顶部或单独 constants 文件中定义
const AGENT_NAME = "你的Agent名"

// 然后替换所有 "Cline" 为 AGENT_NAME
`${AGENT_NAME} wants to edit this file:`
```

同样需要修改的还有：
- `webview-ui/src/components/chat/BrowserSessionRow.tsx` - 浏览器操作描述
- `webview-ui/src/components/chat/SubagentStatusRow.tsx` - 子 Agent 操作描述
- `webview-ui/src/components/chat/chat-view/components/messages/ToolGroupRenderer.tsx` - 工具摘要描述

**Settings 功能开关标签：**
文件：`webview-ui/src/components/settings/sections/FeatureSettingsSection.tsx`
```tsx
label: "Cline Web Tools"  // 改为你的品牌名
```

---

## 三、PLC ST Agent 开发目录结构建议

在项目根目录下新建以下结构：

```
cline/
├── plc-agent/                        # PLC Agent 主目录
│   ├── mcp-servers/                  # MCP 服务器实现
│   │   ├── st-formatter/             # ST 代码格式化工具
│   │   │   ├── index.ts
│   │   │   └── package.json
│   │   ├── plc-linter/               # ST 语法检查工具
│   │   │   ├── index.ts
│   │   │   └── package.json
│   │   └── iec-library/              # IEC 61131-3 标准库查询
│   │       ├── index.ts
│   │       └── package.json
│   ├── prompts/                      # ST 代码生成专用 prompt
│   │   ├── system-prompt-plc.md      # PLC 专用系统 prompt
│   │   └── examples/                 # ST 代码示例库
│   │       ├── function-blocks/
│   │       └── programs/
│   ├── tools/                        # 你收集的小工具 wrapper
│   │   ├── codesys-export/           # 导出 CoDeSys 格式
│   │   └── tia-portal-import/        # TIA Portal 导入工具
│   └── README.md
├── docs/                             # 本目录，开发文档
│   ├── rebranding-guide.md           # 本文件
│   └── mcp-server-guide.md           # MCP 服务器开发指南（下面写）
└── ...                               # 原有 Cline 代码
```

---

## 四、MCP 服务器开发快速入门

### 4.1 基本结构

一个 MCP 服务器是一个独立的 Node.js 进程，通过 stdio 与 Cline/Agent 通信：

```typescript
// plc-agent/mcp-servers/st-formatter/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

const server = new Server(
  { name: "st-formatter", version: "1.0.0" },
  { capabilities: { tools: {} } }
)

// 注册工具
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "format_st_code",
      description: "格式化 IEC 61131-3 ST（结构化文本）代码",
      inputSchema: {
        type: "object",
        properties: {
          code: { type: "string", description: "ST 源代码" },
          style: { type: "string", enum: ["codesys", "tia"], description: "目标格式风格" }
        },
        required: ["code"]
      }
    }
  ]
}))

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "format_st_code") {
    const { code, style } = request.params.arguments as any
    const formatted = formatSTCode(code, style)
    return { content: [{ type: "text", text: formatted }] }
  }
})

// 启动
const transport = new StdioServerTransport()
await server.connect(transport)
```

### 4.2 在 Cline 中注册 MCP 服务器

在 VS Code 的 Cline MCP 配置中（`Configure` 标签页）添加：

```json
{
  "mcpServers": {
    "st-formatter": {
      "command": "node",
      "args": ["/path/to/plc-agent/mcp-servers/st-formatter/dist/index.js"],
      "env": {}
    },
    "plc-linter": {
      "command": "node",
      "args": ["/path/to/plc-agent/mcp-servers/plc-linter/dist/index.js"]
    }
  }
}
```

### 4.3 ST 代码 Agent 推荐工具列表

根据 PLC 开发场景，建议实现以下 MCP 工具：

| 工具名 | 功能 |
|--------|------|
| `format_st_code` | ST 代码格式化（缩进、注释规范化） |
| `validate_st_syntax` | IEC 61131-3 语法检查，返回错误行号 |
| `lookup_iec_function` | 查询标准功能块文档（如 TON、CTU、RS 等） |
| `convert_ladder_to_st` | 梯形图逻辑描述 → ST 代码（文字描述转换） |
| `generate_fb_template` | 生成功能块（FB）模板，含 VAR_INPUT/OUTPUT/IN_OUT |
| `check_plc_safety` | 检查常见安全隐患（如无限循环、未初始化变量） |

---

## 五、操作优先级建议

| 优先级 | 任务 | 难度 |
|--------|------|------|
| 🔴 高 | 替换 `ClineLogoVariable.tsx` 和 `ClineLogoWhite.tsx` 为你的 Logo SVG | 低 |
| 🔴 高 | 修改 `package.json` 的 `displayName` | 极低 |
| 🔴 高 | 修改 `WelcomeView.tsx` 的 "Hi, I'm Cline" | 极低 |
| 🟡 中 | 替换 `assets/icons/icon.png` 和 `icon.svg` | 低（需要设计资源） |
| 🟡 中 | `ChatRow.tsx` 中的 "Cline" 文字批量替换 | 低（全局替换） |
| 🟢 低 | 字体图标 `cline-bot.ttf/woff` 替换 | 中（需要 IcoMoon 操作） |
| 🟢 低 | Walkthrough 欢迎教程内容替换 | 低 |
