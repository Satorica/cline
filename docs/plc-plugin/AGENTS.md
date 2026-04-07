# AGENTS.md - Code Agent 项目上下文

> 本文件为 LLM Code Agent 提供项目核心上下文，确保开发风格一致、架构规范遵循。

---

## 1. 项目概述

**NeoIDE** 是一个 VS Code 扩展，为 PLC（可编程逻辑控制器）开发提供完整的 IDE 功能。支持 IEC 61131-3 Structured Text (ST) 语言编程。

### 技术栈

| 领域 | 技术选型 |
|:---|:---|
| Runtime | Node.js (VS Code Extension Host) |
| Language | TypeScript (Strict Mode) |
| DI Framework | tsyringe |
| Communication | gRPC + RESTful API |
| UI - TreeView | VS Code TreeDataProvider API |
| UI - Webview | HTML + JavaScript |

### 核心功能

1. **项目管理** - 创建、打开、配置 PLC 工程
2. **程序编辑** - ST 语言语法高亮、代码片段
3. **编译构建** - ST → C → .so 完整编译链
4. **目标连接** - gRPC/RESTful 双协议支持
5. **下装运行** - 程序下装、运行控制、监控
6. **工具链管理** - 自动检测、下载、安装编译工具

---

## 2. 架构约束（强制）

### 2.1 目录结构

```
src/
├── api/                     # Extension API 层（供外部插件调用）
│   ├── plc-api.types.ts    # API 类型定义
│   ├── plc-api.impl.ts     # API 实现
│   └── index.ts            # 导出入口
│
├── core/                    # 基础设施层（禁止业务逻辑）
│   ├── base/                # 基类定义
│   │   ├── base-tree-item.ts
│   │   ├── base-webview.manager.ts
│   │   ├── base.command.ts
│   │   └── base.repo.ts
│   ├── models/              # 公共类型定义
│   ├── di-container.ts      # tsyringe 容器导出
│   ├── extension-context.ts # 扩展上下文管理
│   ├── plc-config.ts        # 全局配置常量
│   ├── plc-event-bus.ts     # 事件总线
│   ├── plc-grpc-client.ts   # gRPC 客户端
│   ├── plc-restful-client.ts# RESTful 客户端
│   └── proto/               # Protobuf 定义
│
├── modules/                 # 业务领域层
│   ├── <feature>/           # 每个功能一个模块
│   │   ├── commands/        # VS Code 命令注册
│   │   ├── services/        # 业务逻辑服务
│   │   ├── repositories/    # 数据持久化
│   │   ├── models/          # 类型/接口定义
│   │   ├── views/           # UI 组件
│   │   │   ├── tree/        # TreeDataProvider
│   │   │   └── webview/     # WebviewPanel
│   │   └── <feature>.module.ts  # DI 注册入口
│
└── extension.ts             # 扩展入口

### 2.2 分层依赖规则（强制）

```
┌─────────────────────────────────────────┐
│  extension.ts (入口)                     │
│  - 模块注册、命令初始化、事件订阅          │
│  - 返回 PlcIdeApi 实例                    │
└───────────────────┬─────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌─────────┐   ┌──────────┐   ┌──────────┐
│ commands│   │  views/  │   │  models/ │
└────┬────┘   └────┬─────┘   └──────────┘
     │             │
     └──────┬──────┘
            ▼
      ┌──────────┐
      │ services │  ← 业务逻辑，无 UI 依赖
      └────┬─────┘
           ▼
      ┌──────────────┐
      │ repositories │  ← 数据持久化
      └──────────────┘

┌─────────────────────────────────────────┐
│  api/ (Extension API 层)                │
│  - PlcIdeApi 接口定义                    │
│  - PlcIdeApiImpl 实现（调用 Service）     │
│  - 对外暴露给外部插件使用                  │
└─────────────────────────────────────────┘

规则：
- modules → core：允许
- commands → services：允许
- views → services：允许
- services → repositories：允许
- api → services：允许（通过 DI 容器）
- 模块间横向依赖：禁止
```

### 2.3 依赖注入规范

每个模块通过 `*.module.ts` 注册服务：

```typescript
// src/modules/<feature>/<feature>.module.ts
import { container } from '../../core/di-container';

export function register<Feature>Module(): void {
    container.register(<Feature>Repository, { useClass: <Feature>Repository });
    container.registerSingleton(<Feature>Service);
}

// 导出公共 API
export { <Feature>Service } from './services/<feature>.service';
export { <Feature>Commands } from './commands/<feature>.command';
```

服务注入示例：

```typescript
@injectable()
export class AxisService {
    constructor(
        private axisRepo: AxisRepository
    ) {}
}
```

### 2.4 事件驱动通信

模块间通过 `PlcEventBus` 通信，避免横向依赖：

```typescript
// 发布事件
plcEventBus.emit(PlcEvent.AXIS_INFO_SAVED, this.axes);

