import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Hexagon,
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
} from 'lucide-react';
import type { WorkspaceHistoryItem, DashboardTask, RuntimeStatus } from '../lib/types';
import { MenuKey } from '../lib/utils';
import { saveApiConfig } from '../lib/api';

export function DarkSidebar({ onOpenSettings }: { onOpenSettings: () => void }) {
  return <motion.div initial={{ x: -72 }} animate={{ x: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="w-[72px] bg-[#1E1E24] h-full flex flex-col items-center py-6 justify-between shrink-0 z-20"><div className="flex flex-col items-center gap-8"><div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#1E1E24] mb-4 shadow-lg"><Hexagon className="w-6 h-6 fill-current" /></div><div className="flex flex-col gap-6 text-slate-400"><button className="p-2 hover:text-white transition-colors rounded-lg hover:bg-white/10"><LayoutGrid className="w-5 h-5" /></button><button onClick={onOpenSettings} className="p-2 hover:text-white transition-colors rounded-lg hover:bg-white/10"><Settings className="w-5 h-5" /></button></div></div></motion.div>;
}

export function NavItem({ icon, label, isActive, onClick, badge }: { icon: React.ReactNode; label: string; isActive?: boolean; onClick?: () => void; badge?: string | number }) {
  return <button onClick={onClick} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><div className="flex items-center gap-3">{React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: `w-4 h-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}` })}{label}</div>{badge !== undefined && badge !== null && <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-500'}`}>{badge}</span>}</button>;
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

export function LightSidebar({ activeMenu, setActiveMenu, tasks, history, currentRequestId, onSwitchHistory, onDeleteHistory, onRenameHistory, onTogglePinHistory }: { activeMenu: MenuKey; setActiveMenu: (menu: MenuKey) => void; tasks: DashboardTask[]; history: WorkspaceHistoryItem[]; currentRequestId?: string; onSwitchHistory: (requestId: string) => void; onDeleteHistory: (requestId: string) => void; onRenameHistory: (requestId: string, title: string) => Promise<void>; onTogglePinHistory: (requestId: string) => Promise<void> }) {
  const newProductCount = tasks.filter((task) => task.workflow === '新品上架流程').length;
  const promoCount = tasks.filter((task) => task.workflow === '促销活动策划').length;
  const dailyCount = tasks.filter((task) => task.workflow === '日常经营管理').length;

  return <motion.div initial={{ x: -260, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }} className="w-[260px] bg-white h-full border-r border-slate-200 flex flex-col shrink-0 z-10"><div className="p-6 flex items-center justify-between border-b border-slate-100"><h1 className="text-xl font-bold text-slate-900">ShopGen</h1><button className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"><ChevronRight className="w-4 h-4 text-slate-500" /></button></div><div className="flex-1 overflow-y-auto py-6 flex flex-col gap-8"><div className="px-4"><p className="text-xs font-bold text-slate-400 mb-2 px-2 uppercase tracking-wider">工作空间</p><div className="space-y-1"><NavItem icon={<LayoutGrid />} label="总览" isActive={activeMenu === 'overview'} onClick={() => setActiveMenu('overview')} badge={tasks.length || undefined} /></div></div><div className="px-4"><div className="flex items-center justify-between mb-2 px-2"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">我的项目</p></div><div className="space-y-1"><NavItem icon={<Package />} label="新品上架流程" badge={newProductCount || undefined} isActive={activeMenu === 'new-product'} onClick={() => setActiveMenu('new-product')} /><NavItem icon={<Calendar />} label="促销活动策划" badge={promoCount || undefined} isActive={activeMenu === 'promo'} onClick={() => setActiveMenu('promo')} /><NavItem icon={<BarChart2 />} label="日常店铺运营" badge={dailyCount || undefined} isActive={activeMenu === 'daily'} onClick={() => setActiveMenu('daily')} /></div></div><div className="px-4"><div className="flex items-center gap-2 mb-2 px-2"><History className="w-3.5 h-3.5 text-slate-400" /><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">历史工作区</p></div><HistoryList history={history} currentRequestId={currentRequestId} onSwitch={onSwitchHistory} onDelete={onDeleteHistory} onRename={onRenameHistory} onTogglePin={onTogglePinHistory} /></div></div></motion.div>;
}

export function TopNav({ runtime, activeScenario, hasWorkspace, onClear }: { runtime: RuntimeStatus | null; activeScenario: string; hasWorkspace: boolean; onClear: () => void }) {
  return <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="h-[88px] px-8 flex items-center justify-between shrink-0 bg-[#F5F6FA]"><div><h2 className="text-2xl font-bold text-slate-900">工作台</h2><p className="text-sm text-slate-500 mt-1">当前项目：{activeScenario}</p></div><div className="flex items-center gap-3">{hasWorkspace && <button onClick={onClear} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"><RefreshCcw className="w-3.5 h-3.5" />清空工作区</button>}<div className={`px-3 py-1.5 rounded-full text-xs font-medium ${runtime?.configured ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{runtime?.configured ? `已连接 ${runtime.model}` : '未连接 API'}</div></div></motion.div>;
}

export function BoardHeader({ view, setView, onOpenWizard, canRunFlow, hasCompletedFlow, isRunningFlow, onRunFlow }: { view: 'kanban' | 'workflow'; setView: (v: 'kanban' | 'workflow') => void; onOpenWizard: () => void; canRunFlow: boolean; hasCompletedFlow: boolean; isRunningFlow: boolean; onRunFlow: () => void }) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }} className="px-8 py-4 flex items-center justify-between shrink-0 bg-white border-b border-slate-200 z-10 relative"><div className="flex items-center gap-6 w-full max-w-md"><button onClick={() => setView('kanban')} className={`py-2 text-sm font-semibold flex items-center gap-2 transition-colors relative ${view === 'kanban' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid className="w-4 h-4" /> 看板视图{view === 'kanban' && <motion.div layoutId="activeTab" className="absolute -bottom-4 left-0 right-0 h-0.5 bg-slate-900" />}</button><button onClick={() => setView('workflow')} className={`py-2 text-sm font-semibold flex items-center gap-2 transition-colors relative ${view === 'workflow' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}><Workflow className="w-4 h-4" /> 流程视图{view === 'workflow' && <motion.div layoutId="activeTab" className="absolute -bottom-4 left-0 right-0 h-0.5 bg-slate-900" />}</button></div><div className="flex items-center gap-4">{view === 'workflow' ? <><div className="flex items-center gap-2 mr-4"><span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${canRunFlow ? 'text-green-600 bg-green-50' : 'text-slate-500 bg-slate-100'}`}><Check className="w-3 h-3" /> {hasCompletedFlow ? '执行完成' : canRunFlow ? '已保存' : '等待生成'}</span></div><button onClick={onRunFlow} disabled={!canRunFlow || hasCompletedFlow} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm ${isRunningFlow ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 disabled:cursor-not-allowed'}`}>{isRunningFlow ? <><Square className="w-4 h-4 fill-current" /> 中止执行</> : <><Play className="w-4 h-4 fill-current" /> 一键自动推进</>}</button></> : <button onClick={onOpenWizard} className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm border border-slate-800"><Sparkles className="w-4 h-4" /> AI 构建流程</button>}</div></motion.div>;
}

export function SettingsModal({ runtime, onClose, onSaved }: { runtime: RuntimeStatus | null, onClose: () => void, onSaved: (r: RuntimeStatus) => void }) {
  const [baseUrl, setBaseUrl] = useState(runtime?.baseUrl || 'https://api.minimaxi.com/anthropic');
  const [apiKey, setApiKey] = useState(runtime?.apiKey || '');
  const [model, setModel] = useState(runtime?.model || 'MiniMax-M2.7');
  const [openrouterKey, setOpenrouterKey] = useState(runtime?.openrouterKey || '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');
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showOrKey, setShowOrKey] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const result = await saveApiConfig(baseUrl, apiKey, model, openrouterKey);
      onSaved(result);
    } catch (err) {
      console.error('Save failed:', err);
      alert(`保存失败: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  return <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-8"><motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-2xl shadow-2xl w-[520px] overflow-hidden"><div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center"><Settings className="w-4 h-4 text-green-600" /></div><h2 className="text-lg font-bold text-slate-900">系统服务配置</h2></div><button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"><ChevronDown className="w-5 h-5" /></button></div><div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto"><div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">文本模型 (MiniMax)</label><div className="space-y-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100"><div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Base URL</label><input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all shadow-sm" /></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Model</label><input value={model} onChange={e => setModel(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all shadow-sm" /></div><div className="relative"><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">API Key</label><div className="relative text-slate-600"><input type={showApiKey ? "text" : "password"} value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all shadow-sm font-mono" placeholder="sk-..." /><button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:text-green-600 transition-colors">{showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button></div></div></div></div></div><div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">多模态生图 (OpenRouter)</label><div className="p-4 bg-purple-50/30 rounded-xl border border-purple-100/50 space-y-3"><div><label className="block text-[10px] font-bold text-purple-400 mb-1 uppercase">OpenRouter Key</label><div className="relative"><input type={showOrKey ? "text" : "password"} value={openrouterKey} onChange={e => setOpenrouterKey(e.target.value)} className="w-full bg-white border border-purple-100 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all shadow-sm font-mono" placeholder="sk-or-v1-..." /><button onClick={() => setShowOrKey(!showOrKey)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-purple-400 hover:text-purple-600 transition-colors">{showOrKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button></div></div></div></div><div className="pt-4 flex justify-end gap-3"><button onClick={onClose} className="px-6 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm active:scale-95">取消</button><button onClick={handleSave} disabled={loading} className="px-8 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-lg shadow-slate-200 disabled:opacity-50 active:scale-95 flex items-center gap-2">{loading ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> 保存中...</> : '保存配置'}</button></div></div></motion.div></div>;
}
