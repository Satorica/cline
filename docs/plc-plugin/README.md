# NeoIDE

> VS Code 扩展，为 PLC 开发提供完整的 IDE 功能

## 简介

NeoIDE 是一个 VS Code 扩展，为 PLC（可编程逻辑控制器）开发提供完整的 IDE 功能。支持 IEC 61131-3 Structured Text (ST) 语言编程。

### 核心功能

| 功能 | 说明 |
|:---|:---|
| **项目管理** | 创建、打开、配置 PLC 工程 |
| **程序编辑** | ST 语言语法高亮、代码片段 |
| **编译构建** | ST → C → .so 完整编译链 |
| **目标连接** | gRPC/RESTful 双协议支持 |
| **下装运行** | 程序下装、运行控制、监控 |
| **工具链管理** | 自动检测、下载、安装编译工具 |

## 快速开始

### 安装

```bash
# 克隆仓库
git clone <repo-url>
cd neoide

# 安装依赖
npm install

# 开发模式
npm run watch

# 或按 F5 在 VS Code 中启动调试
```

### 构建

```bash
# 生产构建
npm run package

# 打包为 .vsix
npx @vscode/vsce package
```

## 使用

1. 在 VS Code 中安装扩展
2. 点击左侧 PLC 开发图标
3. 创建或打开 PLC 工程
4. 编写 ST 程序
5. 构建并下装到目标设备

## 文档

| 文档 | 说明 |
|:---|:---|
| [AGENTS.md](./AGENTS.md) | Code Agent 项目上下文（开发必读） |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 架构设计文档 |
| [docs/DEV_GUIDE.md](./docs/DEV_GUIDE.md) | 开发指南 |
| [docs/USER_GUIDE.md](./docs/USER_GUIDE.md) | 用户手册 |
| [docs/CODE_REVIEW_CHECKLIST.md](./docs/CODE_REVIEW_CHECKLIST.md) | 代码审查清单 |

## 技术栈

- **Runtime**: Node.js (VS Code Extension Host)
- **Language**: TypeScript (Strict Mode)
- **DI Framework**: tsyringe
- **Communication**: gRPC + RESTful API

## 项目结构

```
neoide/
├── src/
│   ├── core/           # 基础设施层
│   ├── modules/        # 业务模块层
│   └── extension.ts    # 扩展入口
├── resources/          # 静态资源
│   ├── runtime/        # 运行时库
│   └── toolchain/      # 编译工具链
├── templates/          # Webview HTML 模板
└── syntaxes/           # ST 语法高亮
```

## 许可证

MIT
