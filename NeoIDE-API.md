# NeoIDE Extension API

> NeoIDE 扩展程序导出的公共 API，供外部插件（如 AI Agent）调用

## 概述

NeoIDE 通过 `vscode.extensions.getExtension().exports` 暴露公共 API，支持外部插件实现：
- 查询项目状态和配置
- 动态修改轴、任务、全局变量、IO 等配置
- 触发编译流程

## 获取 API 实例

```typescript
const neoide = vscode.extensions.getExtension('neoide');
const api = neoide.exports as PlcIdeApi;
```

## 响应格式

所有 API 返回统一的 `ApiResult<T>` 格式：

```typescript
interface ApiResult<T> {
    success: boolean;      // 调用是否成功
    data?: T;              // 成功时返回的数据
    error?: ApiError;       // 失败时的错误信息
}

interface ApiError {
    code: string;                      // 错误代码
    message: string;                    // 错误描述
    details?: Record<string, unknown>; // 详细信息
}
```

---

## API 列表

### 1. 状态查询

#### `getProjectStatus()`

获取当前项目状态

**返回类型**: `ApiResult<ProjectStatus>`

```typescript
interface ProjectStatus {
    isLoaded: boolean;           // 项目是否已加载
    name?: string;               // 项目名称
    toolchainReady: boolean;      // 工具链是否就绪
    connectedTargetId?: number | null;  // 已连接目标 ID
}
```

**示例**:
```typescript
const status = await api.getProjectStatus();
if (status.success) {
    console.log(`项目: ${status.data.name}, 工具链: ${status.data.toolchainReady ? '就绪' : '未就绪'}`);
}
```

---

#### `getPlcConfig(configType)`

获取 PLC 配置信息

**参数**: `configType: 'Axis' | 'Task' | 'GlobalVar' | 'IO'`

**返回类型**:
- `'Axis'`: `ApiResult<AxisInfo[]>`
- `'Task'`: `ApiResult<TaskConfig[]>`
- `'GlobalVar'`: `ApiResult<GlobalVar[]>`
- `'IO'`: `ApiResult<IOInfo>`

---

### 2. 轴配置

#### `createAxis(params)`

创建新轴

**参数**: `CreateAxisParams`

```typescript
interface CreateAxisParams {
    name: string;                    // 轴名称（必填）
    device_number: number;           // 设备编号
    servo_type?: string;              // 伺服类型（默认: 'DS402-Generic'）
    drive_type?: string;             // 驱动器类型（默认: 'servo_ds402_rt'）
    drive_ver?: string;              // 驱动器版本（默认: '1.0.0'）
    master_id: number;                // 主站 ID
    slave_id: number;                // 从站 ID
    setting?: Partial<AxisSetting>;  // 轴设置参数
}
```

**返回类型**: `ApiResult<AxisInfo>`

#### `updateAxis(id, params)`

更新轴配置

**参数**:
- `id: number` - 轴 ID
- `params: Partial<AxisInfo>` - 要更新的字段

**返回类型**: `ApiResult<AxisInfo>`

#### `deleteAxis(id)`

删除轴

**参数**: `id: number` - 轴 ID

**返回类型**: `ApiResult<void>`

---

### 3. 任务配置

#### `createTask(params)`

创建新任务

**参数**: `Partial<TaskConfig>`

