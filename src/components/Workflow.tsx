import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AsyncImage } from './AsyncImage';
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
} from '@xyflow/react';
import {
  Play,
  GitBranch,
  Check,
  Loader2,
  ShieldAlert,
  Image as ImageIcon,
  MessageSquare,
  Wand2,
  Users,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import type { WorkflowPayload, WorkspaceView, RuntimeStatus, WizardPayload } from '../lib/types';
import { generateWorkspaceView } from '../lib/api';
import { findPreferredNodeId, buildReactFlowPayload, normalizeAgentId, AGENTS } from '../lib/utils';

export const AgentNode = ({ data }: any) => (
  <div className="bg-[var(--bg-card)] rounded-xl shadow-lg border border-[var(--border-main)] p-4 w-[260px] group hover:border-purple-400 hover:shadow-2xl hover:shadow-purple-500/10 transition-all relative">
    <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 !bg-[var(--text-muted)] border-2 border-[var(--bg-card)]" />
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${data.agentColor} shadow-lg shadow-${data.agentColor}/10`}>
          {data.icon}
        </div>
        <div>
          <h3 className="text-sm font-black text-[var(--text-main)] leading-tight">{data.title}</h3>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{data.agentName}</p>
        </div>
      </div>
    </div>
    <div className="bg-[var(--bg-app)] rounded-lg p-2.5 border border-[var(--border-soft)]">
      <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2">{data.description}</p>
    </div>
    {data.status === 'done' && (
      <div className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-[var(--bg-card)] shadow-lg animate-in zoom-in">
        <Check className="w-3.5 h-3.5 text-white" />
      </div>
    )}
    {data.status === 'in-progress' && (
      <div className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center border-2 border-[var(--bg-card)] shadow-lg">
        <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
      </div>
    )}
    <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 !bg-[var(--text-muted)] border-2 border-[var(--bg-card)]" />
  </div>
);

export const TriggerNode = ({ data }: any) => (
  <div className="bg-[var(--bg-card)] rounded-xl shadow-lg border border-purple-500/30 p-4 w-[220px] relative">
    <div className="flex items-center gap-2 mb-2 text-purple-500">
      <Play className="w-4 h-4 fill-current" />
      <span className="text-[10px] font-black uppercase tracking-widest">Initialization</span>
    </div>
    <h3 className="text-sm font-bold text-[var(--text-main)]">{data.title}</h3>
    <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 !bg-purple-500 border-2 border-[var(--bg-card)]" />
  </div>
);

export const ConditionNode = ({ data }: any) => (
  <div className="bg-[var(--bg-card)] rounded-xl shadow-lg border border-orange-500/30 p-4 w-[200px] relative">
    <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 !bg-orange-400 border-2 border-[var(--bg-card)]" />
    <div className="flex items-center gap-2 mb-2 text-orange-400">
      <GitBranch className="w-4 h-4" />
      <span className="text-[10px] font-black uppercase tracking-widest">Logic Hub</span>
    </div>
    <h3 className="text-sm font-bold text-[var(--text-main)]">{data.title}</h3>
    <Handle type="source" position={Position.Right} id="true" style={{ top: '30%' }} className="w-2 h-2 !bg-green-500 border-2 border-[var(--bg-card)]" />
    <Handle type="source" position={Position.Right} id="false" style={{ top: '70%' }} className="w-2 h-2 !bg-red-500 border-2 border-[var(--bg-card)]" />
  </div>
);

export const nodeTypes = { agentNode: AgentNode, triggerNode: TriggerNode, conditionNode: ConditionNode };

export function WorkflowView({ workflow, hasPlan }: { workflow: WorkflowPayload | null; hasPlan: boolean }) {
  const reactFlowPayload = useMemo(() => buildReactFlowPayload(workflow ?? { selectedNodeId: '', nodes: [], edges: [], inspectors: {} }), [workflow]);
  const [nodes, setNodes, onNodesChange] = useNodesState(reactFlowPayload.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(reactFlowPayload.edges);
  const [selectedNodeId, setSelectedNodeId] = useState(findPreferredNodeId(workflow));

  useEffect(() => { 
    setNodes(reactFlowPayload.nodes); 
    setEdges(reactFlowPayload.edges); 
    setSelectedNodeId(findPreferredNodeId(workflow)); 
  }, [reactFlowPayload, workflow, setEdges, setNodes]);

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } } as Edge, eds)), [setEdges]);

  const inspector = (workflow?.inspectors ?? {})[selectedNodeId] ?? { 
    title: 'Ready for Generation', 
    agentName: 'Shop Manager Agent', 
    status: 'Waiting for AI Workflow...', 
    statusSubtitle: 'Generate your business process first.', 
    statusTone: 'todo' as const, 
    inputs: [{ label: 'Status', value: 'Draft' }], 
    outputs: [], 
    tools: []
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="flex-1 w-full h-full relative bg-[var(--bg-app)]">
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        onNodesChange={onNodesChange} 
        onEdgesChange={onEdgesChange} 
        onConnect={onConnect} 
        onNodeClick={(_, node) => setSelectedNodeId(node.id)} 
        nodeTypes={nodeTypes} 
        fitView 
        colorMode={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
      >
        <Background color="var(--border-main)" gap={16} size={1} />
        <Controls className="bg-[var(--bg-card)] border border-[var(--border-main)] shadow-xl rounded-2xl overflow-hidden [&_button]:bg-[var(--bg-card)] [&_button]:border-[var(--border-soft)] [&_svg]:fill-[var(--text-main)]" />
        <MiniMap 
          nodeColor={(node) => node.type === 'triggerNode' ? '#c084fc' : node.type === 'conditionNode' ? '#fdba74' : '#94a3b8'} 
          maskColor="var(--header-glass)" 
          className="bg-[var(--bg-card)] border border-[var(--border-main)] shadow-xl rounded-2xl overflow-hidden" 
        />
      </ReactFlow>

      {!hasPlan && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-[var(--bg-card)]/80 backdrop-blur-xl rounded-3xl border border-[var(--border-main)] px-8 py-5 shadow-2xl text-base font-black text-[var(--text-muted)] italic tracking-tight">
            System Waiting for AI Task Decomposition...
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 w-[420px] bg-[var(--bg-card)] rounded-[40px] shadow-2xl border border-[var(--border-main)] flex flex-col h-[calc(100%-2rem)] z-10 overflow-hidden">
        <div className="p-8 border-b border-[var(--border-soft)] flex items-center justify-between bg-[var(--bg-sidebar)]">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${inspector.statusTone === 'done' ? 'bg-green-500/10 text-green-500' : inspector.statusTone === 'in-progress' ? 'bg-orange-500/10 text-orange-500' : 'bg-[var(--border-soft)] text-[var(--text-muted)]'}`}>
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[var(--text-main)] tracking-tight">{inspector.title}</h3>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">{inspector.agentName}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 no-scrollbar">
          <div>
            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3 block">Node Context</label>
            <div className={`border rounded-[24px] p-5 flex items-center gap-4 ${inspector.statusTone === 'done' ? 'bg-green-500/10 border-green-500/20' : inspector.statusTone === 'in-progress' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-[var(--bg-app)] border-[var(--border-main)]'}`}>
              {inspector.statusTone === 'done' ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : inspector.statusTone === 'in-progress' ? <Loader2 className="w-6 h-6 text-orange-500 animate-spin" /> : <ShieldAlert className="w-6 h-6 text-[var(--text-muted)]" />}
              <div>
                <p className={`text-base font-black ${inspector.statusTone === 'done' ? 'text-green-500' : inspector.statusTone === 'in-progress' ? 'text-orange-500' : 'text-[var(--text-main)]'}`}>{inspector.status}</p>
                <p className="text-xs font-bold text-[var(--text-muted)] mt-0.5">{inspector.statusSubtitle}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3 block">Operational Inputs</label>
            <div className="space-y-3">
              {inspector.inputs.map((item) => (
                <div key={item.label} className="bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl p-4">
                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase block mb-1 tracking-widest">{item.label}</span>
                  <span className="text-sm font-bold text-[var(--text-main)]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {inspector.outputs && inspector.outputs.length > 0 && (
            <div>
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3 block">Artifact Outputs</label>
              <div className="space-y-4">
                {inspector.outputs.map((item, idx) => (
                  <div key={idx} className="bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-[32px] p-6 shadow-sm overflow-hidden">
                    <span className="text-[10px] font-black text-[var(--text-muted)] block mb-4 border-b border-[var(--border-soft)] pb-3 uppercase tracking-widest">{item.label}</span>
                    <div className="prose prose-sm prose-slate max-w-none prose-img:rounded-2xl prose-img:shadow-xl prose-img:border prose-img:border-[var(--bg-card)] prose-img:w-full prose-headings:text-[var(--text-main)] text-[var(--text-main)]/90 text-sm font-medium leading-relaxed">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        urlTransform={(url) => url.startsWith('shopgen-image://') ? url : url.startsWith('data:') ? url : defaultUrlTransform(url)}
                        components={{
                           img: ({ node, ...props }: any) => <AsyncImage {...props} />
                        }}
                      >
                        {String(item.value)}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inspector.tools && inspector.tools.length > 0 && (
            <div>
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3 block">Service Orchestration</label>
              <div className="border border-[var(--border-main)] rounded-[24px] overflow-hidden bg-[var(--bg-app)]">
                {inspector.tools.map((tool, index: number) => (
                  <div key={tool.label} className={`p-4 flex items-center justify-between ${index < inspector.tools.length - 1 ? 'border-b border-[var(--border-soft)]' : ''} ${tool.active ? 'bg-[var(--border-soft)]' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${tool.progress === 100 ? 'bg-green-500' : tool.active ? 'bg-orange-500 animate-pulse' : 'bg-[var(--border-main)]'}`} />
                      <span className="text-sm font-bold text-[var(--text-main)]">{tool.label}</span>
                    </div>
                    <span className="text-[10px] font-black text-[var(--text-muted)]">{tool.progress}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function WorkflowWizard({ onClose, onComplete, scenario, runtime, initialPrompt, planningCache, setPlanningCache }: { onClose: () => void; onComplete: (view: WorkspaceView) => void; scenario: string; runtime: RuntimeStatus | null; initialPrompt: string; planningCache: any; setPlanningCache: (cache: any) => void }) {
  const [step, setStep] = useState(planningCache?.step || 1);
  const [prompt, setPrompt] = useState(planningCache?.prompt || initialPrompt);
  const [loading, setLoading] = useState(planningCache?.isPlanning || false);
  const [error, setError] = useState('');
  const [workspace, setWorkspace] = useState<WorkspaceView | null>(planningCache?.plan || null);
  const [thought, setThought] = useState(planningCache?.thought || '');

  useEffect(() => {
    import('@tauri-apps/api/event').then(({ listen }) => {
      const unlisten = listen<string>('planner-thought', (event) => {
        setThought((prev) => prev + event.payload);
      });
      return () => unlisten.then((fn) => fn());
    });
  }, []);

  useEffect(() => {
    if (!planningCache && initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt, planningCache]);

  useEffect(() => {
    setPlanningCache({ step, prompt, isPlanning: loading, plan: workspace, thought });
  }, [step, prompt, loading, workspace, thought, setPlanningCache]);

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
    } catch (err: unknown) {
      const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : JSON.stringify(err);
      setError(msg || 'Decomposition Failed');
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  const StepIcon = ({ current, stepNum, icon: Icon }: any) => (
    current > stepNum 
      ? <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center z-10 relative ring-4 ring-[var(--bg-card)] shadow-lg"><Check className="w-6 h-6" /></div> 
      : current === stepNum 
        ? <div className="w-12 h-12 rounded-full bg-[var(--accent)] text-[var(--bg-card)] flex items-center justify-center z-10 relative ring-4 ring-[var(--bg-card)] shadow-2xl animate-in zoom-in"><Icon className="w-5 h-5" /></div> 
        : <div className="w-12 h-12 rounded-full bg-[var(--bg-app)] text-[var(--text-muted)] flex items-center justify-center z-10 relative border-2 border-[var(--border-main)]"><Icon className="w-5 h-5" /></div>
  );

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-8">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[var(--bg-card)] rounded-[48px] shadow-3xl w-full max-w-6xl overflow-hidden flex flex-col border border-[var(--border-main)]">
        <div className="p-16 pb-12 bg-[var(--bg-sidebar)] border-b border-[var(--border-soft)]">
          <div className="flex items-center justify-between px-16 relative">
            <div className="absolute top-6 left-24 right-24 h-1 bg-[var(--border-main)] z-0 rounded-full">
              <motion.div className="h-full bg-green-500 rounded-full" animate={{ width: `${((step - 1) / 3) * 100}%` }} />
            </div>
            <div className="flex flex-col items-center gap-4 group"><StepIcon current={step} stepNum={1} icon={MessageSquare} /><span className="text-xs font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Requirement</span></div>
            <div className="flex flex-col items-center gap-4 group"><StepIcon current={step} stepNum={2} icon={Wand2} /><span className="text-xs font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Decomposition</span></div>
            <div className="flex flex-col items-center gap-4 group"><StepIcon current={step} stepNum={3} icon={Users} /><span className="text-xs font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Deployment</span></div>
            <div className="flex flex-col items-center gap-4 group"><StepIcon current={step} stepNum={4} icon={CheckCircle2} /><span className="text-xs font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Validation</span></div>
          </div>
        </div>

        <div className="p-10 px-16 flex-1 overflow-y-auto no-scrollbar bg-[var(--bg-app)]">
          <div className="grid grid-cols-4 gap-8">
            {/* Step 1: Input */}
            <div className={`flex flex-col p-8 rounded-[40px] h-[360px] transition-all duration-500 ${step === 1 ? 'bg-[var(--bg-card)] shadow-2xl border-2 border-[var(--accent)] ring-8 ring-[var(--accent)]/5' : 'bg-[var(--bg-card)]/50 opacity-60'}`}>
              <h3 className="text-sm font-black text-[var(--text-main)] mb-4 uppercase tracking-[0.15em]">Project Intent</h3>
              {step === 1 ? (
                <>
                  <textarea className="flex-1 bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl p-4 text-sm text-[var(--text-main)] font-medium outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all resize-none shadow-inner" placeholder="Tell us about your product or event..." value={prompt} onChange={(e) => setPrompt(e.target.value)} autoFocus />
                  {error && <p className="mt-2 text-[10px] text-red-500 font-bold uppercase">{error}</p>}
                  <button onClick={startGenerate} disabled={!prompt.trim() || !runtime?.configured || loading} className="mt-6 w-full py-4 bg-[var(--accent)] text-[var(--bg-sidebar)] rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] shadow-xl disabled:opacity-30 active:scale-[0.98] transition-all">Analyze Goals</button>
                </>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto text-sm font-medium text-[var(--text-muted)] leading-relaxed italic pr-2"><p>{wizard?.prompt || prompt}</p></div>
                  <button onClick={() => setStep(1)} className="mt-6 w-full py-3 bg-[var(--bg-app)] text-[var(--text-muted)] rounded-2xl text-xs font-black uppercase tracking-widest hover:text-[var(--text-main)] transition-all">Refine Requirements</button>
                </>
              )}
            </div>

            {/* Step 2: Thought */}
            <div className={`flex flex-col p-8 rounded-[40px] h-[360px] transition-all duration-500 ${step === 2 ? 'bg-[var(--bg-card)] shadow-2xl border-2 border-[var(--accent)] ring-8 ring-[var(--accent)]/5' : 'bg-[var(--bg-card)]/50 opacity-60'}`}>
               <h3 className="text-sm font-black text-[var(--text-main)] mb-4 uppercase tracking-[0.15em]">Agent Logic</h3>
               {step === 2 ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 border-4 border-[var(--border-main)] border-t-purple-500 rounded-full animate-spin mb-4" />
                    <p className="text-xs font-black text-[var(--text-main)] uppercase tracking-widest">Master Agent is Strategizing...</p>
                    <div className="mt-6 w-full flex-1 bg-[var(--bg-app)] rounded-2xl p-4 overflow-y-auto font-mono text-[9px] text-[var(--text-muted)] border border-[var(--border-main)] leading-relaxed italic no-scrollbar">
                       {thought || "Gathering expertise..."}
                       <span className="inline-block w-1 h-3 bg-purple-500 ml-1 animate-pulse" />
                    </div>
                 </div>
               ) : wizard ? (
                 <>
                   <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar">
                      {wizard.breakdown.map((item, i) => (
                        <div key={i} className="flex gap-2 text-[11px] font-bold text-[var(--text-main)] leading-snug"><Check className="w-3 h-3 text-green-500 shrink-0" /> {item}</div>
                      ))}
                   </div>
                   <button className="mt-6 w-full py-3 bg-[var(--bg-app)] text-[var(--text-muted)] rounded-2xl text-xs font-black uppercase tracking-widest cursor-default">Strategy Defined</button>
                 </>
               ) : null}
            </div>

            {/* Step 3: Team */}
            <div className={`flex flex-col p-8 rounded-[40px] h-[360px] transition-all duration-500 ${step === 3 ? 'bg-[var(--bg-card)] shadow-2xl border-2 border-[var(--accent)] ring-8 ring-[var(--accent)]/5' : 'bg-[var(--bg-card)]/50 opacity-60'}`}>
               <h3 className="text-sm font-black text-[var(--text-main)] mb-4 uppercase tracking-[0.15em]">Expert Deployment</h3>
               {step === 3 && wizard ? (
                 <>
                   <div className="flex-1 overflow-y-auto space-y-2 pr-2 no-scrollbar">
                      {wizard.teamObjectives.map((assign, i) => {
                        const agent = AGENTS[normalizeAgentId(assign.agentId)];
                        return (
                          <div key={i} className="bg-[var(--bg-app)] p-3 rounded-2xl border border-[var(--border-main)] flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${agent.color} text-white font-black text-xs flex items-center justify-center shadow-lg`}>{agent.initial}</div>
                            <div className="min-w-0"><p className="text-[10px] font-black text-[var(--text-main)] truncate">{agent.name}</p><p className="text-[8px] font-bold text-[var(--text-muted)] truncate">{assign.objective}</p></div>
                          </div>
                        );
                      })}
                   </div>
                   <button onClick={() => setStep(4)} className="mt-6 w-full py-4 bg-[var(--accent)] text-[var(--bg-sidebar)] rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all">Confirm Team</button>
                 </>
               ) : step > 3 && wizard ? (
                 <div className="flex-1 flex flex-col justify-center gap-4">
                    <div className="flex -space-x-3 justify-center">
                       {wizard.teamAgentIds.slice(0, 5).map((id, i) => {
                         const agent = AGENTS[normalizeAgentId(id)];
                         return <div key={i} className={`w-12 h-12 rounded-full border-4 border-[var(--bg-card)] ${agent.color} text-white font-black flex items-center justify-center shadow-xl`}>{agent.initial}</div>
                       })}
                    </div>
                    <div className="text-center font-black text-[10px] text-green-500 uppercase tracking-widest bg-green-500/10 py-2 rounded-xl border border-green-500/20">{wizard.teamAgentIds.length} Agents Ready</div>
                 </div>
               ) : null}
            </div>

            {/* Step 4: Ready */}
            <div className={`flex flex-col p-8 rounded-[40px] h-[360px] transition-all duration-500 ${step === 4 ? 'bg-[var(--bg-card)] shadow-2xl border-2 border-[var(--accent)] ring-8 ring-[var(--accent)]/5' : 'bg-[var(--bg-card)]/50 opacity-60'}`}>
               <h3 className="text-sm font-black text-[var(--text-main)] mb-4 uppercase tracking-[0.15em]">Infrastructure</h3>
               {step === 4 && wizard ? (
                 <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-[24px] flex items-center justify-center mb-6 shadow-xl border border-green-500/20"><CheckCircle2 className="w-10 h-10" /></div>
                    <p className="text-[10px] font-black text-[var(--text-muted)] leading-relaxed italic text-center mb-6 px-2">{wizard.readySummary}</p>
                    <button onClick={() => workspace && onComplete(workspace)} className="w-full py-5 bg-green-500 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-green-500/40 hover:scale-[1.05] active:scale-[0.95] transition-all pulse-green">Synthesize Flow</button>
                 </div>
               ) : null}
            </div>
          </div>
        </div>

        <div className="p-8 px-16 bg-[var(--bg-sidebar)] border-t border-[var(--border-soft)] flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-[0.3em]">ShopGen AI Orchestrator v2.0 // System Stable</span>
           </div>
           <button onClick={onClose} className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-main)] flex items-center gap-2 transition-all">Terminate Protocol <ChevronDown className="w-4 h-4" /></button>
        </div>
      </motion.div>
    </div>
  );
}
