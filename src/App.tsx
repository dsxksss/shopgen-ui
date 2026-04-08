import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  addEdge,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  LayoutGrid,
  Users,
  Calendar,
  BarChart2,
  Settings,
  MessageSquare,
  Paperclip,
  ChevronDown,
  ChevronRight,
  Hexagon,
  Workflow,
  Check,
  Loader2,
  Image as ImageIcon,
  Package,
  Play,
  Sparkles,
  CheckCircle2,
  Wand2,
  GitBranch,
  PenTool,
  ShieldAlert,
  BadgeCheck,
} from 'lucide-react';
import { generateWorkspaceView, getAgentCatalog, getRuntimeStatus } from './lib/api';
import type {
  AgentProfile,
  DashboardTask,
  RuntimeStatus,
  WorkflowPayload,
  WorkflowNodeItem,
  WizardPayload,
  WorkspaceView,
} from './lib/types';

type AgentType = 'manager' | 'designer' | 'copywriter' | 'operator' | 'service' | 'finance' | 'warehouse';
type MenuKey = 'overview' | 'new-product' | 'promo' | 'daily';

interface AgentInfo {
  id: AgentType;
  name: string;
  color: string;
  initial: string;
  nodeColor: string;
}

const AGENTS: Record<AgentType, AgentInfo> = {
  manager: { id: 'manager', name: '店长', color: 'bg-blue-500', initial: '店', nodeColor: 'bg-blue-500' },
  designer: { id: 'designer', name: '美工', color: 'bg-pink-500', initial: '美', nodeColor: 'bg-pink-500' },
  copywriter: { id: 'copywriter', name: '文案', color: 'bg-yellow-500', initial: '文', nodeColor: 'bg-yellow-500' },
  operator: { id: 'operator', name: '运营', color: 'bg-green-500', initial: '运', nodeColor: 'bg-green-500' },
  service: { id: 'service', name: '客服', color: 'bg-purple-500', initial: '客', nodeColor: 'bg-purple-500' },
  finance: { id: 'finance', name: '财务', color: 'bg-orange-500', initial: '财', nodeColor: 'bg-orange-500' },
  warehouse: { id: 'warehouse', name: '仓储', color: 'bg-teal-500', initial: '仓', nodeColor: 'bg-teal-500' },
};

const MENU_TO_SCENARIO: Record<Exclude<MenuKey, 'overview'>, string> = {
  'new-product': '新品上架流程',
  promo: '促销活动策划',
  daily: '日常经营管理',
};

function normalizeAgentId(value: string): AgentType {
  const normalized = value.trim().toLowerCase();
  if (normalized in AGENTS) return normalized as AgentType;

  const aliasMap: Record<string, AgentType> = {
    店长: 'manager',
    美工: 'designer',
    文案: 'copywriter',
    运营: 'operator',
    客服: 'service',
    财务: 'finance',
    仓储: 'warehouse',
  };

  return aliasMap[value] ?? 'manager';
}

function scenarioToMenu(scenario: string): MenuKey {
  switch (scenario) {
    case '新品上架流程':
      return 'new-product';
    case '促销活动策划':
      return 'promo';
    case '日常经营管理':
      return 'daily';
    default:
      return 'overview';
  }
}

function menuToScenario(menu: MenuKey): string {
  if (menu === 'overview') return '新品上架流程';
  return MENU_TO_SCENARIO[menu];
}

function agentIcon(agentId?: string) {
  switch (normalizeAgentId(agentId ?? 'manager')) {
    case 'designer':
      return <ImageIcon className="w-4 h-4" />;
    case 'copywriter':
      return <PenTool className="w-4 h-4" />;
    case 'operator':
      return <BarChart2 className="w-4 h-4" />;
    case 'warehouse':
      return <Package className="w-4 h-4" />;
    case 'service':
      return <MessageSquare className="w-4 h-4" />;
    case 'finance':
      return <BadgeCheck className="w-4 h-4" />;
    default:
      return <Hexagon className="w-4 h-4 fill-current" />;
  }
}