```typescript
interface TaskConfig {
    name?: string;              // 任务名称
    id: number;                 // 任务 ID
    group: TaskGroup;           // 任务组
    trigger: TriggerType;       // 触发类型
    
    // 触发器参数
    periodUs?: number;           // 周期时间（微秒）
    edgeType?: 'rising' | 'falling';
    triggerVar?: string;        // 触发变量
    stateType?: 'high' | 'low';
    sleepMs?: number;           // 休眠时间（毫秒）
    
    // CPU 配置
    priority?: number;          // 优先级 (0-31)
    cpuAffinityMode?: 'free' | 'bind';
    cpuId?: number;             // CPU 核心号
    
    pouCalls?: PouInstance[];  // 调用的 POU 列表
}

enum TaskGroup {
    IEC_TASK = "IEC_TASK",
    SCHEDULED_TASK = "SCHEDULED_TASK",
    COMMUNICATION_TASK = "COMMUNICATION_TASK",
}

enum TriggerType {
    CYCLIC = "CYCLIC",      // 周期触发
    RISING = "RISING",      // 上升沿
    FALLING = "FALLING",     // 下降沿
    HIGH = "HIGH",          // 高电平
    LOW = "LOW",            // 低电平
    FREE = "FREE",          // 自由运行
    ONE_SHOT = "ONE_SHOT",  // 单次触发
}
```

**返回类型**: `ApiResult<TaskConfig>`

#### `updateTask(id, params)`

更新任务配置

**参数**:
- `id: number` - 任务 ID
- `params: Partial<TaskConfig>` - 要更新的字段

**返回类型**: `ApiResult<TaskConfig>`

#### `deleteTask(id)`

删除任务

**参数**: `id: number` - 任务 ID

**返回类型**: `ApiResult<void>`

---

### 4. 全局变量

#### `setGlobalVar(params)`

创建或更新全局变量

**参数**: `GlobalVar`

```typescript
interface GlobalVar {
    name: string;       // 变量名称（必填）
    address: string;    // 地址 (如 %MW100)
    dataType: string;   // 数据类型 (如 INT, REAL)
    initValue: string;  // 初始值
    comment?: string;  // 注释说明
    retain?: boolean;  // 是否保持型变量
    constant?: boolean; // 是否常量
}
```

**返回类型**: `ApiResult<GlobalVar>`

#### `deleteGlobalVar(name)`

删除全局变量

**参数**: `name: string` - 变量名称

**返回类型**: `ApiResult<void>`

---

### 5. IO 配置

#### `updateS7Config(config)`

更新 S7 协议服务器配置

**参数**: `Partial<S7Info>`

```typescript
interface S7Info {
    module_name: string;              // 模块名称
    enabled: boolean;                  // 是否启用
    port: number;                     // 端口号
    interface: string;                 // 绑定接口
    auto_register_io_buffers: boolean; // 自动注册 IO 缓冲区
}
```

**返回类型**: `ApiResult<S7Info>`

#### `updateNorthModbusConfig(config)`

更新北向 Modbus 服务器配置

**参数**: `Partial<NorthModbusInfo>`

```typescript
interface NorthModbusInfo {
    module_name: string;   // 模块名称
    enabled: boolean;      // 是否启用
    port: number;          // 端口号
    interface: string;      // 绑定接口
}
```

**返回类型**: `ApiResult<NorthModbusInfo>`

#### `addSouthModbusClient(config)`

添加南向 Modbus 客户端

**参数**: `Partial<SouthModbusInfo>`

```typescript
interface SouthModbusInfo {
    id: number;                         // 配置 ID
    module_name: string;               // 模块名称
    enabled: boolean;                   // 是否启用
    server_ip: string;                 // 服务器 IP
    server_port: number;               // 服务器端口
    polling_interval_ms: number;       // 轮询间隔（毫秒）
    input_maps: IOMap[];              // 输入映射列表
    output_maps: IOMap[];              // 输出映射列表
}
```

**返回类型**: `ApiResult<SouthModbusInfo>`

#### `updateSouthModbusClient(id, config)`

更新南向 Modbus 客户端

**参数**:
- `id: number` - 客户端 ID
- `config: Partial<SouthModbusInfo>` - 要更新的配置

**返回类型**: `ApiResult<SouthModbusInfo>`

#### `deleteSouthModbusClient(id)`

删除南向 Modbus 客户端

**参数**: `id: number` - 客户端 ID

**返回类型**: `ApiResult<void>`

#### `updateEthercatMasterConfig(config)`

更新 EtherCAT 主站配置

