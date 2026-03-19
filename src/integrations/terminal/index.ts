/**
 * Terminal module for VSCode extension environment.
 */

// Export unified command executor
export { CommandExecutor } from "./CommandExecutor"

// Export command orchestrator (shared logic)
export { findLastIndex, orchestrateCommandExecution } from "./CommandOrchestrator"

// Export standalone terminal implementations (used for background execution in VSCode)
export { StandaloneTerminal } from "./standalone/StandaloneTerminal"
export { StandaloneTerminalManager } from "./standalone/StandaloneTerminalManager"
export { StandaloneTerminalProcess } from "./standalone/StandaloneTerminalProcess"
export { StandaloneTerminalRegistry } from "./standalone/StandaloneTerminalRegistry"

// Export all types from types.ts
export type {
	// Command Executor types
	ActiveBackgroundCommand,
	AskResponse,
	CommandExecutionOptions,
	CommandExecutorCallbacks,
	CommandExecutorConfig,
	FullCommandExecutorConfig,
	// Terminal types
	ITerminal,
	ITerminalManager,
	ITerminalProcess,
	ITerminalProcessResult,
	// Command Orchestrator types
	OrchestrationOptions,
	OrchestrationResult,
	StandaloneTerminalOptions,
	TerminalInfo,
	TerminalProcessEvents,
	TerminalProcessResultPromise,
} from "./types"