function buildReactFlowPayload(payload: WorkflowPayload) {
  const nodes: Node[] = payload.nodes.map((node: WorkflowNodeItem) => {
    if (node.kind === 'trigger') {
      return { id: node.id, type: 'triggerNode', position: { x: node.x, y: node.y }, data: { title: node.title } };
    }

    if (node.kind === 'condition') {
      return { id: node.id, type: 'conditionNode', position: { x: node.x, y: node.y }, data: { title: node.title } };
    }

    const agentId = normalizeAgentId(node.agentId ?? 'manager');
    return {
      id: node.id,
      type: 'agentNode',
      position: { x: node.x, y: node.y },
      data: {
        title: node.title,
        agentName: node.subtitle ?? `${AGENTS[agentId].name} Agent`,
        agentColor: AGENTS[agentId].nodeColor,
        icon: agentIcon(agentId),
        description: node.description ?? '',
        status: node.status === 'done' ? 'done' : node.status === 'in-progress' ? 'in-progress' : 'todo',
      },
    };
  });

  const edges: Edge[] = payload.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    label: edge.label,
    animated: edge.animated,
    style: { stroke: edge.stroke, strokeWidth: 2 },
  }));

  return { nodes, edges };
}

function DarkSidebar() {
  return (
    <motion.div initial={{ x: -72 }} animate={{ x: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="w-[72px] bg-[#1E1E24] h-full flex flex-col items-center py-6 justify-between shrink-0 z-20">
      <div className="flex flex-col items-center gap-8">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#1E1E24] mb-4 shadow-lg"><Hexagon className="w-6 h-6 fill-current" /></div>
        <div className="flex flex-col gap-6 text-slate-400">
          <button className="p-2 hover:text-white transition-colors rounded-lg hover:bg-white/10"><LayoutGrid className="w-5 h-5" /></button>
          <button className="p-2 hover:text-white transition-colors rounded-lg hover:bg-white/10"><Settings className="w-5 h-5" /></button>
        </div>
      </div>
    </motion.div>
  );
}

function NavItem({ icon, label, isActive, onClick, badge }: { icon: React.ReactNode; label: string; isActive?: boolean; onClick?: () => void; badge?: string | number }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
      <div className="flex items-center gap-3">
        {React.cloneElement(icon as React.ReactElement, { className: `w-4 h-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}` })}
        {label}
      </div>
      {badge !== undefined && badge !== null && <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-500'}`}>{badge}</span>}
    </button>
  );
}

function LightSidebar({ activeMenu, setActiveMenu, tasks }: { activeMenu: MenuKey; setActiveMenu: (menu: MenuKey) => void; tasks: DashboardTask[] }) {
  const newProductCount = tasks.filter((task) => task.workflow === '新品上架流程').length;
  const promoCount = tasks.filter((task) => task.workflow === '促销活动策划').length;
  const dailyCount = tasks.filter((task) => task.workflow === '日常经营管理').length;

  return (
    <motion.div initial={{ x: -260, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }} className="w-[260px] bg-white h-full border-r border-slate-200 flex flex-col shrink-0 z-10">
      <div className="p-6 flex items-center justify-between border-b border-slate-100">
        <h1 className="text-xl font-bold text-slate-900">ShopGen</h1>
        <button className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
      </div>
      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-8">
        <div className="px-4">
          <p className="text-xs font-bold text-slate-400 mb-2 px-2 uppercase tracking-wider">工作空间</p>
          <div className="space-y-1"><NavItem icon={<LayoutGrid />} label="总览" isActive={activeMenu === 'overview'} onClick={() => setActiveMenu('overview')} badge={tasks.length || undefined} /></div>
        </div>
        <div className="px-4">
          <div className="flex items-center justify-between mb-2 px-2"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">我的项目</p></div>
          <div className="space-y-1">
            <NavItem icon={<Package />} label="新品上架流程" badge={newProductCount || undefined} isActive={activeMenu === 'new-product'} onClick={() => setActiveMenu('new-product')} />
            <NavItem icon={<Calendar />} label="促销活动策划" badge={promoCount || undefined} isActive={activeMenu === 'promo'} onClick={() => setActiveMenu('promo')} />
            <NavItem icon={<BarChart2 />} label="日常店铺运营" badge={dailyCount || undefined} isActive={activeMenu === 'daily'} onClick={() => setActiveMenu('daily')} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TopNav({ runtime, activeScenario }: { runtime: RuntimeStatus | null; activeScenario: string }) {
  return (
    <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="h-[88px] px-8 flex items-center justify-between shrink-0 bg-[#F5F6FA]">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">工作台</h2>
        <p className="text-sm text-slate-500 mt-1">当前项目：{activeScenario}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${runtime?.configured ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
          {runtime?.configured ? `已连接 ${runtime.model}` : '未连接 API'}
        </div>
      </div>
    </motion.div>
  );
}

function BoardHeader({ view, setView, onOpenWizard, canRunFlow }: { view: 'kanban' | 'workflow'; setView: (v: 'kanban' | 'workflow') => void; onOpenWizard: () => void; canRunFlow: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }} className="px-8 py-4 flex items-center justify-between shrink-0 bg-white border-b border-slate-200 z-10 relative">
      <div className="flex items-center gap-6 w-full max-w-md">
        <button onClick={() => setView('kanban')} className={`py-2 text-sm font-semibold flex items-center gap-2 transition-colors relative ${view === 'kanban' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
          <LayoutGrid className="w-4 h-4" /> 看板视图
          {view === 'kanban' && <motion.div layoutId="activeTab" className="absolute -bottom-4 left-0 right-0 h-0.5 bg-slate-900" />}
        </button>
        <button onClick={() => setView('workflow')} className={`py-2 text-sm font-semibold flex items-center gap-2 transition-colors relative ${view === 'workflow' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
          <Workflow className="w-4 h-4" /> 流程视图
          {view === 'workflow' && <motion.div layoutId="activeTab" className="absolute -bottom-4 left-0 right-0 h-0.5 bg-slate-900" />}
        </button>
      </div>
      <div className="flex items-center gap-4">
        {view === 'workflow' && (
          <>
            <div className="flex items-center gap-2 mr-4"><span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${canRunFlow ? 'text-green-600 bg-green-50' : 'text-slate-500 bg-slate-100'}`}><Check className="w-3 h-3" /> {canRunFlow ? '已保存' : '等待生成'}</span></div>
            <button disabled={!canRunFlow} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"><Play className="w-4 h-4" /> 运行流程</button>
          </>
        )}
        {view === 'kanban' && <button onClick={onOpenWizard} className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm border border-slate-800"><Sparkles className="w-4 h-4" /> AI 构建流程</button>}
      </div>
    </motion.div>
  );
}

function TaskCard({ task, index }: { task: DashboardTask; index: number }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.3 }} whileHover={{ y: -4, transition: { duration: 0.2 } }} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group">
      <div className="flex items-start justify-between mb-1"><h4 className="font-semibold text-slate-900 text-[15px] leading-snug">{task.title}</h4></div>
      <p className="text-xs text-slate-500 mb-4">{task.workflow}</p>
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2"><span className="flex items-center gap-1.5"><LayoutGrid className="w-3.5 h-3.5" /> 进度</span><span>{task.progress}/{task.totalSteps}</span></div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${task.progressColor}`} style={{ width: `${(task.progress / task.totalSteps) * 100}%` }} /></div>
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div className={`px-2.5 py-1 rounded-md text-xs font-medium ${task.dateColor}`}>{task.date}</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <div className="flex items-center gap-1 hover:text-slate-600 transition-colors cursor-pointer"><MessageSquare className="w-3.5 h-3.5" /><span className="text-xs font-medium">{task.comments}</span></div>
            <div className="flex items-center gap-1 hover:text-slate-600 transition-colors cursor-pointer"><Paperclip className="w-3.5 h-3.5" /><span className="text-xs font-medium">{task.attachments}</span></div>
          </div>
          <div className="flex items-center -space-x-2">
            {task.agentIds.slice(0, 3).map((agentId, i) => {
              const agent = AGENTS[normalizeAgentId(agentId)];
              return <div key={i} className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white ${agent.color} shadow-sm`} title={agent.name}>{agent.initial}</div>;
            })}
            {task.agentIds.length > 3 && <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600 bg-slate-100 shadow-sm">+{task.agentIds.length - 3}</div>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Column({ title, count, tasks, emptyText }: { title: string; count: number; tasks: DashboardTask[]; emptyText: string }) {
  return (
    <div className="flex flex-col w-[340px] shrink-0 h-full">
      <div className="flex items-center justify-between mb-4 px-1"><h3 className="text-sm font-medium text-slate-500">{title} ({count})</h3></div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4 pr-2 border-2 border-dashed border-slate-200 rounded-2xl p-2 bg-slate-50/50">
        {tasks.map((task, index) => <React.Fragment key={task.id}><TaskCard task={task} index={index} /></React.Fragment>)}
        {tasks.length === 0 && <div className="h-24 flex items-center justify-center text-sm text-slate-400 font-medium">{emptyText}</div>}
      </div>
    </div>
  );
}

const AgentNode = ({ data }: any) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 w-[260px] group hover:border-purple-400 hover:shadow-md transition-all relative">
    <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 !bg-slate-300 border-2 border-white" />
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${data.agentColor} shadow-sm`}>{data.icon}</div>
        <div><h3 className="text-sm font-bold text-slate-900 leading-tight">{data.title}</h3><p className="text-xs font-medium text-slate-500">{data.agentName}</p></div>
      </div>
    </div>
    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100"><p className="text-xs text-slate-600 leading-relaxed">{data.description}</p></div>
    {data.status === 'done' && <div className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm"><Check className="w-3.5 h-3.5 text-white" /></div>}
    {data.status === 'in-progress' && <div className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm"><Loader2 className="w-3.5 h-3.5 text-white animate-spin" /></div>}
    <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 !bg-slate-300 border-2 border-white" />
  </div>
);

const TriggerNode = ({ data }: any) => (
  <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-4 w-[220px] relative">
    <div className="flex items-center gap-2 mb-2 text-purple-600"><Play className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wider">Trigger</span></div>
    <h3 className="text-sm font-semibold text-slate-900">{data.title}</h3>
    <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 !bg-purple-400 border-2 border-white" />
  </div>
);

const ConditionNode = ({ data }: any) => (
  <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-4 w-[200px] relative">
    <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 !bg-orange-300 border-2 border-white" />
    <div className="flex items-center gap-2 mb-2 text-orange-600"><GitBranch className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wider">Condition</span></div>
    <h3 className="text-sm font-semibold text-slate-900">{data.title}</h3>
    <Handle type="source" position={Position.Right} id="true" style={{ top: '30%' }} className="w-2.5 h-2.5 !bg-green-400 border-2 border-white" />
    <Handle type="source" position={Position.Right} id="false" style={{ top: '70%' }} className="w-2.5 h-2.5 !bg-red-400 border-2 border-white" />
  </div>
);

const nodeTypes = { agentNode: AgentNode, triggerNode: TriggerNode, conditionNode: ConditionNode };

function WorkflowView({ workflow, hasPlan }: { workflow: WorkflowPayload | null; hasPlan: boolean }) {
  const reactFlowPayload = useMemo(() => buildReactFlowPayload(workflow ?? { selectedNodeId: '', nodes: [], edges: [], inspectors: {} }), [workflow]);
  const [nodes, setNodes, onNodesChange] = useNodesState(reactFlowPayload.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(reactFlowPayload.edges);
  const [selectedNodeId, setSelectedNodeId] = useState(workflow?.selectedNodeId ?? '');

  useEffect(() => {
    setNodes(reactFlowPayload.nodes);
    setEdges(reactFlowPayload.edges);
    setSelectedNodeId(workflow?.selectedNodeId ?? '');
  }, [reactFlowPayload, workflow, setEdges, setNodes]);

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } } as Edge, eds)), [setEdges]);
  const inspector = (workflow?.inspectors ?? {})[selectedNodeId] ?? {
    title: '等待流程生成',
    agentName: '店长 Agent',
    status: '当前还没有真实流程节点',
    statusSubtitle: '请先通过 AI 构建流程生成真实任务。',
    statusTone: 'todo' as const,
    inputs: [{ label: '状态', value: '未生成' }, { label: '说明', value: '当前页面不展示任何默认流程 mock。' }],
    tools: [{ label: 'Agent 调度', progress: 0, active: false }, { label: '任务编排', progress: 0, active: false }],
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="flex-1 w-full h-full relative bg-[#fafafa]">
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_, node) => setSelectedNodeId(node.id)} nodeTypes={nodeTypes} fitView attributionPosition="bottom-right">
        <Background color="#e2e8f0" gap={16} size={1} />
        <Controls className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden" />
        <MiniMap nodeColor={(node) => node.type === 'triggerNode' ? '#c084fc' : node.type === 'conditionNode' ? '#fdba74' : '#94a3b8'} maskColor="rgba(248, 250, 252, 0.7)" className="bg-white border border-slate-200 shadow-sm rounded-xl" />
      </ReactFlow>

      {!hasPlan && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="bg-white/95 backdrop-blur rounded-2xl border border-slate-200 px-6 py-4 shadow-sm text-sm text-slate-500">暂无真实流程，先通过 AI 构建流程生成任务。</div></div>}

      <div className="absolute top-4 right-4 w-80 bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col h-[calc(100%-2rem)] z-10 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${inspector.statusTone === 'done' ? 'bg-green-100 text-green-600' : inspector.statusTone === 'in-progress' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}><ImageIcon className="w-4 h-4" /></div><div><h3 className="text-sm font-bold text-slate-900">{inspector.title}</h3><p className="text-xs text-slate-500">{inspector.agentName}</p></div></div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">执行状态</label>
            <div className={`${inspector.statusTone === 'done' ? 'bg-green-50 border-green-200' : inspector.statusTone === 'in-progress' ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200'} border rounded-lg p-3 flex items-center gap-3`}>
              {inspector.statusTone === 'done' ? <Check className="w-5 h-5 text-green-500" /> : inspector.statusTone === 'in-progress' ? <Loader2 className="w-5 h-5 text-orange-500 animate-spin" /> : <ShieldAlert className="w-5 h-5 text-slate-400" />}
              <div><p className={`text-sm font-semibold ${inspector.statusTone === 'done' ? 'text-green-700' : inspector.statusTone === 'in-progress' ? 'text-orange-700' : 'text-slate-700'}`}>{inspector.status}</p><p className={`text-xs ${inspector.statusTone === 'done' ? 'text-green-600/80' : inspector.statusTone === 'in-progress' ? 'text-orange-600/80' : 'text-slate-500'}`}>{inspector.statusSubtitle}</p></div>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">输入参数</label>
            <div className="space-y-2">{inspector.inputs.map((item) => <div key={item.label} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5"><span className="text-xs text-slate-500 block mb-1">{item.label}</span><span className="text-sm font-medium text-slate-900">{item.value}</span></div>)}</div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">AI 技能调用</label>
            <div className="border border-slate-200 rounded-lg overflow-hidden">{inspector.tools.map((tool, index) => <div key={tool.label} className={`p-3 flex items-center justify-between ${index < inspector.tools.length - 1 ? 'border-b border-slate-100' : ''} ${tool.active ? 'bg-slate-50' : 'bg-white'}`}><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${tool.progress === 100 ? 'bg-green-500' : tool.active ? 'bg-orange-500 animate-pulse' : 'bg-slate-300'}`}></div><span className="text-sm font-medium text-slate-700">{tool.label}</span></div><span className="text-xs text-slate-400">{tool.progress}%</span></div>)}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function KanbanBoard({ tasks, activeScenario }: { tasks: DashboardTask[]; activeScenario: string }) {
  const scopedTasks = activeScenario === '总览' ? tasks : tasks.filter((task) => task.workflow === activeScenario);
  const todoTasks = scopedTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = scopedTasks.filter((t) => t.status === 'in-progress');
  const doneTasks = scopedTasks.filter((t) => t.status === 'done');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }} className="flex-1 overflow-x-auto overflow-y-hidden px-8 pb-8 pt-4 flex gap-6">
      <Column title="待办" count={todoTasks.length} tasks={todoTasks} emptyText="等待真实任务生成..." />
      <Column title="执行中" count={inProgressTasks.length} tasks={inProgressTasks} emptyText="当前没有执行中的真实任务" />
      <Column title="已完成" count={doneTasks.length} tasks={doneTasks} emptyText="完成任务后会显示在这里" />
    </motion.div>
  );
}

function WorkflowWizard({ onClose, onComplete, scenario, runtime, initialPrompt }: { onClose: () => void; onComplete: (view: WorkspaceView) => void; scenario: string; runtime: RuntimeStatus | null; initialPrompt: string }) {
  const [step, setStep] = useState(1);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [workspace, setWorkspace] = useState<WorkspaceView | null>(null);

  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);

  const wizard: WizardPayload | null = workspace?.wizard ?? null;

  async function startGenerate() {
    if (!prompt.trim()) return;
    setError('');
    setLoading(true);
    setStep(2);
    try {
      const result = await generateWorkspaceView(prompt.trim(), scenario);
      setWorkspace(result);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成流程失败');
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  const StepIcon = ({ current, stepNum, icon: Icon }: any) => {
    if (current > stepNum) return <div className="w-10 h-10 rounded-full bg-green-100 text-green-500 flex items-center justify-center z-10 relative"><Check className="w-5 h-5" /></div>;
    if (current === stepNum) return <div className="w-10 h-10 rounded-full border-2 border-dashed border-green-400 flex items-center justify-center p-1 z-10 relative bg-white"><div className="w-full h-full bg-green-400 rounded-full flex items-center justify-center text-white"><Icon className="w-4 h-4" /></div></div>;
    return <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center z-10 relative border-4 border-white"><Icon className="w-5 h-5" /></div>;
  };

  return (
    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col">
        <div className="p-10 pb-8">
          <div className="flex items-center justify-between px-8 relative">
            <div className="absolute top-5 left-16 right-16 h-0.5 bg-slate-100 z-0"><div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div></div>
            <div className="flex flex-col items-center gap-3"><StepIcon current={step} stepNum={1} icon={MessageSquare} /><span className="text-sm font-bold text-slate-900">需求描述</span></div>
            <div className="flex flex-col items-center gap-3"><StepIcon current={step} stepNum={2} icon={Wand2} /><span className="text-sm font-bold text-slate-900">任务拆解</span></div>
            <div className="flex flex-col items-center gap-3"><StepIcon current={step} stepNum={3} icon={Users} /><span className="text-sm font-bold text-slate-900">团队配置</span></div>
            <div className="flex flex-col items-center gap-3"><StepIcon current={step} stepNum={4} icon={CheckCircle2} /><span className="text-sm font-bold text-slate-900">确认执行</span></div>
          </div>
        </div>

        <div className="px-8 pb-8">
          <div className="grid grid-cols-4 gap-4 bg-slate-50/80 p-4 rounded-2xl">
            <div className={`flex flex-col p-5 rounded-2xl h-[280px] transition-all duration-300 ${step === 1 ? 'border-2 border-green-400 bg-white shadow-md scale-[1.02]' : step > 1 ? 'bg-white shadow-sm border border-slate-200' : 'border-2 border-dashed border-slate-200 bg-transparent'}`}>
              {step === 1 && <><h3 className="font-bold text-slate-900 mb-3 text-sm">输入需求</h3><textarea className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all" placeholder="例如：帮我策划一场春季上新活动..." value={prompt} onChange={(e) => setPrompt(e.target.value)} autoFocus />{error && <p className="mt-2 text-xs text-red-500">{error}</p>}<button onClick={startGenerate} disabled={!prompt.trim() || !runtime?.configured || loading} className="mt-3 w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-slate-800 transition-colors">下一步</button></>}
              {step > 1 && <><h3 className="font-bold text-slate-900 mb-3 text-sm">需求详情</h3><div className="flex-1 text-sm text-slate-600 overflow-hidden relative"><p>{wizard?.prompt ?? prompt}</p><div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent"></div></div><button onClick={() => setStep(1)} className="mt-3 w-full py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">修改需求</button></>}
            </div>

            <div className={`flex flex-col p-5 rounded-2xl h-[280px] transition-all duration-300 ${step === 2 ? 'border-2 border-green-400 bg-white shadow-md scale-[1.02]' : step > 2 ? 'bg-white shadow-sm border border-slate-200' : 'border-2 border-dashed border-slate-200 bg-transparent'}`}>
              {step === 2 && <div className="flex-1 flex flex-col items-center justify-center text-center"><div className="relative mb-4"><div className="w-12 h-12 border-4 border-green-100 border-t-green-500 rounded-full animate-spin"></div><Wand2 className="w-5 h-5 text-green-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" /></div><p className="text-sm font-bold text-slate-900">AI 正在拆解任务...</p><p className="text-xs text-slate-500 mt-1">后端正在生成看板、流程图和团队分工</p></div>}
              {step > 2 && wizard && <><h3 className="font-bold text-slate-900 mb-3 text-sm">拆解结果</h3><div className="flex-1"><ul className="text-sm text-slate-600 space-y-3">{wizard.breakdown.slice(0, 3).map((item) => <li key={item} className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> <span>{item}</span></li>)}</ul></div><button className="mt-3 w-full py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">查看详情</button></>}
            </div>

            <div className={`flex flex-col p-5 rounded-2xl h-[280px] transition-all duration-300 ${step === 3 ? 'border-2 border-green-400 bg-white shadow-md scale-[1.02]' : step > 3 ? 'bg-white shadow-sm border border-slate-200' : 'border-2 border-dashed border-slate-200 bg-transparent'}`}>
              {step === 3 && wizard && <><h3 className="font-bold text-slate-900 mb-3 text-sm">分配团队</h3><div className="flex-1 overflow-y-auto space-y-2 pr-1">{wizard.teamObjectives.slice(0, 4).map((assignment) => { const agent = AGENTS[normalizeAgentId(assignment.agentId)]; return <div key={assignment.agentId + assignment.objective} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100"><div className={`w-8 h-8 ${agent.color} rounded-lg text-white flex items-center justify-center text-sm font-bold shadow-sm`}>{agent.initial}</div><div><p className="text-sm font-bold text-slate-900 leading-none">{assignment.agentName}</p><p className="text-[10px] text-slate-500 mt-1">{assignment.objective}</p></div></div>; })}</div><button onClick={() => setStep(4)} className="mt-3 w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">确认团队</button></>}
              {step > 3 && wizard && <><h3 className="font-bold text-slate-900 mb-3 text-sm">团队配置</h3><div className="flex-1 flex flex-wrap gap-2 content-start">{wizard.teamAgentIds.slice(0, 4).map((agentId, index) => { const agent = AGENTS[normalizeAgentId(agentId)]; return <div key={agentId + index} className={`w-10 h-10 ${agent.color} rounded-full text-white flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm ${index > 0 ? '-ml-4' : ''}`}>{agent.initial}</div>; })}</div><button onClick={() => setStep(3)} className="mt-3 w-full py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">调整人员</button></>}
            </div>

            <div className={`flex flex-col p-5 rounded-2xl h-[280px] transition-all duration-300 ${step === 4 ? 'border-2 border-green-400 bg-white shadow-md scale-[1.02]' : 'border-2 border-dashed border-slate-200 bg-transparent'}`}>
              {step === 4 && wizard && <><h3 className="font-bold text-slate-900 mb-3 text-sm">准备就绪</h3><div className="flex-1 flex flex-col items-center justify-center text-center"><div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4"><CheckCircle2 className="w-8 h-8" /></div><p className="text-sm font-bold text-slate-900 mb-1">配置完成</p><p className="text-xs text-slate-500">{wizard.readySummary}</p></div><button onClick={() => workspace && onComplete(workspace)} className="mt-3 w-full py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors shadow-sm shadow-green-500/20">生成工作流</button></>}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 p-4 px-8 flex items-center justify-between bg-white"><span className="text-sm font-bold text-slate-900">Plan your workflow</span><button onClick={onClose} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Close panel <ChevronDown className="w-4 h-4" /></button></div>
      </motion.div>
    </div>
  );
}

function MainContent({ runtime, workspace, setWorkspace, scenario, setScenario, draftPrompt, setDraftPrompt }: { runtime: RuntimeStatus | null; workspace: WorkspaceView | null; setWorkspace: (view: WorkspaceView | null) => void; scenario: string; setScenario: (scenario: string) => void; draftPrompt: string; setDraftPrompt: (prompt: string) => void }) {
  const [view, setView] = useState<'kanban' | 'workflow'>('kanban');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuKey>(scenarioToMenu(scenario));

  useEffect(() => {
    if (activeMenu !== 'overview') setScenario(menuToScenario(activeMenu));
  }, [activeMenu, setScenario]);

  useEffect(() => {
    setActiveMenu(scenarioToMenu(scenario));
  }, [scenario]);

  const tasks = workspace?.tasks ?? [];
  const workflow = workspace?.workflow ?? null;
  const activeScenario = activeMenu === 'overview' ? '总览' : menuToScenario(activeMenu);

  return (
    <>
      <LightSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} tasks={tasks} />
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F5F6FA] relative">
        <TopNav runtime={runtime} activeScenario={activeScenario} />
        <BoardHeader view={view} setView={setView} onOpenWizard={() => setIsWizardOpen(true)} canRunFlow={Boolean(workspace)} />
        {view === 'kanban' ? <KanbanBoard tasks={tasks} activeScenario={activeScenario} /> : <WorkflowView workflow={workflow} hasPlan={Boolean(workspace)} />}
        <AnimatePresence>{isWizardOpen && <WorkflowWizard scenario={scenario} runtime={runtime} initialPrompt={draftPrompt} onClose={() => setIsWizardOpen(false)} onComplete={(nextWorkspace) => { setWorkspace(nextWorkspace); setDraftPrompt(nextWorkspace.plan.merchantIntent); setIsWizardOpen(false); setView('workflow'); }} />}</AnimatePresence>
      </div>
    </>
  );
}

export default function App() {
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [scenario, setScenario] = useState('新品上架流程');
  const [workspace, setWorkspace] = useState<WorkspaceView | null>(null);
  const [draftPrompt, setDraftPrompt] = useState('请帮我为春季新款女装做一套完整的新品上架方案，包含主图方向、标题卖点、上架节奏、库存建议和客服话术。');

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const [runtimeStatus, agentCatalog] = await Promise.all([getRuntimeStatus(), getAgentCatalog()]);
        if (!cancelled) {
          setRuntime(runtimeStatus);
          setProfiles(agentCatalog);
        }
      } catch (error) {
        if (!cancelled) {
          setRuntime({ configured: false, provider: 'MiniMax Anthropic Compatible API', baseUrl: 'https://api.minimaxi.com/anthropic', model: 'MiniMax-M2.7', readyMessage: error instanceof Error ? error.message : '当前页面未运行在 Tauri 桌面环境中。' });
        }
      }
    }
    bootstrap();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex h-screen w-full bg-[#F5F6FA] text-slate-800 font-sans overflow-hidden">
      <DarkSidebar />
      <MainContent runtime={runtime} workspace={workspace} setWorkspace={setWorkspace} scenario={scenario} setScenario={setScenario} draftPrompt={draftPrompt} setDraftPrompt={setDraftPrompt} />
    </div>
  );
}