**参数**: `Partial<EthercatMaster>`

```typescript
interface EthercatMaster {
    enable: boolean;                    // 是否启用
    module_name?: string;               // 模块名称
    id: number;                         // Master ID
    netName: string;                    // 网卡名称
    mac: string;                       // MAC 地址
    cpu_affinity: number;               // CPU 亲和性
    interval_us: number;                // 周期（微秒）
    sync_shift_per: number;             // 同步偏移百分比
    master_status_update_freq_us: number; // 主站状态更新频率
    slaves_state_us: number;            // 从站状态更新频率
    ethercat_slaves: EthercatSlave[];  // 从站映射数组
}
```

**返回类型**: `ApiResult<EthercatMaster>`

---

### 6. 编译执行

#### `triggerCompile()`

触发项目编译

**返回类型**: `ApiResult<CompileReport>`

```typescript
interface CompileReport {
    success: boolean;       // 编译是否成功
    duration: number;      // 编译耗时（毫秒）
    outputFiles: string[];  // 输出文件列表
    errors: CompileError[];  // 错误列表
}

interface CompileError {
    location: {
        file: string;
        line: number;
        column: number;
        endLine?: number;
        endColumn?: number;
    };
    message: string;
    severity: 'error' | 'warning' | 'info';
    code?: string;
}
```

---

## 数据类型参考

### 轴配置相关

```typescript
enum AxisMode {
    POSITION = "POSITION",  // 位置模式
    VELOCITY = "VELOCITY",  // 速度模式
    TORQUE = "TORQUE"       // 转矩模式
}

enum WorkstationMode {
    CYCLE = "CYCLE",       // 周期模式
    LINEAR = "LINEAR"      // 线性模式
}

enum UserUnit {
    DEGREE = "DEGREE",     // 度
    MM = "MM",            // 毫米
    PULSE = "PULSE",      // 脉冲
    ROUND = "ROUND"       // 圈
}

enum SCurveType {
    TRAPEZOID = "TRAPEZOID",  // 梯形曲线
    S_CURVE = "S_CURVE"       // S 曲线
}

interface AxisSetting {
    mode: AxisMode;                    // 控制模式
    workstation_mode: WorkstationMode; // 工作站模式
    node_buffer_size: number;          // 节点缓冲区大小
    sw_vel_limit: boolean;            // 软件速度限制开关
    vel_limit: number;                // 速度限制值
    sw_acc_limit: boolean;            // 软件加速度限制开关
    acc_limit: number;                 // 加速度限制值
    sw_range_limit: boolean;          // 软件范围限制开关
    pos_positive_limit: number;        // 正向位置限制
    pos_negative_limit: number;       // 负向位置限制
    frequency: number;                 // 频率
    user_unit: UserUnit;               // 用户单位
    gear_ratio: number;               // 减速比
    user_units_per_round: number;     // 每圈用户单位数
    default_s_curve: SCurveType;       // 默认 S 曲线类型
    encoder_pulse_count: number;      // 编码器脉冲计数
    encoder_count_per_unit: number;   // 每单位编码器计数
}
```

### IO 映射相关

```typescript
enum IOMapVarType {
    BOOL = "BOOL",
    BYTE = "BYTE",
    WORD = "WORD",
    DWORD = "DWORD",
    FLOAT = "FLOAT",
}

enum IOMapAccessType {
    READ_COILS = "READ_COILS",
    READ_DISCRETE = "READ_DISCRETE",
    READ_INPUT = "READ_INPUT",
    READ_HOLDING = "READ_HOLDING",
    WRITE_COIL = "WRITE_COIL",
    WRITE_REGISTER = "WRITE_REGISTER",
}

enum IOMapEndianType {
    ABCD = "ABCD",
    DCBA = "DCBA",
    BADC = "BADC",
    CDAB = "CDAB",
}

enum IOMapFaultMode {
    IGNORE = "IGNORE",      // 忽略故障
    STOP = "STOP",          // 停止运行
    APP_CUSTOM = "APP_CUSTOM", // 应用自定义
}

interface IOMap {
    id: number;
    name: string;
    area: number;
    type: IOMapVarType;
    byte_offset: number;
    bit_offset: number;
    access: IOMapAccessType;
    mb_address: number;
    count: number;
    endian: IOMapEndianType;
    fault_mode: IOMapFaultMode;
}
```

