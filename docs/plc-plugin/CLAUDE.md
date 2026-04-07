# CLAUDE.md - Claude Code 项目配置

> 本文件为 Claude Code 提供项目上下文，确保生成的代码符合项目架构和编码规范。

---

## 项目概述

**NeoIDE** 是一个 VS Code 扩展，为 PLC 开发提供 IDE 功能，支持 IEC 61131-3 ST 语言。

### 技术栈

- **Runtime**: Node.js (VS Code Extension Host)
- **Language**: TypeScript (Strict Mode)
- **DI Framework**: tsyringe
- **Communication**: gRPC + RESTful API

---

## 架构约束（强制）

### 分层依赖规则

```
extension.ts (入口)
    ↓
commands / views / models
    ↓
services (业务逻辑，无 UI 依赖)
    ↓
repositories (数据持久化)
```

**禁止**:
- 模块间横向依赖
- Service 层导入 VS Code API
- 同步文件操作
- 使用 `any` 类型

### 目录结构

```
src/
├── core/                    # 基础设施层
│   ├── base/                # 基类定义
│   ├── models/              # 公共类型定义
│   ├── di-container.ts      # DI 容器
│   └── plc-event-bus.ts     # 事件总线
├── modules/                 # 业务模块
│   └── <feature>/
│       ├── commands/        # VS Code 命令
│       ├── services/        # 业务逻辑
│       ├── repositories/    # 数据持久化
│       ├── models/          # 类型定义
│       ├── views/           # UI 组件
│       └── <feature>.module.ts  # DI 注册
└── extension.ts
```

---

## 编码规范

### 类型安全

```typescript
// ❌ 禁止
function process(data: any) { }

// ✅ 使用 interface
interface AxisConfig {
    id: number;
    name: string;
}
function process(data: AxisConfig) { }

// ✅ 未知类型使用 unknown + 类型收窄
function process(data: unknown) {
    if (typeof data === 'object' && data !== null && 'id' in data) {
        const config = data as AxisConfig;
    }
}
```

### 异步操作

```typescript
// ❌ 禁止同步
const data = fs.readFileSync(path);

// ✅ 异步 API
const data = await fs.promises.readFile(path, 'utf-8');
const data = await vscode.workspace.fs.readFile(uri);
```

### UI 与逻辑分离

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

### 依赖注入

```typescript
// Service 类必须使用 @injectable()
@injectable()
export class AxisService {
    constructor(
        @inject(AxisRepository) private axisRepo: AxisRepository
    ) {}
}

// 模块注册
export function registerAxisModule(): void {
    container.register(AxisRepository, { useClass: AxisRepository });
    container.registerSingleton(AxisService);
}
```

### 事件驱动通信

```typescript
// 模块间通信使用 EventBus，禁止直接依赖
plcEventBus.emit(PlcEvent.AXIS_INFO_SAVED, data);
plcEventBus.on(PlcEvent.AXIS_INFO_LOADED, (data) => { });
```

---

## 业务模块速查

| 模块 | 职责 | Service |
|:---|:---|:---|
| `project` | 项目管理、脚手架创建 | `ProjectService` |
| `program` | 程序块管理 (PRG/FB/FC) | `ProgramService` |
| `task` | 任务配置 | `TaskService` |
| `axis` | 轴参数配置 | `AxisService` |
| `global` | 全局变量管理 | `GlobalService` |
| `io` | I/O 配置 | `IOService` |
| `builder` | 编译构建 (ST→C→.so) | `BuilderService` |
| `tarmgr` | 目标设备管理 | `TargetService` |
| `toolmgr` | 工具链管理 | `ToolchainService` |
| `libmgr` | 系统库管理 | `LibraryService` |

---

## Extension API 层

项目通过 `src/api/` 暴露公共 API 供外部插件调用：

```
src/api/
├── plc-api.types.ts    # API 类型定义
├── plc-api.impl.ts     # PlcIdeApiImpl 实现
└── index.ts            # 导出入口
```

### API 列表

| 方法 | 说明 |
|:---|:---|
| `getProjectStatus()` | 获取项目状态 |
| `getPlcConfig(type)` | 获取配置 |
| `createAxis()` / `updateAxis()` / `deleteAxis()` | 轴配置 CRUD |
| `createTask()` / `updateTask()` / `deleteTask()` | 任务配置 CRUD |
| `setGlobalVar()` / `deleteGlobalVar()` | 全局变量管理 |
| `updateS7Config()` 等 | IO 配置管理 |
| `triggerCompile()` | 触发编译 |

### 使用示例

```typescript
const neoide = vscode.extensions.getExtension('your-publisher.neoide');
const api = neoide.exports as PlcIdeApi;

const status = await api.getProjectStatus();
const axes = await api.getPlcConfig('Axis');
const result = await api.createAxis({ name: 'Axis1', ... });
```

---

## 新增模块模板

创建新模块时，必须遵循以下结构：

