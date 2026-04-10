import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutGrid,
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
  Image as ImageIcon,
} from 'lucide-react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AsyncImage } from './AsyncImage';
import { ImageCarousel } from './Carousel';
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
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--bg-app)] border border-[var(--border-main)] text-[10px] text-[var(--text-muted)] font-medium whitespace-nowrap" title={skill.description}>
      <Icon className="w-2.5 h-2.5 text-[var(--text-muted)]" />
      {skill.name}
    </div>
  );
}

function extractImages(text: string): string[] {
  const images: string[] = [];
  const re = /!\[.*?\]\((.*?)\)/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match[1]) images.push(match[1]);
  }
  return images;
}

export function TaskCard({ task, index, onClick, isRunning, onRun }: { task: DashboardTask; index: number; onClick?: () => void; isRunning?: boolean; onRun?: (id: string) => void }) {
  const isExecuting = task.status === 'in-progress' || isRunning;
  
  return (
    <motion.div 
      layout 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: index * 0.05, duration: 0.3 }} 
      whileHover={{ y: -4, transition: { duration: 0.2 } }} 
      onClick={onClick} 
      className={`bg-[var(--bg-card)] p-5 rounded-3xl shadow-sm border border-[var(--border-main)] hover:shadow-xl hover:shadow-slate-500/10 transition-all cursor-pointer group relative`}
    >
      <div className="flex items-start justify-between mb-1">
        <h4 className="font-bold text-[var(--text-main)] text-[15px] leading-snug transition-colors">
          {task.title}
        </h4>
        <div className="flex items-center gap-2">
          {task.status !== 'done' && onRun && (
            <button 
              onClick={(e) => { e.stopPropagation(); onRun(task.id); }}
              className="p-1.5 rounded-lg bg-[var(--bg-app)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-all"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
          )}
          <Activity className="w-4 h-4 text-[var(--text-muted)] opacity-50 group-hover:opacity-100" />
        </div>
      </div>
      
      <p className="text-[12px] text-[var(--text-muted)] mb-5 font-medium">{task.workflow}</p>
      
      <div className="mb-6">
        <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)] mb-2">
          <span className="flex items-center gap-1.5 uppercase tracking-wide">
            <LayoutGrid className="w-3.5 h-3.5" /> 任务进度
          </span>
          <span className="text-[var(--text-main)]">{task.progress}/{task.totalSteps}</span>
        </div>
        <div className="h-1.5 w-full bg-[var(--bg-app)] rounded-full overflow-hidden mb-1">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(task.progress / (task.totalSteps || 1)) * 100}%` }}
            className={`h-full rounded-full ${task.progressColor} shadow-inner transition-all duration-700`} 
          />
        </div>
        {isExecuting && task.currentStepLabel && (
          <p className="text-[10px] text-orange-500 font-medium animate-pulse flex items-center gap-1 mt-1">
            <span className="w-1 h-1 rounded-full bg-orange-400" />
            {task.currentStepLabel}
          </p>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <div className={`px-4 py-1.5 rounded-2xl text-[11px] font-bold ${
          task.status === 'done' ? 'bg-green-500/10 text-green-500' : 
          task.status === 'in-progress' ? 'bg-orange-500/10 text-orange-500' : 
          'bg-[var(--border-soft)] text-[var(--text-muted)]'
        }`}>
          {task.status === 'done' ? '已完成' : task.status === 'in-progress' ? '执行中' : '待处理'}
        </div>
        
        <div className="flex items-center -space-x-2.5">
          {task.agentIds.slice(0, 3).map((agentId, i) => { 
            const agent = AGENTS[normalizeAgentId(agentId)]; 
            return (
              <div 
                key={i} 
                className={`w-7 h-7 rounded-full border-2 border-[var(--bg-card)] flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${agent.color}`} 
              >
                {agent.initial}
              </div>
            ); 
          })}
        </div>
      </div>

      {isExecuting && (
        <div className="absolute top-2 right-2">
           <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
        </div>
      )}
    </motion.div>
  );
}

const Column: React.FC<{ title: string; tasks: DashboardTask[]; icon: React.ReactNode; onSelectTask: (id: string) => void; onRunTask?: (id: string) => void; runningTaskId?: string | null }> = ({ title, tasks, icon, onSelectTask, onRunTask, runningTaskId }) => {
  return (
    <div className="flex flex-col w-[350px] shrink-0 h-full">
      <div className="flex items-center justify-between mb-5 px-2">
        <h3 className="text-[15px] font-bold text-[var(--text-main)] flex items-center gap-2">
          {icon} {title} <span className="text-[var(--text-muted)] font-medium">({tasks.length})</span>
        </h3>
      </div>
      <div className={`flex-1 overflow-y-auto flex flex-col gap-5 pb-6 pr-3 border-2 border-dashed border-[var(--border-soft)] rounded-[32px] p-3 no-scrollbar`}>
        {tasks.map((task, index) => (
          <TaskCard 
            key={task.id}
            task={task} 
            index={index} 
            onClick={() => onSelectTask(task.id)} 
            onRun={onRunTask}
            isRunning={runningTaskId === task.id}
          />
        ))}
        {tasks.length === 0 && (
          <div className="h-32 flex flex-col items-center justify-center text-sm text-[var(--text-muted)] font-medium border border-dashed border-[var(--border-main)] rounded-3xl opacity-50">
            暂无任务
          </div>
        )}
      </div>
    </div>
  );
};

export function TaskDetailsDrawer({ task, onClose }: { task: DashboardTask; onClose: () => void }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40 rounded-tl-2xl" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="absolute right-0 top-0 bottom-0 w-[85%] max-w-4xl bg-[var(--bg-card)] z-50 flex flex-col border-l border-[var(--border-main)] shadow-2xl">
        <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between shrink-0 bg-[var(--header-glass)] backdrop-blur-md">
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-xl ${task.status === 'done' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                <Package className="w-5 h-5" />
             </div>
             <h2 className="text-lg font-bold text-[var(--text-main)]">任务执行详情</h2>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-2 rounded-xl hover:bg-[var(--bg-app)] transition-all"><ChevronRight className="w-6 h-6" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-[10px] font-black text-purple-500 bg-purple-500/10 px-3 py-1.5 rounded-full uppercase tracking-[0.15em] border border-purple-500/20">{task.workflow}</span>
            </div>
            <h3 className="text-4xl font-black text-[var(--text-main)] tracking-tight leading-[1.1]">{task.title}</h3>
          </div>

          {extractImages(task.summary || '').length > 0 && (
            <div className="space-y-4">
               <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5" /> 生成的视觉资源
               </label>
               <ImageCarousel images={extractImages(task.summary || '')} />
            </div>
          )}

          <div className="pt-8 border-t border-[var(--border-soft)]">
            <div className="bg-[var(--bg-sidebar)] p-8 rounded-[32px] border border-[var(--border-main)] shadow-sm">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                urlTransform={(url) => url.startsWith('shopgen-image://') ? url : url.startsWith('data:') ? url : defaultUrlTransform(url)}
                components={{
                  img: ({ node, ...props }: any) => <AsyncImage className="rounded-2xl shadow-lg border-4 border-[var(--bg-card)] mt-6 mb-6 object-cover w-full h-auto" {...props} />,
                  table: ({ ...props }) => <div className="overflow-x-auto my-8 rounded-2xl border border-[var(--border-main)] shadow-inner"><table className="w-full text-left border-collapse bg-[var(--bg-card)]" {...props} /></div>,
                  thead: ({ ...props }) => <thead className="bg-[var(--bg-app)]" {...props} />,
                  th: ({ ...props }) => <th className="px-5 py-4 border-b border-[var(--border-main)] font-black text-[11px] text-[var(--text-muted)] uppercase tracking-widest" {...props} />,
                  td: ({ ...props }) => <td className="px-5 py-4 border-b border-[var(--border-soft)] text-sm text-[var(--text-main)] font-medium" {...props} />,
                  h1: ({ ...props }) => <h1 className="text-2xl font-black text-[var(--text-main)] mt-12 mb-6 border-l-4 border-purple-500 pl-4 tracking-tight" {...props} />,
                  h2: ({ ...props }) => <h2 className="text-xl font-bold text-[var(--text-main)] mt-8 mb-4 tracking-tight" {...props} />,
                  p: ({ ...props }) => <p className="mb-5 last:mb-0 text-[15px] leading-relaxed text-[var(--text-main)]/90" {...props} />,
                  ul: ({ ...props }) => <ul className="list-disc pl-6 mb-6 space-y-3" {...props} />,
                  li: ({ ...props }) => <li className="marker:text-purple-500" {...props} />,
                }}
              >
                {String(task.summary || '### 暂无执行产出\n该阶段尚未产生有效交付物。').replace(/!\[([^\]]*)\]\(data:image\/[^;]+;base64,[^\)]+\)/g, '⚠️ *由于内容过大，旧版基线图片已被压缩折叠。*')}
              </ReactMarkdown>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="bg-[var(--bg-app)] p-5 rounded-2xl border border-[var(--border-main)] flex flex-col gap-1">
               <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">执行状态</span>
               <span className={`text-lg font-bold ${task.status === 'done' ? 'text-green-500' : 'text-orange-500'}`}>{task.status === 'done' ? '已完成' : '正在执行'}</span>
             </div>
             <div className="bg-[var(--bg-app)] p-5 rounded-2xl border border-[var(--border-main)] flex flex-col gap-1">
               <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">步骤进度</span>
               <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-[var(--border-main)] rounded-full overflow-hidden">
                    <motion.div className={`h-full ${task.progressColor}`} initial={{ width: 0 }} animate={{ width: `${(task.progress / (task.totalSteps || 1)) * 100}%` }} />
                  </div>
                  <span className="text-lg font-black text-[var(--text-main)]">{task.progress}/{task.totalSteps}</span>
               </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">协作专家团队</label>
            <div className="flex flex-wrap gap-3">
              {task.agentIds.map((agentId, i) => { 
                const agent = AGENTS[normalizeAgentId(agentId)]; 
                return <div key={i} className="flex items-center gap-3 bg-[var(--bg-app)] border border-[var(--border-main)] p-2 pr-5 rounded-2xl shadow-sm hover:scale-[1.02] transition-all">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white ${agent.color} shadow-lg shadow-${agent.color}/20`}>{agent.initial}</div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-[var(--text-main)]">{agent.name}</span>
                  </div>
                </div>; 
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