### 目标连接相关

```typescript
enum PlcConnectionType {
    GRPC = "grpc",
    RESTFUL = "restful",
}

interface PlcTarget {
    id: number;
    name?: string;
    host: string;
    port: number;
    type: PlcConnectionType;
    connected: boolean | undefined;
    username?: string;
    password?: string;
}
```

### 程序块相关

```typescript
enum ProgramType {
    PRG = "PRG",      // 程序
    FB = "FB",        // 功能块
    FC = "FC",        // 函数
    UNKNOWN = "UNKNOWN",
}

interface ProgramBlock {
    name: string;     // 程序名称
    id: number;       // 程序 ID
    type: ProgramType;
    path: string;     // 文件路径
    lines: number;    // 代码行数
}
```

---

## 使用示例

### 获取项目状态并检查工具链

```typescript
const neoide = vscode.extensions.getExtension('neoide');
const api = neoide.exports as PlcIdeApi;

const status = await api.getProjectStatus();
if (!status.success) {
    vscode.window.showErrorMessage(`获取项目状态失败: ${status.error.message}`);
    return;
}

if (!status.data.toolchainReady) {
    vscode.window.showWarningMessage('工具链未就绪，请先安装工具链');
}
```

### 创建新轴

```typescript
const result = await api.createAxis({
    name: 'Axis1',
    device_number: 1,
    master_id: 0,
    slave_id: 1,
    setting: {
        mode: AxisMode.POSITION,
        user_unit: UserUnit.MM,
        vel_limit: 1000,
    }
});

if (result.success) {
    vscode.window.showInformationMessage(`轴 "${result.data.name}" 创建成功`);
} else {
    vscode.window.showErrorMessage(`创建轴失败: ${result.error.message}`);
}
```

### 触发编译

```typescript
const compileResult = await api.triggerCompile();
if (compileResult.success && compileResult.data.success) {
    vscode.window.showInformationMessage(`编译成功，耗时 ${compileResult.data.duration}ms`);
} else if (compileResult.data?.errors) {
    for (const err of compileResult.data.errors) {
        console.error(`${err.location.file}:${err.location.line} - ${err.message}`);
    }
}
```

---

## 错误码参考

| 错误码 | 说明 |
|:---|:---|
| `PROJECT_STATUS_ERROR` | 获取项目状态失败 |
| `CONFIG_READ_ERROR` | 读取配置失败 |
| `INVALID_CONFIG_TYPE` | 不支持的配置类型 |
| `INVALID_PARAM` | 参数无效 |
| `DUPLICATE_NAME` | 名称重复 |
| `NOT_FOUND` | 资源不存在 |
| `CREATE_FAILED` | 创建失败 |
| `UPDATE_FAILED` | 更新失败 |
| `DELETE_FAILED` | 删除失败 |
| `SAVE_FAILED` | 保存失败 |
| `AXIS_CREATE_ERROR` | 创建轴失败 |
| `AXIS_UPDATE_ERROR` | 更新轴失败 |
| `AXIS_DELETE_ERROR` | 删除轴失败 |
| `TASK_CREATE_ERROR` | 创建任务失败 |
| `TASK_UPDATE_ERROR` | 更新任务失败 |
| `TASK_DELETE_ERROR` | 删除任务失败 |
| `GLOBAL_VAR_ERROR` | 设置全局变量失败 |
| `GLOBAL_VAR_DELETE_ERROR` | 删除全局变量失败 |
| `IO_CONFIG_ERROR` | IO 配置操作失败 |
| `COMPILE_ERROR` | 编译失败 |