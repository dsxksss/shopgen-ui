import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { Terminal } from 'lucide-react';
import { clearWorkspaceView, deleteWorkspace, getRuntimeStatus, loadWorkspaceHistory, renameWorkspace, runWorkspaceFlow, switchWorkspace, togglePinWorkspace } from './lib/api';
import type { RuntimeStatus, WorkspaceHistoryBundle } from './lib/types';
import { DEFAULT_PROMPTS, MenuKey, scenarioToMenu, menuToScenario, sortHistoryItems } from './lib/utils';
import { KanbanBoard } from './components/Kanban';
import { WorkflowView, WorkflowWizard } from './components/Workflow';
import { DarkSidebar, LightSidebar, TopNav, BoardHeader, SettingsModal } from './components/Layout';
import '@xyflow/react/dist/style.css';

function MainContent({ runtime, historyBundle, setHistoryBundle, scenario, setScenario, draftPrompt, setDraftPrompt }: { runtime: RuntimeStatus | null; historyBundle: WorkspaceHistoryBundle; setHistoryBundle: React.Dispatch<React.SetStateAction<WorkspaceHistoryBundle>>; scenario: string; setScenario: (scenario: string) => void; draftPrompt: string; setDraftPrompt: (prompt: string) => void }) {
  const isAutoRunningRef = useRef(false);
  const [view, setView] = useState<'kanban' | 'workflow'>('kanban');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isRunningFlow, setIsRunningFlow] = useState(false);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<MenuKey>(scenarioToMenu(scenario));
  const [planningCache, setPlanningCache] = useState<{ isPlanning: boolean; plan: any | null; prompt: string } | null>(null);

  useEffect(() => {
    setActiveMenu(scenarioToMenu(scenario));
  }, [scenario]);

  const handleMenuChange = (menu: MenuKey) => {
    setActiveMenu(menu);
    if (menu !== 'overview') {
      const newScenario = menuToScenario(menu);
      if (scenario !== newScenario) {
        setScenario(newScenario);
      }
      if (Object.values(DEFAULT_PROMPTS).includes(draftPrompt)) {
        const targetPrompt = DEFAULT_PROMPTS[newScenario];
        if (targetPrompt && draftPrompt !== targetPrompt) {
          setDraftPrompt(targetPrompt);
        }
      }
    }
  };

  const workspace = historyBundle.currentWorkspace;
  const tasks = workspace?.tasks ?? [];
  const workflow = workspace?.workflow ?? null;
  const activeScenario = activeMenu === 'overview' ? '总览' : menuToScenario(activeMenu);
  const hasCompletedFlow = tasks.length > 0 && tasks.every((task) => task.status === 'done');

  async function handleClear() {
    if (!window.confirm('确定要清空当前的整个工作区吗？这会导致当前项目进度完全丢失。')) return;
    await clearWorkspaceView();
    setHistoryBundle({ currentWorkspace: null, history: [] });
  }

  async function handleSwitchHistory(requestId: string) {
    const currentWorkspace = await switchWorkspace(requestId);
    setHistoryBundle((prev) => ({ ...prev, currentWorkspace }));
    setScenario(currentWorkspace.plan.scenario);
    setDraftPrompt(currentWorkspace.plan.merchantIntent);
  }

  async function handleDeleteHistory(requestId: string) {
    if (!window.confirm('确定要永久删除这条历史记录吗？')) return;
    await deleteWorkspace(requestId);
    const nextBundle = await loadWorkspaceHistory();
    setHistoryBundle(nextBundle);
    if (nextBundle.currentWorkspace) {
      setScenario(nextBundle.currentWorkspace.plan.scenario);
      setDraftPrompt(nextBundle.currentWorkspace.plan.merchantIntent);
    }
  }

  async function handleRenameHistory(requestId: string, title: string) {
    const nextBundle = await renameWorkspace(requestId, title);
    setHistoryBundle(nextBundle);
  }

  async function handleTogglePinHistory(requestId: string) {
    const nextBundle = await togglePinWorkspace(requestId);
    setHistoryBundle(nextBundle);
  }

  async function handleRunTask(taskId: string) {
    if (isRunningFlow) return;
    if (!workspace) return;
    
    setIsRunningFlow(true);
    setRunningTaskId(taskId);
    isAutoRunningRef.current = true;
    
    try {
      const nextWorkspace = await runWorkspaceFlow(workspace.plan.requestId, taskId);
      setHistoryBundle((prev) => ({ ...prev, currentWorkspace: nextWorkspace }));
    } finally {
      setIsRunningFlow(false);
      setRunningTaskId(null);
      isAutoRunningRef.current = false;
    }
  }

  async function handleRunFlow() {
    if (isRunningFlow) {
      isAutoRunningRef.current = false;
      setIsRunningFlow(false);
      return;
    }
    
    if (!workspace) return;
    setIsRunningFlow(true);
    isAutoRunningRef.current = true;
    setView('workflow');
    
    try {
      let current = workspace;
      while (isAutoRunningRef.current) {
        const nextWorkspace = await runWorkspaceFlow(current.plan.requestId);
        setHistoryBundle((prev) => ({ ...prev, currentWorkspace: nextWorkspace }));
        setView('workflow');
        current = nextWorkspace;
        
        const isFlowDone = nextWorkspace.tasks.length > 0 && nextWorkspace.tasks.every((task) => task.status === 'done');
        if (isFlowDone) {
          break;
        }
      }
    } finally {
      setIsRunningFlow(false);
      isAutoRunningRef.current = false;
    }
  }

  return (
    <>
      <LightSidebar activeMenu={activeMenu} setActiveMenu={handleMenuChange} tasks={tasks} history={historyBundle.history} currentRequestId={workspace?.plan.requestId} onSwitchHistory={handleSwitchHistory} onDeleteHistory={handleDeleteHistory} onRenameHistory={handleRenameHistory} onTogglePinHistory={handleTogglePinHistory} />
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F5F6FA] relative">
        <TopNav runtime={runtime} activeScenario={activeScenario} hasWorkspace={Boolean(workspace)} onClear={handleClear} />
        <BoardHeader view={view} setView={setView} onOpenWizard={() => setIsWizardOpen(true)} canRunFlow={Boolean(workspace)} hasCompletedFlow={hasCompletedFlow} isRunningFlow={isRunningFlow} onRunFlow={handleRunFlow} />
        {view === 'kanban' ? <KanbanBoard tasks={tasks} activeScenario={activeScenario} onRunTask={handleRunTask} runningTaskId={runningTaskId} /> : <WorkflowView workflow={workflow} hasPlan={Boolean(workspace)} />}
        <AnimatePresence>
          {isWizardOpen && <WorkflowWizard scenario={scenario} runtime={runtime} initialPrompt={draftPrompt} planningCache={planningCache} setPlanningCache={setPlanningCache} onClose={() => setIsWizardOpen(false)} onComplete={(nextWorkspace) => { 
            setHistoryBundle((prev) => ({ 
              currentWorkspace: nextWorkspace, 
              history: sortHistoryItems([{ requestId: nextWorkspace.plan.requestId, scenario: nextWorkspace.plan.scenario, summary: nextWorkspace.plan.summary, merchantIntent: nextWorkspace.plan.merchantIntent, generatedAt: nextWorkspace.plan.generatedAt, title: null, pinned: false }, ...prev.history.filter((item) => item.requestId !== nextWorkspace.plan.requestId)]) 
            })); 
            setDraftPrompt(nextWorkspace.plan.merchantIntent); 
            setIsWizardOpen(false); 
            setPlanningCache(null);
            setView('workflow'); 
          }} />}
        </AnimatePresence>
      </div>
    </>
  );
}

