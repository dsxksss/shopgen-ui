import React, { useState, useCallback, useEffect } from 'react';
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
  Connection,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  LayoutGrid,
  Users,
  Calendar,
  BarChart2,
  Cloud,
  Map as MapIcon,
  Settings,
  LogOut,
  Plus,
  Search,
  Bell,
  MoreHorizontal,
  MessageSquare,
  Paperclip,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  Hexagon,
  Filter,
  ArrowUpDown,
  Workflow,
  Check,
  Loader2,
  Image as ImageIcon,
  PenTool,
  Package,
  Play,
  Save,
  MoreVertical,
  GitBranch,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Wand2,
  X
} from 'lucide-react';

type AgentType = 'Manager' | 'Designer' | 'Copywriter' | 'Operator' | 'Service' | 'Finance' | 'Warehouse';

interface AgentInfo {
  id: AgentType;
  name: string;
  color: string;
  initial: string;
}

const AGENTS: Record<AgentType, AgentInfo> = {
  Manager: { id: 'Manager', name: '店长', color: 'bg-blue-500', initial: '店' },
  Designer: { id: 'Designer', name: '美工', color: 'bg-pink-500', initial: '美' },
  Copywriter: { id: 'Copywriter', name: '文案', color: 'bg-yellow-500', initial: '文' },
  Operator: { id: 'Operator', name: '运营', color: 'bg-green-500', initial: '运' },
  Service: { id: 'Service', name: '客服', color: 'bg-purple-500', initial: '客' },
  Finance: { id: 'Finance', name: '财务', color: 'bg-orange-500', initial: '财' },
  Warehouse: { id: 'Warehouse', name: '仓储', color: 'bg-teal-500', initial: '仓' },
};

type TaskStatus = 'todo' | 'in-progress' | 'done';

interface Task {
  id: string;
  title: string;
  workflow: string;
  progress: number;
  totalSteps: number;
  date: string;
  comments: number;
  attachments: number;
  agents: AgentType[];
  status: TaskStatus;
  progressColor: string;
  dateColor: string;
}

