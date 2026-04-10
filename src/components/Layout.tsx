import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  LayoutGrid,
  Settings,
  ChevronRight,
  Package,
  Calendar,
  BarChart2,
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
  ChevronDown,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from 'lucide-react';
import type { WorkspaceHistoryItem, DashboardTask, RuntimeStatus } from '../lib/types';
import { MenuKey } from '../lib/utils';
import { saveApiConfig } from '../lib/api';

export function NavItem({ icon, label, isActive, onClick, badge, isCollapsed }: { icon: React.ReactNode; label: string; isActive?: boolean; onClick?: () => void; badge?: string | number; isCollapsed?: boolean }) {
  return <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-slate-100 text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>{React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: `w-4 h-4 shrink-0 shadow-sm ${isActive ? 'text-slate-900' : 'text-slate-400'}` })}{!isCollapsed && <span className="truncate flex-1 text-left">{label}</span>}{!isCollapsed && badge !== undefined && badge !== null && <span className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? 'bg-slate-200 text-slate-800 border border-slate-300' : 'bg-slate-100 text-slate-500'}`}>{badge}</span>}</button>;
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
      <div className="text-xs text-slate-400 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
        暂无历史工作区
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索历史工作区"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
        />
      </div>
      {filteredHistory.length === 0 ? (
        <div className="text-xs text-slate-400 px-3 py-3 rounded-lg bg-slate-50 border border-slate-100">
          没有匹配的工作区
        </div>
      ) : (
        <div className="space-y-2">
          {filteredHistory.map((item) => {
            const active = item.requestId === currentRequestId;
            const editing = item.requestId === editingRequestId;
            const busy = item.requestId === busyRequestId;
            const customTitle = item.title?.trim();
            return (
              <div
                key={item.requestId}
                className={`rounded-xl border px-3 py-3 transition-colors group ${
                  active ? 'border-slate-300 bg-slate-100' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <button
                  onClick={() => onSwitch(item.requestId)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`inline-flex shrink-0 h-5 w-5 items-center justify-center rounded-full ${
                        item.pinned ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <Pin className="w-3 h-3" />
                    </span>
                    <span className="text-xs font-semibold text-slate-900 truncate flex-1">
                      {historyDisplayTitle(item)}
                    </span>
                    {active && (
                      <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-white">
                        当前
                      </span>
                    )}
                  </div>
                  {customTitle && <p className="mb-1 text-[10px] text-slate-400">{item.scenario}</p>}
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>
                </button>
                {!editing && (
                  <div className="mt-2.5 pt-2 flex items-center justify-between border-t border-slate-100/60">
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.generatedAt).toLocaleString('zh-CN')}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(item.requestId);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                        title={item.pinned ? '取消置顶' : '置顶'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(item);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                        title="重命名"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item.requestId);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                {editing && (
                  <div className="mt-3 space-y-2">
                    <input
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') submitRename(item.requestId);
                        if (event.key === 'Escape') cancelRename();
                      }}
                      placeholder={item.scenario}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-300"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={cancelRename}
                        className="rounded-lg px-3 py-1.5 text-[11px] text-slate-500 hover:bg-slate-100"
                      >
                        取消
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => submitRename(item.requestId)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LightSidebar({ 
  activeMenu, 
  setActiveMenu, 
  tasks, 
  history, 
  currentRequestId, 
  onSwitchHistory, 
  onDeleteHistory, 
  onRenameHistory, 
  onTogglePinHistory,
  isCollapsed,
  onToggleCollapse
}: { 
  activeMenu: MenuKey; 
  setActiveMenu: (menu: MenuKey) => void; 
  tasks: DashboardTask[]; 
  history: WorkspaceHistoryItem[]; 
  currentRequestId?: string; 
  onSwitchHistory: (requestId: string) => void; 
  onDeleteHistory: (requestId: string) => void; 
  onRenameHistory: (requestId: string, title: string) => Promise<void>; 
  onTogglePinHistory: (requestId: string) => Promise<void>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const newProductCount = tasks.filter((task) => task.workflow === '新品上架流程').length;

  return (
    <motion.div 
      initial={false}
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="bg-white h-full border-r border-slate-200 flex flex-col shrink-0 z-10 overflow-hidden relative shadow-[1px_0_10px_rgba(0,0,0,0.02)]"
    >
      <div className={`p-6 flex items-center justify-between border-b border-slate-100/80 ${isCollapsed ? 'px-4' : ''}`}>
        {!isCollapsed && <h1 className="text-xl font-bold text-slate-900 tracking-tighter italic">ShopGen</h1>}
        <button 
          onClick={onToggleCollapse}
          className={`w-7 h-7 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 ${isCollapsed ? 'mx-auto' : ''}`}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500 rotate-180" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-8 no-scrollbar">
        <div className="px-4">
          {!isCollapsed && <p className="text-[10px] font-black text-slate-400 mb-3 px-3 uppercase tracking-[0.15em]">Main Space</p>}
          <div className="space-y-1">
            <NavItem icon={<LayoutGrid />} label="总览看板" isActive={activeMenu === 'overview'} onClick={() => setActiveMenu('overview')} badge={tasks.length || undefined} isCollapsed={isCollapsed} />
          </div>
        </div>

        <div className="px-4">
          {!isCollapsed && <p className="text-[10px] font-black text-slate-400 mb-3 px-3 uppercase tracking-[0.15em]">Execution</p>}
          <div className="space-y-1">
            <NavItem icon={<Package />} label="新品上架流程" badge={newProductCount || undefined} isActive={activeMenu === 'new-product'} onClick={() => setActiveMenu('new-product')} isCollapsed={isCollapsed} />
          </div>
        </div>

        <div className="px-4">
          {!isCollapsed && <p className="text-[10px] font-black text-slate-400 mb-3 px-3 uppercase tracking-[0.15em]">Control</p>}
          <div className="space-y-1">
             <NavItem icon={<Settings />} label="系统服务设置" isActive={activeMenu === 'settings'} onClick={() => setActiveMenu('settings')} isCollapsed={isCollapsed} />
          </div>
        </div>

        {!isCollapsed && (
          <div className="px-4">
            <div className="flex items-center gap-2 mb-3 px-3">
              <History className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">History</p>
            </div>
            <HistoryList history={history} currentRequestId={currentRequestId} onSwitch={onSwitchHistory} onDelete={onDeleteHistory} onRename={onRenameHistory} onTogglePin={onTogglePinHistory} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function TopNav({ runtime, activeScenario, hasWorkspace, onClear }: { runtime: RuntimeStatus | null; activeScenario: string; hasWorkspace: boolean; onClear: () => void }) {
  return <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="h-[88px] px-8 flex items-center justify-between shrink-0 bg-[#F5F6FA]"><div><h2 className="text-2xl font-bold text-slate-900">工作台</h2><p className="text-sm text-slate-500 mt-1">当前项目：{activeScenario}</p></div><div className="flex items-center gap-3">{hasWorkspace && <button onClick={onClear} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"><RefreshCcw className="w-3.5 h-3.5" />清空工作区</button>}<div className={`px-3 py-1.5 rounded-full text-xs font-medium ${runtime?.configured ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{runtime?.configured ? `已连接 ${runtime.model}` : '未连接 API'}</div></div></motion.div>;
}

export function BoardHeader({ view, setView, onOpenWizard, canRunFlow, hasCompletedFlow, isRunningFlow, onRunFlow }: { view: 'kanban' | 'workflow'; setView: (v: 'kanban' | 'workflow') => void; onOpenWizard: () => void; canRunFlow: boolean; hasCompletedFlow: boolean; isRunningFlow: boolean; onRunFlow: () => void }) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }} className="px-8 py-4 flex items-center justify-between shrink-0 bg-white border-b border-slate-200 z-10 relative"><div className="flex items-center gap-6 w-full max-w-md"><button onClick={() => setView('kanban')} className={`py-2 text-sm font-semibold flex items-center gap-2 transition-colors relative ${view === 'kanban' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid className="w-4 h-4" /> 看板视图{view === 'kanban' && <motion.div layoutId="activeTab" className="absolute -bottom-4 left-0 right-0 h-0.5 bg-slate-900" />}</button><button onClick={() => setView('workflow')} className={`py-2 text-sm font-semibold flex items-center gap-2 transition-colors relative ${view === 'workflow' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}><Workflow className="w-4 h-4" /> 流程视图{view === 'workflow' && <motion.div layoutId="activeTab" className="absolute -bottom-4 left-0 right-0 h-0.5 bg-slate-900" />}</button></div><div className="flex items-center gap-4">{view === 'workflow' ? <><div className="flex items-center gap-2 mr-4"><span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${canRunFlow ? 'text-green-600 bg-green-50' : 'text-slate-500 bg-slate-100'}`}><Check className="w-3 h-3" /> {hasCompletedFlow ? '执行完成' : canRunFlow ? '已保存' : '等待生成'}</span></div><button onClick={onRunFlow} disabled={!canRunFlow || hasCompletedFlow} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm ${isRunningFlow ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 disabled:cursor-not-allowed'}`}>{isRunningFlow ? <><Square className="w-4 h-4 fill-current" /> 中止执行</> : <><Play className="w-4 h-4 fill-current" /> 一键自动推进</>}</button></> : <button onClick={onOpenWizard} className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm border border-slate-800"><Sparkles className="w-4 h-4" /> AI 构建流程</button>}</div></motion.div>;
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
      alert('配置已下发至后端，服务连接成功！');
    } catch (err) {
      alert(`保存失败: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 overflow-y-auto p-12 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-100">
           <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl">
             <Settings className="w-6 h-6" />
           </div>
           <div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Settings</h1>
             <p className="text-slate-400 font-medium">Configure your AI Agents and Infrastructure</p>
           </div>
        </div>

        <div className="grid grid-cols-1 gap-10">
          <section className="space-y-6">
            <div className="flex items-center gap-2">
               <Sparkles className="w-5 h-5 text-blue-500" />
               <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest text-[14px]">Large Language Model (Main Engine)</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 p-8 bg-slate-50/50 rounded-3xl border border-slate-100 shadow-sm">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Endpoint Configuration (Anthropic Compatible)</label>
                  <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-slate-900 transition-all outline-none shadow-sm" placeholder="https://..." />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Target Model ID</label>
                    <input value={model} onChange={e => setModel(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-slate-900 transition-all outline-none shadow-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Authentication (API Key)</label>
                    <div className="relative">
                      <input type={showApiKey ? "text" : "password"} value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-mono shadow-sm" />
                      <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900">{showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  </div>
                </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-2">
               <ImageIcon className="w-5 h-5 text-purple-500" />
               <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest text-[14px]">Visual Generation (Image Engine)</h2>
            </div>
            <div className="p-8 bg-purple-50/30 rounded-3xl border border-purple-100/50">
               <div className="space-y-2">
                 <label className="text-[11px] font-black text-purple-400 uppercase ml-1">Visual Identity Key (OpenRouter/Doubao)</label>
                 <input value={openrouterKey} onChange={e => setOpenrouterKey(e.target.value)} className="w-full bg-white border border-purple-100 rounded-2xl px-5 py-3.5 text-sm font-mono shadow-sm shadow-purple-900/5" placeholder="sk-..." />
                 <p className="text-[10px] text-purple-400/80 mt-2 px-1">Used for high-fidelity product rendering and Scene generation.</p>
               </div>
            </div>
          </section>

          <div className="pt-10 flex justify-end">
            <button 
              onClick={handleSave} 
              disabled={loading} 
              className="px-12 py-4 bg-slate-900 text-white rounded-[24px] font-bold shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-3"
            >
              <Sparkles className="w-5 h-5" />
              {loading ? "COMMITTING CHANGES..." : "SYNC AGENT CONFIGURATION"}
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
