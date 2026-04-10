import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { Terminal } from 'lucide-react';
import { clearWorkspaceView, deleteWorkspace, getRuntimeStatus, loadWorkspaceHistory, renameWorkspace, runWorkspaceFlow, switchWorkspace, togglePinWorkspace } from './lib/api';
import type { RuntimeStatus, WorkspaceHistoryBundle, WorkspaceView } from './lib/types';
import { DEFAULT_PROMPTS, MenuKey, scenarioToMenu, menuToScenario, sortHistoryItems } from './lib/utils';
import { KanbanBoard } from './components/Kanban';
import { WorkflowView, WorkflowWizard } from './components/Workflow';
import { LightSidebar, TopNav, BoardHeader, SettingsPage } from './components/Layout';
import '@xyflow/react/dist/style.css';

function MainContent({ activeMenu, handleMenuChange, runtime, setRuntime, historyBundle, setHistoryBundle, scenario, setScenario, draftPrompt, setDraftPrompt }: { activeMenu: MenuKey; handleMenuChange: (menu: MenuKey) => void; runtime: RuntimeStatus | null; setRuntime: (r: RuntimeStatus) => void; historyBundle: WorkspaceHistoryBundle; setHistoryBundle: React.Dispatch<React.SetStateAction<WorkspaceHistoryBundle>>; scenario: string; setScenario: (scenario: string) => void; draftPrompt: string; setDraftPrompt: (prompt: string) => void }) {
  const isAutoRunningRef = useRef(false);
  const [view, setView] = useState<'kanban' | 'workflow'>('kanban');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isRunningFlow, setIsRunningFlow] = useState(false);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [planningCache, setPlanningCache] = useState<{ isPlanning: boolean; plan: any | null; prompt: string; thought: string } | null>(null);

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
      // 乐观更新
      const optimistic = JSON.parse(JSON.stringify(workspace)) as WorkspaceView;
      const tIdx = optimistic.tasks.findIndex(t => t.id === taskId);
      if (tIdx !== -1) {
        optimistic.tasks[tIdx].status = 'in-progress';
        setHistoryBundle((prev) => ({ ...prev, currentWorkspace: optimistic }));
      }

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
        const activeIdx = current.tasks.findIndex(t => t.status !== 'done');
        if (activeIdx !== -1) {
           const optimistic = JSON.parse(JSON.stringify(current)) as WorkspaceView;
           optimistic.tasks[activeIdx].status = 'in-progress';
           setHistoryBundle((prev) => ({ ...prev, currentWorkspace: optimistic }));
        }

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

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <>
      <LightSidebar 
        activeMenu={activeMenu} 
        setActiveMenu={handleMenuChange} 
        tasks={tasks} 
        history={historyBundle.history} 
        currentRequestId={workspace?.plan.requestId} 
        onSwitchHistory={handleSwitchHistory} 
        onDeleteHistory={handleDeleteHistory} 
        onRenameHistory={handleRenameHistory} 
        onTogglePinHistory={handleTogglePinHistory}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F5F6FA] relative">
        {activeMenu === 'settings' ? (
          <SettingsPage runtime={runtime} onSaved={(r) => { setRuntime(r); handleMenuChange('overview'); }} />
        ) : (
          <>
            <TopNav runtime={runtime} activeScenario={activeScenario} hasWorkspace={Boolean(workspace)} onClear={handleClear} />
            <BoardHeader view={view} setView={setView} onOpenWizard={() => setIsWizardOpen(true)} canRunFlow={Boolean(workspace)} hasCompletedFlow={hasCompletedFlow} isRunningFlow={isRunningFlow} onRunFlow={handleRunFlow} />
            {view === 'kanban' ? <KanbanBoard tasks={tasks} activeScenario={activeScenario} onRunTask={handleRunTask} runningTaskId={runningTaskId} /> : <WorkflowView workflow={workflow} hasPlan={Boolean(workspace)} />}
          </>
        )}
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
  const [activeMenu, setActiveMenu] = useState<MenuKey>(scenarioToMenu('新品上架流程'));

  useEffect(() => {
    setActiveMenu(scenarioToMenu(scenario));
  }, [scenario]);

  const handleMenuChange = (menu: MenuKey) => {
    setActiveMenu(menu);
    if (menu !== 'overview' && menu !== 'settings') {
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
        }
      } catch (error) {
        if (!cancelled) {
          setRuntime({ configured: false, provider: 'MiniMax Anthropic Compatible API', baseUrl: 'https://api.minimaxi.com/anthropic', model: 'MiniMax-M2.7', openrouterKey: null, readyMessage: error instanceof Error ? error.message : 'Tauri Connection Error' });
        }
      }
    }
    bootstrap();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex h-screen w-full bg-[#F5F6FA] text-slate-800 font-sans overflow-hidden">
      <MainContent activeMenu={activeMenu} handleMenuChange={handleMenuChange} runtime={runtime} setRuntime={setRuntime} historyBundle={historyBundle} setHistoryBundle={setHistoryBundle} scenario={scenario} setScenario={setScenario} draftPrompt={draftPrompt} setDraftPrompt={setDraftPrompt} />
      <button
        onClick={async () => {
          const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
          const webview = new WebviewWindow('debug-panel', { url: '/?window=debug', title: 'ShopGen Backend Session', width: 800, height: 600, resizable: true, center: true });
          webview.once('tauri://error', (e) => console.error('Window open error', e));
        }}
        className="fixed bottom-6 right-6 z-40 bg-slate-900 text-slate-100 p-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 group border border-slate-700"
      >
        <Terminal className="w-5 h-5" />
        <span className="w-0 overflow-hidden group-hover:w-16 transition-all duration-300 text-sm font-medium whitespace-nowrap">调试终端</span>
      </button>
    </div>
  );
}
