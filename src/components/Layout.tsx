import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  LayoutGrid,
  Settings,
  ChevronRight,
  Package,
  History,
  Search,
  Pin,
  Pencil,
  Trash2,
  RefreshCcw,
  Workflow,
  Check,
  Play,
  Square,
  Sparkles,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Sun,
  Moon,
} from 'lucide-react';
import type { WorkspaceHistoryItem, DashboardTask, RuntimeStatus } from '../lib/types';
import { MenuKey } from '../lib/utils';
import { saveApiConfig } from '../lib/api';
import logo from '../assets/logo.png';


/**
 * Custom hook to handle theme switching with a Telegram-style circular reveal.
 */
export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
  });

  const toggleTheme = (event?: React.MouseEvent) => {
    const isNowDark = !isDark;
    
    const applyTheme = () => {
      document.documentElement.classList.toggle('dark', isNowDark);
      localStorage.setItem('theme', isNowDark ? 'dark' : 'light');
      setIsDark(isNowDark);
    };

    if (!event || !(document as any).startViewTransition) {
      applyTheme();
      return;
    }

    const { clientX: x, clientY: y } = event;
    document.documentElement.style.setProperty('--reveal-x', `${x}px`);
    document.documentElement.style.setProperty('--reveal-y', `${y}px`);
    document.documentElement.classList.add('theme-transitioning');

    const transition = (document as any).startViewTransition(applyTheme);

    transition.finished.finally(() => {
      document.documentElement.classList.remove('theme-transitioning');
    });
  };

  return { isDark, toggleTheme };
}