// 订阅事件
plcEventBus.on(PlcEvent.AXIS_INFO_LOADED, (data) => { ... });
```

---

## 3. 编码规范（强制）

### 3.1 类型安全

```typescript
// 禁止 any
// ❌ function process(data: any) { ... }

// ✅ 使用 interface
interface AxisConfig {
    id: number;
    name: string;
}
function process(data: AxisConfig) { ... }

// ✅ 未知类型使用 unknown + 类型收窄
function process(data: unknown) {
    if (typeof data === 'object' && data !== null) {
        // ...
    }
}
```

### 3.2 异步 I/O

```typescript
// 禁止同步阻塞
// ❌ const data = fs.readFileSync(path);

// ✅ 使用异步 API
const data = await fs.promises.readFile(path, 'utf-8');

// ✅ 长任务使用进度提示
await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: '构建中' },
    async (progress) => {
        progress.report({ message: '编译中...', increment: 25 });
        // ...
    }
);
```

### 3.3 UI 与逻辑分离

```typescript
// ❌ View 层包含业务逻辑
class AxisWebviewManager {
    async onSave(data: unknown) {
        if (!data.name) { ... }
        fs.writeFileSync(...);
    }
}

// ✅ 逻辑下沉到 Service
class AxisWebviewManager {
    constructor(private axisService: AxisService) {}
    
    async onSave(data: AxisInfo) {
        this.axisService.updateAxis(data.id, data);
    }
}
```

---

## 4. 业务模块速查

| 模块 | 职责 | 关键文件 |
|:---|:---|:---|
| `project` | 项目管理、脚手架创建 | `project.service.ts`, `project.repo.ts` |
| `program` | 程序块管理 (PRG/FB/FC) | `program.service.ts` |
| `task` | 任务配置 | `task.service.ts` |
| `axis` | 轴参数配置 | `axis.service.ts` |
| `global` | 全局变量管理 | `global.service.ts` |
| `io` | I/O 配置 | `io.service.ts` |
| `builder` | 编译构建 (ST→C→.so) | `builder.service.ts`, `matiec-runner.service.ts` |
| `tarmgr` | 目标设备管理、连接 | `target.service.ts`, `plc-grpc-client.ts`, `plc-restful-client.ts` |
| `toolmgr` | 工具链管理 | `toolchain.service.ts` |
| `libmgr` | 系统库管理 | `library.service.ts` |

---

## 5. 关键实现细节

### 5.1 双协议连接

项目支持 **gRPC** 和 **RESTful** 两种连接方式：

```typescript
// src/modules/tarmgr/models/target.interface.ts
export enum PlcConnectionType {
    GRPC = "grpc",
    RESTFUL = "restful",
}

// 连接时根据类型创建客户端
if (target.type === PlcConnectionType.RESTFUL) {
    this.restfulClient = new PlcRestfulClient(target.host, target.port);
} else {
    this.grpcClient = new PlcGrpcClient(target.host, target.port, extensionPath);
}
```

### 5.2 编译流程

```
ST Files → StMerger → plc.st → MatIEC → *.c → Post-tools → *.c → CMake/Ninja → libplc.so
           (合并)             (转译)     (后处理)           (编译)
```

四阶段由 `BuilderService` 协调：
1. `StMergerService` - 合并 ST 文件
2. `MatiecRunner` - ST → C 转译
3. `MidwareRunner` - C 代码后处理
4. `CMakeRunner` - CMake/Ninja 构建

### 5.3 工具链管理

工具链通过 `resources/toolchain/toolchain-registry.json` 注册：

```json
{
    "toolchains": [
        { "id": "matiec", "name": "MatIEC Compiler", "required": true },
        { "id": "cmake", "name": "CMake", "required": true },
        { "id": "ninja", "name": "Ninja Build", "required": true },
        { "id": "aarch64-none-linux-gnu", "name": "ARM GNU Toolchain", "required": true },
        { "id": "post-tools", "name": "PLC Post-Processing Tools", "required": true }
    ]
}
```

`ToolchainService` 提供：
- `getStatusReport()` - 检测所有工具链状态
- `install(toolchainId)` - 安装单个工具链
- `installAllRequired()` - 安装所有必需工具链
- `checkAndPromptInstall()` - 启动时检查并提示安装

### 5.4 系统库加载

系统库位于 `resources/runtime/sys_libs/`，每个库包含 `manifest.json`：

```json
{
    "id": "sys.standard",
    "version": "1.0.0",
    "type": "system",
    "artifacts": {
        "iec": { "definitions": ["defs/*.txt"] },
        "native": { "includeDirs": ["include/*.h"], "staticLibs": ["lib/*.a"] }
    }
}
```

`LibraryService` 负责加载库定义供 MatIEC 编译使用。

---

## 6. 开发命令

```bash
# 安装依赖
npm install