export const KanbanBoard: React.FC<{ tasks: DashboardTask[]; activeScenario: string; onRunTask?: (id: string) => void; runningTaskId?: string | null }> = ({ tasks, activeScenario, onRunTask, runningTaskId }) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const scopedTasks = activeScenario === '总览' ? tasks : tasks.filter((task) => task.workflow === activeScenario);
  const selectedTask = scopedTasks.find(t => t.id === selectedTaskId);
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-hidden px-8 pb-8 pt-4 flex flex-col relative">
      <div className="flex-1 overflow-x-auto pb-4 no-scrollbar">
        <div className="flex space-x-8 h-full min-w-max px-2">
          <Column title="待处理" tasks={scopedTasks.filter(t => t.status === 'todo')} icon={<Clock className="w-4 h-4 text-[var(--text-muted)]" />} onSelectTask={setSelectedTaskId} onRunTask={onRunTask} runningTaskId={runningTaskId} />
          <Column title="执行中" tasks={scopedTasks.filter(t => t.status === 'in-progress' || runningTaskId === t.id)} icon={<Activity className="w-4 h-4 text-orange-500" />} onSelectTask={setSelectedTaskId} onRunTask={onRunTask} runningTaskId={runningTaskId} />
          <Column title="已完成" tasks={scopedTasks.filter(t => t.status === 'done' && runningTaskId !== t.id)} icon={<CheckCircle2 className="w-4 h-4 text-green-500" />} onSelectTask={setSelectedTaskId} onRunTask={onRunTask} runningTaskId={runningTaskId} />
        </div>
      </div>
      <AnimatePresence>
        {selectedTask && <TaskDetailsDrawer task={selectedTask} onClose={() => setSelectedTaskId(null)} />}
      </AnimatePresence>
    </motion.div>
  );
};
