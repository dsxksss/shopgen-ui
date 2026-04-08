import type { AgentProfile, RuntimeStatus, WorkspaceHistoryBundle, WorkspaceView } from './types';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

function ensureTauriRuntime() {
  if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) {
    throw new Error('当前页面未运行在 Tauri 桌面容器中，请使用 `npm run tauri:dev` 启动。');
  }
}

async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  ensureTauriRuntime();
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
}

export function getRuntimeStatus() {
  return invokeCommand<RuntimeStatus>('get_runtime_status');
}

export function getAgentCatalog() {
  return invokeCommand<AgentProfile[]>('get_agent_catalog');
}

export function generateWorkspaceView(prompt: string, scenario: string) {
  return invokeCommand<WorkspaceView>('generate_workspace_view', { prompt, scenario });
}

export function loadWorkspaceHistory() {
  return invokeCommand<WorkspaceHistoryBundle>('load_workspace_history');
}

export function switchWorkspace(requestId: string) {
  return invokeCommand<WorkspaceView>('switch_workspace', { requestId });
}

export function clearWorkspaceView() {
  return invokeCommand<void>('clear_workspace_view');
}

export function deleteWorkspace(requestId: string) {
  return invokeCommand<void>('delete_workspace', { requestId });
}

export function renameWorkspace(requestId: string, title: string) {
  return invokeCommand<WorkspaceHistoryBundle>('rename_workspace', { requestId, title });
}

export function togglePinWorkspace(requestId: string) {
  return invokeCommand<WorkspaceHistoryBundle>('toggle_pin_workspace', { requestId });
}