# 开发模式编译（watch）
npm run watch

# 生产构建
npm run package

# 代码检查
npm run lint

# 测试
npm run test

# 启动调试（F5）
# 在 VS Code 中按 F5 启动扩展开发宿主
```

---

## 6.1 Extension API

NeoIDE 通过 `vscode.extensions.getExtension().exports` 暴露公共 API，供外部插件（如 AI Agent）调用。

### API 层架构

```
src/api/
├── plc-api.types.ts    # API 类型定义（复用模块类型）
├── plc-api.impl.ts     # PlcIdeApiImpl 实现类
└── index.ts            # 导出入口
```

### API 列表

| 方法 | 说明 |
|:---|:---|
| `getProjectStatus()` | 获取项目状态（是否加载、工具链就绪、连接状态） |
| `getPlcConfig(type)` | 获取配置（Axis/Task/GlobalVar/IO） |
| `createAxis(params)` | 创建轴 |
| `updateAxis(id, params)` | 更新轴 |
| `deleteAxis(id)` | 删除轴 |
| `createTask(params)` | 创建任务 |
| `updateTask(id, params)` | 更新任务 |
| `deleteTask(id)` | 删除任务 |
| `setGlobalVar(params)` | 设置全局变量 |
| `deleteGlobalVar(name)` | 删除全局变量 |
| `updateS7Config(config)` | 更新 S7 配置 |
| `updateNorthModbusConfig(config)` | 更新北向 Modbus |
| `addSouthModbusClient(config)` | 添加南向 Modbus 客户端 |
| `updateSouthModbusClient(id, config)` | 更新南向 Modbus 客户端 |
| `deleteSouthModbusClient(id)` | 删除南向 Modbus 客户端 |
| `updateEthercatMasterConfig(config)` | 更新 EtherCAT 主站配置 |
| `triggerCompile()` | 触发编译 |

### 使用示例

```typescript
// 外部插件获取 API
const neoide = vscode.extensions.getExtension('your-publisher.neoide');
const api = neoide.exports as PlcIdeApi;

// 获取项目状态
const status = await api.getProjectStatus();

// 获取轴配置
const axes = await api.getPlcConfig('Axis');

// 创建轴
const result = await api.createAxis({
    name: 'Axis1',
    device_number: 1,
    master_id: 0,
    slave_id: 1,
});

// 触发编译
const compileResult = await api.triggerCompile();
```

### 响应格式

所有 API 返回统一的 `ApiResult<T>` 格式：

```typescript
interface ApiResult<T> {
    success: boolean;
    data?: T;           // 成功时返回数据
    error?: ApiError;   // 失败时返回错误
}

interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}
```

---

## 7. 新增模块模板

创建新模块 `src/modules/newfeature/`：

```
newfeature/
├── commands/
│   └── newfeature.command.ts    # 命令注册
├── services/
│   └── newfeature.service.ts    # 业务逻辑
├── repositories/
│   └── newfeature.repo.ts       # 数据持久化
├── models/
│   ├── newfeature.interface.ts  # 接口定义
│   └── newfeature.config.ts     # 配置常量
├── views/
│   └── tree/
│       └── newfeature.provider.ts
└── newfeature.module.ts         # DI 注册入口
```

模块入口示例：

```typescript
// newfeature.module.ts
import { container } from '../../core/di-container';
import { NewfeatureRepository } from './repositories/newfeature.repo';
import { NewfeatureService } from './services/newfeature.service';

export function registerNewfeatureModule(): void {
    container.register(NewfeatureRepository, { useClass: NewfeatureRepository });
    container.registerSingleton(NewfeatureService);
}

export { NewfeatureService } from './services/newfeature.service';
export { NewfeatureCommands } from './commands/newfeature.command';
```

在 `extension.ts` 中注册：

```typescript
import { registerNewfeatureModule } from './modules/newfeature/newfeature.module';

// 在 registerModules() 中添加
registerNewfeatureModule();
```

---

## 8. 常见陷阱

1. **忘记 `@injectable()` 装饰器** - 导致 DI 无法注入
2. **在 Service 中导入 VS Code API** - 应只在 Command/View 层使用
3. **同步文件操作** - 必须使用 `fs.promises` 或 `vscode.workspace.fs`
4. **模块间直接依赖** - 应通过 EventBus 通信
5. **忘记导出模块 API** - 在 `*.module.ts` 中导出公共类

---

*文档版本: v1.0 | 项目版本: 0.0.6*