const mockTasks: Task[] = [
  {
    id: '1',
    title: '春季碎花连衣裙上新',
    workflow: '新品上架流程',
    progress: 7,
    totalSteps: 10,
    date: '24 Aug 2026',
    comments: 7,
    attachments: 2,
    agents: ['Manager', 'Designer', 'Copywriter', 'Operator'],
    status: 'todo',
    progressColor: 'bg-orange-400',
    dateColor: 'text-orange-500 bg-orange-50',
  },
  {
    id: '2',
    title: '618大促主会场设计',
    workflow: '促销活动策划',
    progress: 4,
    totalSteps: 10,
    date: '25 Aug 2026',
    comments: 12,
    attachments: 5,
    agents: ['Manager', 'Designer', 'Operator'],
    status: 'todo',
    progressColor: 'bg-orange-400',
    dateColor: 'text-red-500 bg-red-50',
  },
  {
    id: '3',
    title: '日常客服自动回复优化',
    workflow: '日常经营管理',
    progress: 3,
    totalSteps: 10,
    date: '26 Aug 2026',
    comments: 6,
    attachments: 4,
    agents: ['Manager', 'Service'],
    status: 'todo',
    progressColor: 'bg-orange-400',
    dateColor: 'text-red-500 bg-red-50',
  },
  {
    id: '4',
    title: '夏季T恤爆款推广',
    workflow: '促销活动策划',
    progress: 2,
    totalSteps: 14,
    date: '27 Aug 2026',
    comments: 2,
    attachments: 1,
    agents: ['Manager', 'Operator', 'Copywriter'],
    status: 'todo',
    progressColor: 'bg-orange-400',
    dateColor: 'text-red-500 bg-red-50',
  },
  {
    id: '5',
    title: '店铺首页视觉升级',
    workflow: '日常经营管理',
    progress: 3,
    totalSteps: 10,
    date: '12 Nov 2026',
    comments: 4,
    attachments: 2,
    agents: ['Manager', 'Designer'],
    status: 'in-progress',
    progressColor: 'bg-orange-400',
    dateColor: 'text-red-500 bg-red-50',
  },
  {
    id: '6',
    title: '双11预热方案制定',
    workflow: '促销活动策划',
    progress: 7,
    totalSteps: 10,
    date: '13 Nov 2026',
    comments: 2,
    attachments: 13,
    agents: ['Manager', 'Operator', 'Finance'],
    status: 'in-progress',
    progressColor: 'bg-orange-400',
    dateColor: 'text-slate-500 bg-slate-100',
  },
  {
    id: '7',
    title: '库存预警系统对接',
    workflow: '日常经营管理',
    progress: 4,
    totalSteps: 10,
    date: '14 Nov 2026',
    comments: 8,
    attachments: 2,
    agents: ['Manager', 'Warehouse'],
    status: 'in-progress',
    progressColor: 'bg-red-400',
    dateColor: 'text-red-500 bg-red-50',
  },
  {
    id: '8',
    title: '月度财务报表生成',
    workflow: '日常经营管理',
    progress: 3,
    totalSteps: 10,
    date: '15 Nov 2026',
    comments: 23,
    attachments: 12,
    agents: ['Manager', 'Finance'],
    status: 'in-progress',
    progressColor: 'bg-orange-400',
    dateColor: 'text-orange-500 bg-orange-50',
  },
  {
    id: '9',
    title: '上架：秋季针织衫',
    workflow: '新品上架流程',
    progress: 10,
    totalSteps: 10,
    date: '6 Jan 2026',
    comments: 1,
    attachments: 5,
    agents: ['Manager', 'Designer', 'Copywriter', 'Warehouse'],
    status: 'done',
    progressColor: 'bg-green-500',
    dateColor: 'text-slate-500 bg-slate-100',
  },
  {
    id: '10',
    title: '情人节活动复盘',
    workflow: '促销活动策划',
    progress: 10,
    totalSteps: 10,
    date: '7 Jan 2026',
    comments: 17,
    attachments: 3,
    agents: ['Manager', 'Operator', 'Finance'],
    status: 'done',
    progressColor: 'bg-green-500',
    dateColor: 'text-slate-500 bg-slate-100',
  },
  {
    id: '11',
    title: '更新退换货政策',
    workflow: '日常经营管理',
    progress: 10,
    totalSteps: 10,
    date: '8 Jan 2026',
    comments: 5,
    attachments: 2,
    agents: ['Manager', 'Service'],
    status: 'done',
    progressColor: 'bg-green-500',
    dateColor: 'text-slate-500 bg-slate-100',
  },
];

