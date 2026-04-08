import type { AgentProfile, RuntimeStatus, WorkspaceView } from './types';

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