```
src/modules/newfeature/
├── commands/
│   └── newfeature.command.ts
├── services/
│   └── newfeature.service.ts
├── repositories/
│   └── newfeature.repo.ts
├── models/
│   ├── newfeature.interface.ts
│   └── newfeature.config.ts
├── views/
│   └── tree/
│       └── newfeature.provider.ts
└── newfeature.module.ts
```

`newfeature.module.ts` 模板：

```typescript
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

## 开发命令

```bash
npm install          # 安装依赖
npm run watch        # 开发模式（热重载）
npm run package      # 生产构建
npm run lint         # 代码检查
npm run test         # 运行测试
```

VS Code 中按 **F5** 启动扩展开发宿主进行调试。

---

## 常见陷阱

1. **忘记 `@injectable()` 装饰器** → DI 无法注入
2. **Service 中导入 VS Code API** → 应只在 Command/View 层使用
3. **同步文件操作** → 必须使用 `fs.promises` 或 `vscode.workspace.fs`
4. **模块间直接依赖** → 应通过 EventBus 通信
5. **忘记导出模块 API** → 在 `*.module.ts` 中导出公共类

---

## 代码生成检查清单

在生成或修改代码后，确保：

- [ ] Service 类使用 `@injectable()` 装饰器
- [ ] Repository 正确注入到 Service
- [ ] 所有文件操作使用异步 API
- [ ] 类型定义使用 `interface` 或 `unknown`，避免 `any`
- [ ] UI 逻辑与业务逻辑分离
- [ ] 模块间通信使用 `PlcEventBus`
- [ ] 新模块在 `extension.ts` 中注册
- [ ] 导出公共 API 在 `*.module.ts`

---

## 示例：完整功能实现流程

假设需要新增"报警管理"功能：

### 1. 创建模型 (`alarm.interface.ts`)

```typescript
export interface AlarmConfig {
    id: string;
    name: string;
    priority: number;
    condition: string;
}
```

### 2. 创建 Repository (`alarm.repo.ts`)

```typescript
import { injectable } from 'tsyringe';
import * as fs from 'fs/promises';
import { AlarmConfig } from '../models/alarm.interface';

@injectable()
export class AlarmRepository {
    private readonly filePath = 'alarms.json';

    async load(): Promise<AlarmConfig[]> {
        const data = await fs.readFile(this.filePath, 'utf-8');
        return JSON.parse(data) as AlarmConfig[];
    }

    async save(configs: AlarmConfig[]): Promise<void> {
        await fs.writeFile(this.filePath, JSON.stringify(configs, null, 2));
    }
}
```

### 3. 创建 Service (`alarm.service.ts`)

```typescript
import { injectable, inject } from 'tsyringe';
import { AlarmRepository } from '../repositories/alarm.repo';
import { AlarmConfig } from '../models/alarm.interface';
import { plcEventBus, PlcEvent } from '../../../core/plc-event-bus';

@injectable()
export class AlarmService {
    constructor(
        @inject(AlarmRepository) private alarmRepo: AlarmRepository
    ) {}

    async getAll(): Promise<AlarmConfig[]> {
        const alarms = await this.alarmRepo.load();
        plcEventBus.emit(PlcEvent.ALARM_LOADED, alarms);
        return alarms;
    }

    async update(id: string, config: AlarmConfig): Promise<void> {
        const alarms = await this.getAll();
        const index = alarms.findIndex(a => a.id === id);
        if (index >= 0) {
            alarms[index] = config;
            await this.alarmRepo.save(alarms);
            plcEventBus.emit(PlcEvent.ALARM_SAVED, alarms);
        }
    }
}
```

### 4. 创建 Command (`alarm.command.ts`)

```typescript
import * as vscode from 'vscode';
import { injectable, inject } from 'tsyringe';
import { AlarmService } from '../services/alarm.service';

@injectable()
export class AlarmCommands {
    constructor(
        @inject(AlarmService) private alarmService: AlarmService
    ) {}

    register(): vscode.Disposable[] {
        return [
            vscode.commands.registerCommand('neoide.alarm.list', async () => {
                const alarms = await this.alarmService.getAll();
                // 显示报警列表
            })
        ];
    }
}
```

### 5. 注册模块 (`alarm.module.ts`)

```typescript
import { container } from '../../core/di-container';
import { AlarmRepository } from './repositories/alarm.repo';
import { AlarmService } from './services/alarm.service';
import { AlarmCommands } from './commands/alarm.command';

export function registerAlarmModule(): void {
    container.register(AlarmRepository, { useClass: AlarmRepository });
    container.registerSingleton(AlarmService);
    container.registerSingleton(AlarmCommands);
}

export { AlarmService } from './services/alarm.service';
export { AlarmCommands } from './commands/alarm.command';
```

### 6. 在 extension.ts 中注册

```typescript
import { registerAlarmModule } from './modules/alarm/alarm.module';

export function activate(context: vscode.ExtensionContext) {
    // ...
    registerAlarmModule();
    // ...
}
```

---

*版本: v1.0*