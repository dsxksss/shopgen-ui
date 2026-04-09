import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutGrid,
  Play,
  Loader2,
  ChevronRight,
  Target,
  UserPlus,
  Palette,
  Layout,
  Search,
  Edit3,
  BarChart,
  TrendingUp,
  Smile,
  MessageCircle,
  Calculator,
  DollarSign,
  Package,
  Truck,
  Clock,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DashboardTask, Skill } from '../lib/types';
import { normalizeAgentId, AGENTS } from '../lib/utils';

const SKILL_ICONS: Record<string, any> = {
  plan: Target,
  dispatch: UserPlus,
  visual: Palette,
  layout: Layout,
  seo: Search,
  sales: Edit3,
  data: BarChart,
  competitor: TrendingUp,
  emotion: Smile,
  reply: MessageCircle,
  roi: Calculator,
  margin: DollarSign,
  stock: Package,
  logistic: Truck,
};

function SkillBadge({ skill }: { skill: Skill }) {
  const Icon = SKILL_ICONS[skill.id] || LayoutGrid;
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 text-[10px] text-slate-500 font-medium whitespace-nowrap" title={skill.description}>
      <Icon className="w-2.5 h-2.5 text-slate-400" />
      {skill.name}
    </div>
  );
}

export function TaskCard({ task, index, onClick, onRun, isRunning }: { task: DashboardTask; index: number; onClick?: () => void; onRun?: (e: React.MouseEvent) => void; isRunning?: boolean }) {
  const isExecuting = task.status === 'in-progress' || isRunning;
  
  return (
    <motion.div 
      layout 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: index * 0.05, duration: 0.3 }} 
      whileHover={{ y: -4, transition: { duration: 0.2 } }} 
      onClick={onClick} 
      className={`bg-white p-5 rounded-2xl shadow-sm border ${isExecuting ? 'border-orange-200' : 'border-slate-100'} hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer group relative overflow-hidden`}
    >
      {isExecuting && (
        <motion.div 
          className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-amber-400" 
          initial={{ x: '-100%' }} 
          animate={{ x: '100%' }} 
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} 
        />
      )}
      
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-bold text-slate-800 text-[15px] leading-snug group-hover:text-blue-600 transition-colors">
          {task.title}
        </h4>
        <div className="flex items-center gap-1.5 ml-3 shrink-0">
          {task.status !== 'done' && task.status !== 'in-progress' && !isRunning && onRun && (
            <button 
              onClick={(e) => { e.stopPropagation(); onRun(e); }} 
              className="p-1.5 rounded-lg bg-slate-50 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-green-500 hover:text-white transition-all shadow-sm flex items-center justify-center" 
              title="立即执行"
            >
              <Play className="w-3 h-3 fill-current" />
            </button>
          )}
          {isExecuting && (
            <div className="p-1.5 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
          )}
          {task.status === 'done' && (
            <div className="p-1.5 rounded-lg bg-green-50 text-green-500 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
      
      <p className="text-[11px] font-medium text-slate-400 mb-4 tracking-wide uppercase">{task.workflow}</p>
      
      {task.summary && (
        <div className="mb-4 bg-slate-50/80 p-3 rounded-xl border border-slate-100/50 backdrop-blur-sm">
          <p className="text-[12px] text-slate-600 line-clamp-2 leading-relaxed italic">
            {task.summary}
          </p>
        </div>
      )}
      
      <div className="mb-5">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-tighter">
          <span className="flex items-center gap-1.5">
            <LayoutGrid className="w-3 h-3" /> 任务进度
          </span>
          <span className="text-slate-600">{task.progress}/{task.totalSteps}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(task.progress / task.totalSteps) * 100}%` }}
            className={`h-full rounded-full ${task.progressColor} shadow-inner transition-all duration-700`} 
          />
        </div>
      </div>
      
      {task.skills && task.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {task.skills.slice(0, 3).map((skill) => (
            <SkillBadge key={skill.id} skill={skill} />
          ))}
          {task.skills.length > 3 && (
            <span className="text-[10px] text-slate-400 font-bold self-center bg-slate-50 px-1.5 py-0.5 rounded">
              +{task.skills.length - 3}
            </span>
          )}
        </div>
      )}
      
      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${task.status === 'in-progress' ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-500'}`}>
          {task.status === 'in-progress' ? '推进中...' : task.date}
        </div>
        
        <div className="flex items-center -space-x-2.5">
          {task.agentIds.slice(0, 4).map((agentId, i) => { 
            const agent = AGENTS[normalizeAgentId(agentId)]; 
            return (
              <div 
                key={i} 
                className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-slate-100/50 ${agent.color}`} 
                title={agent.name}
              >
                {agent.initial}
              </div>
            ); 
          })}
          {task.agentIds.length > 4 && (
            <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600 bg-slate-50 shadow-sm ring-1 ring-slate-100/50">
              +{task.agentIds.length - 4}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface ColumnProps {
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  tasks: DashboardTask[];
  icon: React.ReactNode;
  color: string;
  onRunTask?: (id: string) => void;
  runningTaskId?: string | null;
  onSelectTask: (id: string) => void;
}

const Column: React.FC<ColumnProps> = ({ title, status, tasks, icon, color, onRunTask, runningTaskId, onSelectTask }) => {
  return (
    <div className="flex flex-col w-[340px] shrink-0 h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-sm font-medium text-slate-500 flex items-center gap-2">
          {icon} {title} ({tasks.length})
        </h3>
      </div>
      <div className={`flex-1 overflow-y-auto flex flex-col gap-4 pb-4 pr-2 border-2 border-dashed border-slate-200 rounded-2xl p-2 ${color}`}>
        {tasks.map((task, index) => (
          <React.Fragment key={task.id}>
            <TaskCard 
              task={task} 
              index={index} 
              onClick={() => onSelectTask(task.id)} 
              onRun={(e) => { e.stopPropagation(); onRunTask?.(task.id); }} 
              isRunning={runningTaskId === task.id}
            />
          </React.Fragment>
        ))}
        {tasks.length === 0 && <div className="h-24 flex items-center justify-center text-sm text-slate-400 font-medium">暂无任务</div>}
      </div>
    </div>
  );
};

export function TaskDetailsDrawer({ task, onClose }: { task: DashboardTask; onClose: () => void }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] z-40 rounded-tl-2xl" onClick={onClose} />
      <motion.div initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute pt-4 top-0 right-0 bottom-0 w-[460px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col flex-1 pl-4 rounded-tl-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-slate-900">任务详情</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"><ChevronRight className="w-5 h-5" /></button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div>
            <div className="mb-3"><span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md uppercase tracking-wider">{task.workflow}</span></div>
            <h3 className="text-xl font-bold text-slate-900 leading-snug">{task.title}</h3>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">执行结论 / 输出产物</label>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed max-w-none prose prose-slate min-h-[120px]">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  img: ({ ...props }) => <img className="rounded-xl shadow-md border border-white mt-4 mb-4 object-cover w-full max-h-[320px] h-auto" {...props} />,
                  table: ({ ...props }) => <div className="overflow-x-auto my-6 rounded-lg border border-slate-200"><table className="w-full text-left border-collapse bg-white" {...props} /></div>,
                  thead: ({ ...props }) => <thead className="bg-slate-50" {...props} />,
                  th: ({ ...props }) => <th className="px-4 py-3 border-b border-slate-200 font-bold text-slate-700 text-xs uppercase tracking-wider" {...props} />,
                  td: ({ ...props }) => <td className="px-4 py-3 border-b border-slate-100 text-slate-600" {...props} />,
                  h1: ({ ...props }) => <h1 className="text-xl font-bold text-slate-900 mt-8 mb-4 flex items-center gap-2 border-l-4 border-purple-500 pl-3" {...props} />,
                  h2: ({ ...props }) => <h2 className="text-lg font-bold text-slate-900 mt-6 mb-3" {...props} />,
                  h3: ({ ...props }) => <h3 className="text-base font-bold text-slate-900 mt-4 mb-2" {...props} />,
                  p: ({ ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                  ul: ({ ...props }) => <ul className="list-disc pl-5 mb-4 space-y-2" {...props} />,
                  li: ({ ...props }) => <li className="marker:text-purple-400" {...props} />,
                }}
              >
                {task.summary || '### 暂无执行产出\n该阶段尚未开始执行或未产生有效结论。'}
              </ReactMarkdown>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col">
               <span className="text-xs text-slate-500 block mb-1">当前状态</span>
               <div className="mt-auto"><span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${task.dateColor}`}>{task.status === 'done' ? '已完成' : task.status === 'in-progress' ? '处理中' : '待处理'}</span></div>
             </div>
             <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col">
               <span className="text-xs text-slate-500 block mb-1">执行进度</span>
               <div className="mt-auto flex items-center gap-2">
                 <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                   <div className={`h-full rounded-full ${task.progressColor}`} style={{ width: `${(task.progress / task.totalSteps) * 100}%` }} />
                 </div>
                 <span className="text-sm font-semibold text-slate-700">{task.progress}/{task.totalSteps}</span>
               </div>
             </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">参与 Agent</label>
            <div className="flex flex-wrap gap-2">
              {task.agentIds.map((agentId, i) => { 
                const agent = AGENTS[normalizeAgentId(agentId)]; 
                return <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white ${agent.color}`}>{agent.initial}</div>
                  <span className="text-sm font-medium">{agent.name}</span>
                </div>; 
              })}
            </div>
          </div>
          {task.skills && task.skills.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">调用技能 (Skills)</label>
              <div className="flex flex-wrap gap-2">
                {task.skills.map((skill) => (
                  <div key={skill.id} className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl" title={skill.description}>
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-100">
                      {SKILL_ICONS[skill.id] ? React.createElement(SKILL_ICONS[skill.id], { className: "w-4 h-4 text-slate-500" }) : <LayoutGrid className="w-4 h-4 text-slate-500" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{skill.name}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{skill.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

interface KanbanBoardProps {
  tasks: DashboardTask[];
  activeScenario: string;
  onRunTask?: (id: string) => void;
  runningTaskId?: string | null;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, activeScenario, onRunTask, runningTaskId }) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const scopedTasks = activeScenario === '总览' ? tasks : tasks.filter((task) => task.workflow === activeScenario);
  const selectedTask = scopedTasks.find(t => t.id === selectedTaskId);
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }} className="flex-1 overflow-hidden px-8 pb-8 pt-4 flex flex-col relative">
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex space-x-6 h-full min-w-max px-2">
          <Column title="待执行" status="todo" tasks={scopedTasks.filter(t => t.status === 'todo')} icon={<Clock className="w-4 h-4" />} color="bg-slate-100/50" onRunTask={onRunTask} runningTaskId={runningTaskId} onSelectTask={setSelectedTaskId} />
          <Column title="进行中" status="in-progress" tasks={scopedTasks.filter(t => t.status === 'in-progress')} icon={<Activity className="w-4 h-4" />} color="bg-blue-50/50" onRunTask={onRunTask} runningTaskId={runningTaskId} onSelectTask={setSelectedTaskId} />
          <Column title="已完成" status="done" tasks={scopedTasks.filter(t => t.status === 'done')} icon={<CheckCircle2 className="w-4 h-4" />} color="bg-green-50/50" onRunTask={onRunTask} runningTaskId={runningTaskId} onSelectTask={setSelectedTaskId} />
        </div>
      </div>
      <AnimatePresence>
        {selectedTask && <TaskDetailsDrawer task={selectedTask} onClose={() => setSelectedTaskId(null)} />}
      </AnimatePresence>
    </motion.div>
  );
};