function DarkSidebar() {
  return (
    <motion.div 
      initial={{ x: -72 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-[72px] bg-[#1E1E24] h-full flex flex-col items-center py-6 justify-between shrink-0 z-20"
    >
      <div className="flex flex-col items-center gap-8">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#1E1E24] mb-4 shadow-lg">
          <Hexagon className="w-6 h-6 fill-current" />
        </div>
        <div className="flex flex-col gap-6 text-slate-400">
          <button className="p-2 hover:text-white transition-colors rounded-lg hover:bg-white/10"><LayoutGrid className="w-5 h-5" /></button>
          <button className="p-2 hover:text-white transition-colors rounded-lg hover:bg-white/10"><Settings className="w-5 h-5" /></button>
        </div>
      </div>
    </motion.div>
  );
}

function NavItem({ icon, label, isActive, onClick, badge }: { icon: React.ReactNode, label: string, isActive?: boolean, onClick?: () => void, badge?: string | number }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <div className="flex items-center gap-3">
        {React.cloneElement(icon as React.ReactElement, { className: `w-4 h-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}` })}
        {label}
      </div>
      {badge && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-500'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function LightSidebar() {
  const [isDark, setIsDark] = useState(false);
  const [activeMenu, setActiveMenu] = useState('new-product');

  return (
    <motion.div 
      initial={{ x: -260, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
      className="w-[260px] bg-white h-full border-r border-slate-200 flex flex-col shrink-0 z-10"
    >
      <div className="p-6 flex items-center justify-between border-b border-slate-100">
        <h1 className="text-xl font-bold text-slate-900">ShopGen</h1>
        <button className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-8">
        <div className="px-4">
          <p className="text-xs font-bold text-slate-400 mb-2 px-2 uppercase tracking-wider">工作空间</p>
          <div className="space-y-1">
            <NavItem 
              icon={<LayoutGrid />} 
              label="总览" 
              isActive={activeMenu === 'overview'} 
              onClick={() => setActiveMenu('overview')} 
            />
          </div>
        </div>

        <div className="px-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">我的项目</p>
          </div>
          <div className="space-y-1">
            <NavItem 
              icon={<Package />} 
              label="新品上架流程" 
              isActive={activeMenu === 'new-product'} 
              onClick={() => setActiveMenu('new-product')} 
            />
            <NavItem 
              icon={<Calendar />} 
              label="618大促策划" 
              isActive={activeMenu === 'promo'} 
              onClick={() => setActiveMenu('promo')} 
            />
            <NavItem 
              icon={<BarChart2 />} 
              label="日常店铺运营" 
              isActive={activeMenu === 'daily'} 
              onClick={() => setActiveMenu('daily')} 
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TopNav() {
  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="h-[88px] px-8 flex items-center justify-between shrink-0 bg-[#F5F6FA]"
    >
      <h2 className="text-2xl font-bold text-slate-900">工作台</h2>
      <div className="flex items-center gap-6">
      </div>
    </motion.div>
  );
}

function BoardHeader({ view, setView, onOpenWizard }: { view: 'kanban' | 'workflow', setView: (v: 'kanban' | 'workflow') => void, onOpenWizard: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="px-8 py-4 flex items-center justify-between shrink-0 bg-white border-b border-slate-200 z-10 relative"
    >
      <div className="flex items-center gap-6 w-full max-w-md">
        <button 
          onClick={() => setView('kanban')}
          className={`py-2 text-sm font-semibold flex items-center gap-2 transition-colors relative ${view === 'kanban' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <LayoutGrid className="w-4 h-4" /> 看板视图
          {view === 'kanban' && <motion.div layoutId="activeTab" className="absolute -bottom-4 left-0 right-0 h-0.5 bg-slate-900" />}
        </button>
        <button 
          onClick={() => setView('workflow')}
          className={`py-2 text-sm font-semibold flex items-center gap-2 transition-colors relative ${view === 'workflow' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Workflow className="w-4 h-4" /> 流程视图
          {view === 'workflow' && <motion.div layoutId="activeTab" className="absolute -bottom-4 left-0 right-0 h-0.5 bg-slate-900" />}
        </button>
      </div>
      <div className="flex items-center gap-4">
        {view === 'workflow' && (
          <>
            <div className="flex items-center gap-2 mr-4">
              <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md">
                <Check className="w-3 h-3" /> 已保存
              </span>
            </div>
            <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm">
              <Play className="w-4 h-4" /> 运行流程
            </button>
          </>
        )}
        {view === 'kanban' && (
          <button 
            onClick={onOpenWizard}
            className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm border border-slate-800"
          >
            <Sparkles className="w-4 h-4" /> AI 构建流程
          </button>
        )}
      </div>
    </motion.div>
  );
}

function TaskCard({ task, index }: { task: Task; index: number; key?: string | number }) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group"
    >
      <div className="flex items-start justify-between mb-1">
        <h4 className="font-semibold text-slate-900 text-[15px] leading-snug">{task.title}</h4>
      </div>
      <p className="text-xs text-slate-500 mb-4">{task.workflow}</p>
      
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
          <span className="flex items-center gap-1.5"><LayoutGrid className="w-3.5 h-3.5" /> 进度</span>
          <span>{task.progress}/{task.totalSteps}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${task.progressColor}`} 
            style={{ width: `${(task.progress / task.totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div className={`px-2.5 py-1 rounded-md text-xs font-medium ${task.dateColor}`}>
          {task.date}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <div className="flex items-center gap-1 hover:text-slate-600 transition-colors cursor-pointer">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{task.comments}</span>
            </div>
            <div className="flex items-center gap-1 hover:text-slate-600 transition-colors cursor-pointer">
              <Paperclip className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{task.attachments}</span>
            </div>
          </div>
          <div className="flex items-center -space-x-2">
            {task.agents.slice(0, 3).map((agentId, i) => {
              const agent = AGENTS[agentId];
              return (
                <div 
                  key={i} 
                  className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white ${agent.color} shadow-sm`}
                  title={agent.name}
                >
                  {agent.initial}
                </div>
              );
            })}
            {task.agents.length > 3 && (
              <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600 bg-slate-100 shadow-sm">
                +{task.agents.length - 3}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Column({ title, count, tasks }: { title: string, count: number, tasks: Task[] }) {
  return (
    <div className="flex flex-col w-[340px] shrink-0 h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-sm font-medium text-slate-500">{title} ({count})</h3>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4 pr-2 border-2 border-dashed border-slate-200 rounded-2xl p-2 bg-slate-50/50">
        {tasks.map((task, index) => (
          <TaskCard key={task.id} task={task} index={index} />
        ))}
        {tasks.length === 0 && (
          <div className="h-24 flex items-center justify-center text-sm text-slate-400 font-medium">
            拖拽任务到此处...
          </div>
        )}
      </div>
    </div>
  );
}

const AgentNode = ({ data }: any) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 w-[260px] group hover:border-purple-400 hover:shadow-md transition-all relative">
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 !bg-slate-300 border-2 border-white" />
      
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${data.agentColor} shadow-sm`}>
            {data.icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">{data.title}</h3>
            <p className="text-xs font-medium text-slate-500">{data.agentName}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
        <p className="text-xs text-slate-600 leading-relaxed">{data.description}</p>
      </div>

      {data.status === 'done' && (
        <div className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      {data.status === 'in-progress' && (
        <div className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
          <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
        </div>
      )}
      
      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 !bg-slate-300 border-2 border-white" />
    </div>
  );
};

const TriggerNode = ({ data }: any) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-4 w-[220px] relative">
      <div className="flex items-center gap-2 mb-2 text-purple-600">
        <Play className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Trigger</span>
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{data.title}</h3>
      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 !bg-purple-400 border-2 border-white" />
    </div>
  );
};

const ConditionNode = ({ data }: any) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-4 w-[200px] relative">
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 !bg-orange-300 border-2 border-white" />
      <div className="flex items-center gap-2 mb-2 text-orange-600">
        <GitBranch className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Condition</span>
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{data.title}</h3>
      <Handle type="source" position={Position.Right} id="true" style={{ top: '30%' }} className="w-2.5 h-2.5 !bg-green-400 border-2 border-white" />
      <Handle type="source" position={Position.Right} id="false" style={{ top: '70%' }} className="w-2.5 h-2.5 !bg-red-400 border-2 border-white" />
    </div>
  );
};

const nodeTypes = {
  agentNode: AgentNode,
  triggerNode: TriggerNode,
  conditionNode: ConditionNode,
};

const initialNodes = [
  {
    id: 'trigger',
    type: 'triggerNode',
    position: { x: 50, y: 250 },
    data: { title: '商家提供商品信息' }
  },
  {
    id: '1',
    type: 'agentNode',
    position: { x: 320, y: 250 },
    data: {
      title: '分析任务与分配',
      agentName: '店长 (Manager)',
      agentColor: 'bg-blue-500',
      icon: <Users className="w-4 h-4" />,
      description: '分析商品信息，拆解任务并分配给对应Agent',
      status: 'done'
    }
  },
  {
    id: 'cond1',
    type: 'conditionNode',
    position: { x: 650, y: 250 },
    data: { title: '是否需要重新拍摄?' }
  },
  {
    id: '2',
    type: 'agentNode',
    position: { x: 950, y: 100 },
    data: {
      title: '设计商品主图/详情页',
      agentName: '美工 (Designer)',
      agentColor: 'bg-pink-500',
      icon: <ImageIcon className="w-4 h-4" />,
      description: '利用AI绘图生成高质量商品展示图和Banner',
      status: 'in-progress'
    }
  },
  {
    id: '3',
    type: 'agentNode',
    position: { x: 950, y: 250 },
    data: {
      title: '撰写商品文案',
      agentName: '文案 (Copywriter)',
      agentColor: 'bg-yellow-500',
      icon: <PenTool className="w-4 h-4" />,
      description: '提炼核心卖点，生成SEO优化标题和详情文案',
      status: 'todo'
    }
  },
  {
    id: '4',
    type: 'agentNode',
    position: { x: 950, y: 400 },
    data: {
      title: '制定上架与推广策略',
      agentName: '运营 (Operator)',
      agentColor: 'bg-green-500',
      icon: <BarChart2 className="w-4 h-4" />,
      description: '分析竞品数据，制定首发价格和推广计划',
      status: 'todo'
    }
  },
  {
    id: '5',
    type: 'agentNode',
    position: { x: 1300, y: 250 },
    data: {
      title: '自动完成上架',
      agentName: '仓储 (Warehouse)',
      agentColor: 'bg-teal-500',
      icon: <Package className="w-4 h-4" />,
      description: '设置初始库存，同步至各大电商平台',
      status: 'todo'
    }
  }
];

const initialEdges = [
  { id: 'e-trigger-1', source: 'trigger', target: '1', animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } },
  { id: 'e1-cond1', source: '1', target: 'cond1', animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } },
  { id: 'e-cond1-2', source: 'cond1', target: '2', sourceHandle: 'true', animated: true, label: '需要', style: { stroke: '#f97316', strokeWidth: 2 } },
  { id: 'e-cond1-3', source: 'cond1', target: '3', sourceHandle: 'false', animated: true, label: '不需要', style: { stroke: '#f97316', strokeWidth: 2 } },
  { id: 'e-cond1-4', source: 'cond1', target: '4', sourceHandle: 'false', animated: true, style: { stroke: '#f97316', strokeWidth: 2 } },
  { id: 'e2-5', source: '2', target: '5', style: { stroke: '#cbd5e1', strokeWidth: 2 } },
  { id: 'e3-5', source: '3', target: '5', style: { stroke: '#cbd5e1', strokeWidth: 2 } },
  { id: 'e4-5', source: '4', target: '5', style: { stroke: '#cbd5e1', strokeWidth: 2 } },
];

function WorkflowView() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } } as Edge, eds)),
    [setEdges],
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex-1 w-full h-full relative bg-[#fafafa]"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Background color="#e2e8f0" gap={16} size={1} />
        <Controls className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden" />
        <MiniMap 
          nodeColor={(node) => {
            switch (node.type) {
              case 'triggerNode': return '#c084fc';
              case 'conditionNode': return '#fdba74';
              default: return '#94a3b8';
            }
          }}
          maskColor="rgba(248, 250, 252, 0.7)"
          className="bg-white border border-slate-200 shadow-sm rounded-xl"
        />
      </ReactFlow>

      {/* Right Sidebar for Node Properties */}
      <div className="absolute top-4 right-4 w-80 bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col h-[calc(100%-2rem)] z-10 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">设计商品图</h3>
              <p className="text-xs text-slate-500">美工 Agent</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">执行状态</label>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
              <div>
                <p className="text-sm font-semibold text-orange-700">正在生成主图...</p>
                <p className="text-xs text-orange-600/80">已耗时 12s</p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">输入参数</label>
            <div className="space-y-2">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <span className="text-xs text-slate-500 block mb-1">商品名称</span>
                <span className="text-sm font-medium text-slate-900">春季碎花连衣裙</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <span className="text-xs text-slate-500 block mb-1">风格要求</span>
                <span className="text-sm font-medium text-slate-900">清新、日系、户外光</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">AI 技能调用</label>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-slate-700">Midjourney V6</span>
                </div>
                <span className="text-xs text-slate-400">100%</span>
              </div>
              <div className="p-3 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                  <span className="text-sm font-medium text-slate-700">图像超分增强</span>
                </div>
                <span className="text-xs text-slate-400">45%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function KanbanBoard() {
  const todoTasks = mockTasks.filter(t => t.status === 'todo');
  const inProgressTasks = mockTasks.filter(t => t.status === 'in-progress');
  const doneTasks = mockTasks.filter(t => t.status === 'done');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="flex-1 overflow-x-auto overflow-y-hidden px-8 pb-8 pt-4 flex gap-6"
    >
      <Column title="待办" count={todoTasks.length} tasks={todoTasks} />
      <Column title="执行中" count={inProgressTasks.length} tasks={inProgressTasks} />
      <Column title="已完成" count={doneTasks.length} tasks={doneTasks} />
    </motion.div>
  );
}

function WorkflowWizard({ onClose, onComplete }: { onClose: () => void, onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    if (step === 2) {
      const timer = setTimeout(() => setStep(3), 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const StepIcon = ({ current, stepNum, icon: Icon }: any) => {
    if (current > stepNum) {
      return <div className="w-10 h-10 rounded-full bg-green-100 text-green-500 flex items-center justify-center z-10 relative"><Check className="w-5 h-5" /></div>;
    }
    if (current === stepNum) {
      return (
        <div className="w-10 h-10 rounded-full border-2 border-dashed border-green-400 flex items-center justify-center p-1 z-10 relative bg-white">
          <div className="w-full h-full bg-green-400 rounded-full flex items-center justify-center text-white"><Icon className="w-4 h-4" /></div>
        </div>
      );
    }
    return <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center z-10 relative border-4 border-white"><Icon className="w-5 h-5" /></div>;
  };

  return (
    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col"
      >
        {/* Stepper Header */}
        <div className="p-10 pb-8">
          <div className="flex items-center justify-between px-8 relative">
            <div className="absolute top-5 left-16 right-16 h-0.5 bg-slate-100 z-0">
              <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <StepIcon current={step} stepNum={1} icon={MessageSquare} />
              <span className="text-sm font-bold text-slate-900">需求描述</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <StepIcon current={step} stepNum={2} icon={Wand2} />
              <span className="text-sm font-bold text-slate-900">任务拆解</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <StepIcon current={step} stepNum={3} icon={Users} />
              <span className="text-sm font-bold text-slate-900">团队配置</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <StepIcon current={step} stepNum={4} icon={CheckCircle2} />
              <span className="text-sm font-bold text-slate-900">确认执行</span>
            </div>
          </div>
        </div>

        {/* Cards Area */}
        <div className="px-8 pb-8">
          <div className="grid grid-cols-4 gap-4 bg-slate-50/80 p-4 rounded-2xl">
            
            {/* Card 1 */}
            <div className={`flex flex-col p-5 rounded-2xl h-[280px] transition-all duration-300 ${step === 1 ? 'border-2 border-green-400 bg-white shadow-md scale-[1.02]' : step > 1 ? 'bg-white shadow-sm border border-slate-200' : 'border-2 border-dashed border-slate-200 bg-transparent'}`}>
              {step === 1 && (
                <>
                  <h3 className="font-bold text-slate-900 mb-3 text-sm">输入需求</h3>
                  <textarea 
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all" 
                    placeholder="例如：帮我策划一场春季上新活动..." 
                    value={prompt} 
                    onChange={e => setPrompt(e.target.value)} 
                    autoFocus
                  />
                  <button onClick={() => setStep(2)} disabled={!prompt.trim()} className="mt-3 w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-slate-800 transition-colors">下一步</button>
                </>
              )}
              {step > 1 && (
                <>
                  <h3 className="font-bold text-slate-900 mb-3 text-sm">需求详情</h3>
                  <div className="flex-1 text-sm text-slate-600 overflow-hidden relative">
                    <p className="line-clamp-6">{prompt}</p>
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent"></div>
                  </div>
                  <button onClick={() => setStep(1)} className="mt-3 w-full py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">修改需求</button>
                </>
              )}
            </div>

            {/* Card 2 */}
            <div className={`flex flex-col p-5 rounded-2xl h-[280px] transition-all duration-300 ${step === 2 ? 'border-2 border-green-400 bg-white shadow-md scale-[1.02]' : step > 2 ? 'bg-white shadow-sm border border-slate-200' : 'border-2 border-dashed border-slate-200 bg-transparent'}`}>
              {step === 2 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="relative mb-4">
                    <div className="w-12 h-12 border-4 border-green-100 border-t-green-500 rounded-full animate-spin"></div>
                    <Wand2 className="w-5 h-5 text-green-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <p className="text-sm font-bold text-slate-900">AI 正在拆解任务...</p>
                  <p className="text-xs text-slate-500 mt-1">分析需求并规划工作流</p>
                </div>
              )}
              {step > 2 && (
                <>
                  <h3 className="font-bold text-slate-900 mb-3 text-sm">拆解结果</h3>
                  <div className="flex-1">
                    <ul className="text-sm text-slate-600 space-y-3">
                      <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5"/> <span>生成商品主图与详情页</span></li>
                      <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5"/> <span>提炼卖点与撰写标题</span></li>
                      <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5"/> <span>制定首发价格和推广计划</span></li>
                    </ul>
                  </div>
                  <button className="mt-3 w-full py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">查看详情</button>
                </>
              )}
            </div>

            {/* Card 3 */}
            <div className={`flex flex-col p-5 rounded-2xl h-[280px] transition-all duration-300 ${step === 3 ? 'border-2 border-green-400 bg-white shadow-md scale-[1.02]' : step > 3 ? 'bg-white shadow-sm border border-slate-200' : 'border-2 border-dashed border-slate-200 bg-transparent'}`}>
              {step === 3 && (
                <>
                  <h3 className="font-bold text-slate-900 mb-3 text-sm">分配团队</h3>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                     <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                       <div className="w-8 h-8 bg-blue-500 rounded-lg text-white flex items-center justify-center text-sm font-bold shadow-sm">店</div>
                       <div><p className="text-sm font-bold text-slate-900 leading-none">店长</p><p className="text-[10px] text-slate-500 mt-1">统筹规划</p></div>
                     </div>
                     <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                       <div className="w-8 h-8 bg-pink-500 rounded-lg text-white flex items-center justify-center text-sm font-bold shadow-sm">美</div>
                       <div><p className="text-sm font-bold text-slate-900 leading-none">美工</p><p className="text-[10px] text-slate-500 mt-1">视觉设计</p></div>
                     </div>
                     <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                       <div className="w-8 h-8 bg-yellow-500 rounded-lg text-white flex items-center justify-center text-sm font-bold shadow-sm">文</div>
                       <div><p className="text-sm font-bold text-slate-900 leading-none">文案</p><p className="text-[10px] text-slate-500 mt-1">内容创作</p></div>
                     </div>
                  </div>
                  <button onClick={() => setStep(4)} className="mt-3 w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">确认团队</button>
                </>
              )}
              {step > 3 && (
                <>
                  <h3 className="font-bold text-slate-900 mb-3 text-sm">团队配置</h3>
                  <div className="flex-1 flex flex-wrap gap-2 content-start">
                     <div className="w-10 h-10 bg-blue-500 rounded-full text-white flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm">店</div>
                     <div className="w-10 h-10 bg-pink-500 rounded-full text-white flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm -ml-4">美</div>
                     <div className="w-10 h-10 bg-yellow-500 rounded-full text-white flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm -ml-4">文</div>
                  </div>
                  <button onClick={() => setStep(3)} className="mt-3 w-full py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">调整人员</button>
                </>
              )}
            </div>

            {/* Card 4 */}
            <div className={`flex flex-col p-5 rounded-2xl h-[280px] transition-all duration-300 ${step === 4 ? 'border-2 border-green-400 bg-white shadow-md scale-[1.02]' : 'border-2 border-dashed border-slate-200 bg-transparent'}`}>
              {step === 4 && (
                <>
                  <h3 className="font-bold text-slate-900 mb-3 text-sm">准备就绪</h3>
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 mb-1">配置完成</p>
                    <p className="text-xs text-slate-500">工作流已准备就绪，随时可以开始执行。</p>
                  </div>
                  <button onClick={onComplete} className="mt-3 w-full py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors shadow-sm shadow-green-500/20">生成工作流</button>
                </>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 px-8 flex items-center justify-between bg-white">
          <span className="text-sm font-bold text-slate-900">Plan your workflow</span>
          <button onClick={onClose} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            Close panel <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function MainContent() {
  const [view, setView] = useState<'kanban' | 'workflow'>('kanban');
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F5F6FA] relative">
      <TopNav />
      <BoardHeader view={view} setView={setView} onOpenWizard={() => setIsWizardOpen(true)} />
      {view === 'kanban' ? <KanbanBoard /> : <WorkflowView />}
      
      <AnimatePresence>
        {isWizardOpen && (
          <WorkflowWizard 
            onClose={() => setIsWizardOpen(false)} 
            onComplete={() => {
              setIsWizardOpen(false);
              setView('workflow');
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <div className="flex h-screen w-full bg-[#F5F6FA] text-slate-800 font-sans overflow-hidden">
      <DarkSidebar />
      <LightSidebar />
      <MainContent />
    </div>
  );
}