export function NavItem({ icon, label, isActive, onClick, badge, isCollapsed }: { icon: React.ReactNode; label: string; isActive?: boolean; onClick?: () => void; badge?: string | number; isCollapsed?: boolean }) {
  return (
    <button 
      onClick={onClick} 
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        isActive 
          ? 'bg-[var(--sidebar-active)] text-[var(--accent)] shadow-sm border border-[var(--border-main)]' 
          : 'text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-[var(--text-main)]'
      }`}
    >
      <div className={`shrink-0 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-4 h-4 shrink-0 shadow-sm' })}
      </div>
      {!isCollapsed && <span className="truncate flex-1 text-left">{label}</span>}
      {!isCollapsed && badge !== undefined && badge !== null && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? 'bg-[var(--border-main)] text-[var(--text-main)] border border-[var(--border-main)]' : 'bg-[var(--border-soft)] text-[var(--text-muted)]'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

export function historyDisplayTitle(item: WorkspaceHistoryItem) {
  return item.title?.trim() || item.scenario;
}

export function historyMatchesQuery(item: WorkspaceHistoryItem, query: string) {
  const haystack = [item.title ?? '', item.scenario, item.summary, item.merchantIntent].join(' ').toLowerCase();
  return haystack.includes(query);
}

export function HistoryList({ history, currentRequestId, onSwitch, onDelete, onRename, onTogglePin }: { history: WorkspaceHistoryItem[]; currentRequestId?: string; onSwitch: (requestId: string) => void; onDelete: (requestId: string) => void; onRename: (requestId: string, title: string) => Promise<void>; onTogglePin: (requestId: string) => Promise<void> }) {
  const [query, setQuery] = useState('');
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  const filteredHistory = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return history;
    return history.filter((item) => historyMatchesQuery(item, keyword));
  }, [history, query]);

  function startRename(item: WorkspaceHistoryItem) {
    setEditingRequestId(item.requestId);
    setDraftTitle(item.title ?? '');
  }

  function cancelRename() {
    setEditingRequestId(null);
    setDraftTitle('');
  }

  async function submitRename(requestId: string) {
    setBusyRequestId(requestId);
    try {
      await onRename(requestId, draftTitle);
      cancelRename();
    } finally {
      setBusyRequestId(null);
    }
  }

  async function handleTogglePin(requestId: string) {
    setBusyRequestId(requestId);
    try {
      await onTogglePin(requestId);
    } finally {
      setBusyRequestId(null);
    }
  }

  if (history.length === 0) {
    return (
      <div className="text-xs text-[var(--text-muted)] px-3 py-2 rounded-lg bg-[var(--bg-app)] border border-[var(--border-soft)]">
        暂无历史工作区
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索历史任务..."
          className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-[var(--text-muted)] transition-all text-[var(--text-main)]"
        />
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 no-scrollbar">
        {filteredHistory.map((item) => {
          const active = currentRequestId === item.requestId;
          const editing = editingRequestId === item.requestId;
          const busy = busyRequestId === item.requestId;
          const customTitle = item.title && item.title.trim().length > 0;

          return (
            <div
              key={item.requestId}
              className={`rounded-xl border px-3 py-3 transition-colors group ${
                active ? 'border-[var(--text-muted)] bg-[var(--sidebar-active)]' : 'border-[var(--border-main)] bg-[var(--bg-sidebar)] hover:bg-[var(--bg-app)]'
              }`}
            >
              {!editing ? (
                <>
                  <button onClick={() => onSwitch(item.requestId)} className="w-full text-left">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-flex shrink-0 h-5 w-5 items-center justify-center rounded-full ${item.pinned ? 'bg-[var(--accent)] text-[var(--bg-sidebar)]' : 'bg-[var(--bg-app)] text-[var(--text-muted)]'}`}>
                        <Pin className="w-3 h-3" />
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-main)] truncate flex-1">{historyDisplayTitle(item)}</span>
                      {active && <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--bg-sidebar)] font-bold">当前</span>}
                    </div>
                    {customTitle && <p className="mb-1 text-[10px] text-[var(--text-muted)]">{item.scenario}</p>}
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">{item.summary}</p>
                  </button>
                  <div className="mt-2.5 pt-2 flex items-center justify-between border-t border-[var(--border-soft)]">
                    <span className="text-[10px] text-[var(--text-muted)]">{new Date(item.generatedAt).toLocaleString('zh-CN')}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button disabled={busy} onClick={() => handleTogglePin(item.requestId)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-lg transition-colors"><Pin className="w-3.5 h-3.5" /></button>
                      <button disabled={busy} onClick={() => startRename(item)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button disabled={busy} onClick={() => onDelete(item.requestId)} className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitRename(item.requestId);
                      if (e.key === 'Escape') cancelRename();
                    }}
                    autoFocus
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--text-main)]"
                    placeholder="新标题..."
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={cancelRename} className="text-[10px] px-2 py-1 rounded bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)]">取消</button>
                    <button onClick={() => submitRename(item.requestId)} disabled={busy} className="text-[10px] px-2 py-1 rounded bg-[var(--accent)] text-[var(--bg-sidebar)] font-bold disabled:opacity-50">保存</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LightSidebar({ activeMenu, setActiveMenu, tasks, history, currentRequestId, onSwitchHistory, onDeleteHistory, onRenameHistory, onTogglePinHistory, isCollapsed, onToggleCollapse }: { activeMenu: MenuKey; setActiveMenu: (menu: MenuKey) => void; tasks: DashboardTask[]; history: WorkspaceHistoryItem[]; currentRequestId?: string; onSwitchHistory: (requestId: string) => void; onDeleteHistory: (requestId: string) => void; onRenameHistory: (requestId: string, title: string) => Promise<void>; onTogglePinHistory: (requestId: string) => Promise<void>; isCollapsed: boolean; onToggleCollapse: () => void; }) {
  const newProductCount = tasks.filter((task) => task.workflow === '新品上架流程').length;
  const { isDark, toggleTheme } = useTheme();

  return (
    <motion.div initial={false} animate={{ width: isCollapsed ? 72 : 260 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="bg-[var(--bg-sidebar)] h-full border-r border-[var(--border-main)] flex flex-col shrink-0 z-10 overflow-hidden relative shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
      <div className={`p-6 flex items-center justify-between border-b border-[var(--border-soft)] ${isCollapsed ? 'px-4' : ''}`}>
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-[var(--bg-app)] border border-[var(--border-main)] p-0 flex items-center justify-center shadow-sm overflow-hidden">
                <img src={logo} alt="ShopGen Logo" className="w-full h-full object-contain scale-125" />
             </div>
             <h1 className="text-xl font-bold text-[var(--text-main)] tracking-tighter italic">ShopGen</h1>
          </div>
        ) : (
          <button onClick={onToggleCollapse} className="w-10 h-10 rounded-xl bg-[var(--bg-app)] border border-[var(--border-main)] p-0 flex items-center justify-center shadow-sm mx-auto overflow-hidden hover:border-[var(--accent)] transition-all">
             <img src={logo} alt="ShopGen Logo" className="w-full h-full object-contain scale-125" />
          </button>
        )}
        {!isCollapsed && (
          <button onClick={onToggleCollapse} className="w-7 h-7 rounded-xl bg-[var(--bg-app)] border border-[var(--border-main)] flex items-center justify-center hover:bg-[var(--border-soft)] transition-all">
            <ChevronRight className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
          </button>
        )}
      </div>


      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-8 no-scrollbar">
        <div className="px-4">
          {!isCollapsed && <p className="text-[10px] font-black text-[var(--text-muted)] mb-3 px-3 uppercase tracking-[0.15em]">核心空间</p>}
          <NavItem icon={<LayoutGrid />} label="总览看板" isActive={activeMenu === 'overview'} onClick={() => setActiveMenu('overview')} badge={tasks.length || undefined} isCollapsed={isCollapsed} />
        </div>
        <div className="px-4">
          {!isCollapsed && <p className="text-[10px] font-black text-[var(--text-muted)] mb-3 px-3 uppercase tracking-[0.15em]">流程执行</p>}
          <NavItem icon={<Package />} label="新品上架流程" badge={newProductCount || undefined} isActive={activeMenu === 'new-product'} onClick={() => setActiveMenu('new-product')} isCollapsed={isCollapsed} />
        </div>
        <div className="px-4">
          {!isCollapsed && <p className="text-[10px] font-black text-[var(--text-muted)] mb-3 px-3 uppercase tracking-[0.15em]">系统控制</p>}
          <NavItem icon={<Settings />} label="系统服务设置" isActive={activeMenu === 'settings'} onClick={() => setActiveMenu('settings')} isCollapsed={isCollapsed} />
        </div>
        {!isCollapsed && (
          <div className="px-4">
            <div className="flex items-center gap-2 mb-3 px-3">
              <History className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em]">任务历史</p>
            </div>
            <HistoryList history={history} currentRequestId={currentRequestId} onSwitch={onSwitchHistory} onDelete={onDeleteHistory} onRename={onRenameHistory} onTogglePin={onTogglePinHistory} />
          </div>
        )}
      </div>

      <div className={`p-4 border-t border-[var(--border-soft)] ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button onClick={(e) => toggleTheme(e)} className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-bold transition-all hover:bg-[var(--bg-app)] border border-transparent hover:border-[var(--border-main)] ${isDark ? 'text-yellow-500' : 'text-slate-500'}`}>
          {isDark ? <Sun className="w-4 h-4 fill-current" /> : <Moon className="w-4 h-4 fill-current" />}
          {!isCollapsed && <span>{isDark ? '切换亮色模式' : '切换暗色模式'}</span>}
        </button>
      </div>
    </motion.div>
  );
}

export function TopNav({ runtime, activeScenario, hasWorkspace, onClear }: { runtime: RuntimeStatus | null; activeScenario: string; hasWorkspace: boolean; onClear: () => void }) {
  return (
    <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="h-[88px] px-8 flex items-center justify-between shrink-0 bg-[var(--bg-app)]">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-main)] italic">工作台</h2>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">当前项目: {activeScenario}</p>
      </div>
      <div className="flex items-center gap-3">
        {hasWorkspace && <button onClick={onClear} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-main)] hover:bg-[var(--bg-app)] transition-all">
          <RefreshCcw className="w-3.5 h-3.5" />清空画布
        </button>}
        <div className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm border ${runtime?.configured ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
          {runtime?.configured ? `● ${runtime.model}` : '○ API 未连接'}
        </div>
      </div>
    </motion.div>
  );
}

export function BoardHeader({ view, setView, onOpenWizard, canRunFlow, hasCompletedFlow, isRunningFlow, onRunFlow }: { view: 'kanban' | 'workflow'; setView: (v: 'kanban' | 'workflow') => void; onOpenWizard: () => void; canRunFlow: boolean; hasCompletedFlow: boolean; isRunningFlow: boolean; onRunFlow: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-8 py-4 flex items-center justify-between shrink-0 bg-[var(--bg-card)] border-b border-[var(--border-main)] z-10 relative">
      <div className="flex items-center gap-6 w-full max-w-md">
        <button onClick={() => setView('kanban')} className={`py-2 text-sm font-semibold flex items-center gap-2 transition-colors relative ${view === 'kanban' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
          <LayoutGrid className="w-4 h-4" /> 看板视图
          {view === 'kanban' && <motion.div layoutId="activeTab" className="absolute -bottom-4 left-0 right-0 h-0.5 bg-[var(--accent)]" />}
        </button>
        <button onClick={() => setView('workflow')} className={`py-2 text-sm font-semibold flex items-center gap-2 transition-colors relative ${view === 'workflow' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
          <Workflow className="w-4 h-4" /> 流程视图
          {view === 'workflow' && <motion.div layoutId="activeTab" className="absolute -bottom-4 left-0 right-0 h-0.5 bg-[var(--accent)]" />}
        </button>
      </div>
      <div className="flex gap-4">
        {view === 'workflow' ? (
          <>
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${canRunFlow ? 'text-green-500 bg-green-500/10' : 'text-[var(--text-muted)] bg-[var(--bg-app)]'}`}>
              <Check className="w-3 h-3" /> {hasCompletedFlow ? '执行完成' : canRunFlow ? '已保存' : '等待生成'}
            </div>
            <button onClick={onRunFlow} disabled={!canRunFlow || hasCompletedFlow} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isRunningFlow ? 'bg-red-500 text-white' : 'bg-[var(--accent)] text-[var(--bg-sidebar)] disabled:opacity-40'}`}>
              {isRunningFlow ? <><Square className="w-4 h-4 fill-current mr-2" /> 中止执行</> : <><Play className="w-4 h-4 fill-current mr-2" /> 自动推进</>}
            </button>
          </>
        ) : (
          <button onClick={onOpenWizard} className="bg-[var(--accent)] text-[var(--bg-sidebar)] px-5 py-2 rounded-xl text-sm font-medium hover:scale-[1.02] transition-all flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> AI 构建流程
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function SettingsPage({ runtime, onSaved }: { runtime: RuntimeStatus | null, onSaved: (r: RuntimeStatus) => void }) {
  const [baseUrl, setBaseUrl] = useState(runtime?.baseUrl || 'https://api.minimaxi.com/anthropic');
  const [apiKey, setApiKey] = useState(runtime?.apiKey || '');
  const [model, setModel] = useState(runtime?.model || 'MiniMax-M2.7');
  const [openrouterKey, setOpenrouterKey] = useState(runtime?.openrouterKey || '');
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const result = await saveApiConfig(baseUrl, apiKey, model, openrouterKey);
      onSaved(result);
      alert('配置已成功下发！');
    } catch (err) {
      alert(`保存失败: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 overflow-y-auto p-12 bg-[var(--bg-card)]">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-[var(--border-soft)]">
           <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-[var(--bg-sidebar)] shadow-xl">
             <Settings className="w-6 h-6" />
           </div>
           <div>
             <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight">系统设置</h1>
             <p className="text-[var(--text-muted)] font-medium">基础模型基础设施配置</p>
           </div>
        </div>

        <div className="grid grid-cols-1 gap-10">
          <section className="space-y-6">
            <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" /> LLM 核心引擎
            </h2>
            <div className="grid grid-cols-1 gap-6 p-8 bg-[var(--bg-app)] rounded-3xl border border-[var(--border-main)]">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[var(--text-muted)] uppercase ml-1">接口地址 (Endpoint)</label>
                  <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl px-5 py-3.5 text-sm text-[var(--text-main)] outline-none focus:ring-1 focus:ring-[var(--accent)]" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-[var(--text-muted)] uppercase ml-1">模型标识 (Model ID)</label>
                    <input value={model} onChange={e => setModel(e.target.value)} className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl px-5 py-3.5 text-sm text-[var(--text-main)] outline-none focus:ring-1 focus:ring-[var(--accent)]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-[var(--text-muted)] uppercase ml-1">密钥 (API Key)</label>
                    <div className="relative">
                      <input type={showApiKey ? "text" : "password"} value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl px-5 py-3.5 text-sm font-mono text-[var(--text-main)] outline-none focus:ring-1 focus:ring-[var(--accent)]" />
                      <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)]">{showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  </div>
                </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-500" /> 视觉生成密钥
            </h2>
            <div className="p-8 bg-purple-500/5 rounded-3xl border border-purple-500/20">
               <input value={openrouterKey} onChange={e => setOpenrouterKey(e.target.value)} className="w-full bg-[var(--bg-card)] border border-purple-500/20 rounded-2xl px-5 py-3.5 text-sm font-mono text-[var(--text-main)] outline-none" placeholder="sk-..." />
            </div>
          </section>

          <div className="pt-10 flex justify-end">
            <button onClick={handleSave} disabled={loading} className="px-12 py-4 bg-[var(--accent)] text-[var(--bg-sidebar)] rounded-[24px] font-bold shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-50">
              {loading ? "正在保存..." : "同步配置信息"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function SettingsModal() {
  return null;
}