export default function App() {
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [scenario, setScenario] = useState('新品上架流程');
  const [historyBundle, setHistoryBundle] = useState<WorkspaceHistoryBundle>({ currentWorkspace: null, history: [] });
  const [draftPrompt, setDraftPrompt] = useState(DEFAULT_PROMPTS['新品上架流程']);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const [runtimeStatus, bundle] = await Promise.all([getRuntimeStatus(), loadWorkspaceHistory()]);
        if (!cancelled) {
          setRuntime(runtimeStatus);
          setHistoryBundle(bundle);
          if (bundle.currentWorkspace) {
            setScenario(bundle.currentWorkspace.plan.scenario);
            setDraftPrompt(bundle.currentWorkspace.plan.merchantIntent);
          }
          // 发送初始化成功日志
          import('./lib/api').then(({ subscribeToLogs }) => {
            // 这里我们不需要subscribe，只是为了演示，实际上emit_log是在Rust里调用的
            // 我们可以在这里调用一个Rust的ping方法（如果实现了）
            import('@tauri-apps/api/core').then(({ invoke }) => {
              invoke('get_runtime_status').then(() => {
                // 这个已经调用过了，我们只需要在Debug里显示
              });
            });
          });
        }
      } catch (error) {
        if (!cancelled) {
          setRuntime({ configured: false, provider: 'MiniMax Anthropic Compatible API', baseUrl: 'https://api.minimaxi.com/anthropic', model: 'MiniMax-M2.7', openrouterKey: null, readyMessage: error instanceof Error ? error.message : '当前页面未运行在 Tauri 桌面环境中。' });
        }
      }
    }
    bootstrap();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex h-screen w-full bg-[#F5F6FA] text-slate-800 font-sans overflow-hidden">
      <DarkSidebar onOpenSettings={() => setIsSettingsOpen(true)} />
      <MainContent runtime={runtime} historyBundle={historyBundle} setHistoryBundle={setHistoryBundle} scenario={scenario} setScenario={setScenario} draftPrompt={draftPrompt} setDraftPrompt={setDraftPrompt} />
      <button
        onClick={async () => {
          const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
          const webview = new WebviewWindow('debug-panel', {
            url: '/?window=debug',
            title: 'ShopGen Backend Session',
            width: 800,
            height: 600,
            resizable: true,
            center: true
          });
          webview.once('tauri://error', (e) => {
            console.error('Window open error', e);
            // Ignore error if window already exists, just focus it
          });
        }}
        className="fixed bottom-6 right-6 z-40 bg-slate-900 text-slate-100 p-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 group border border-slate-700"
      >
        <Terminal className="w-5 h-5" />
        <span className="w-0 overflow-hidden group-hover:w-16 transition-all duration-300 text-sm font-medium whitespace-nowrap">
          调试终端
        </span>
      </button>
      <AnimatePresence>
        {isSettingsOpen && <SettingsModal runtime={runtime} onClose={() => setIsSettingsOpen(false)} onSaved={(nextRuntime) => { setRuntime(nextRuntime); setIsSettingsOpen(false); }} />}
      </AnimatePresence>
    </div>
  );
}
