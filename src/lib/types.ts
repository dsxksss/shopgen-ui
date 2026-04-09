export interface AgentProfile {
  id: string;
  name: string;
  title: string;
  summary: string;
  capabilities: string[];
  color: string;
}

export interface RuntimeStatus {
  configured: boolean;
  provider: string;
  baseUrl: string;
  model: string;
  readyMessage: string;
}

export interface AgentAssignment {
  agentId: string;
  agentName: string;
  objective: string;
  deliverable: string;
  status: 'pending' | 'active' | 'blocked' | 'done';
}

export interface WorkflowStage {
  name: string;
  owner: string;
  goal: string;
  action: string;
  status: 'pending' | 'active' | 'blocked' | 'done';
  output?: string;
}

export interface ChecklistItem {
  title: string;
  owner: string;
  done: boolean;
}

export interface OperationPlan {
  requestId: string;
  scenario: string;
  generatedAt: string;
  summary: string;
  merchantIntent: string;
  managerDecision: string;
  agentAssignments: AgentAssignment[];
  workflowStages: WorkflowStage[];
  executionChecklist: ChecklistItem[];
  risks: string[];
  dailyBrief: string;
  rawText: string;
}

export interface DashboardTask {
  id: string;
  title: string;
  workflow: string;
  progress: number;
  totalSteps: number;
  date: string;
  comments: number;
  attachments: number;
  agentIds: string[];
  status: 'todo' | 'in-progress' | 'done';
  progressColor: string;
  dateColor: string;
}

export interface WorkflowNodeItem {
  id: string;
  kind: 'trigger' | 'agent' | 'condition';
  title: string;
  subtitle?: string;
  description?: string;
  agentId?: string;
  status?: 'todo' | 'in-progress' | 'done';
  x: number;
  y: number;
}

export interface WorkflowEdgeItem {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
  animated: boolean;
  stroke: string;
}

export interface InspectorInput {
  label: string;
  value: string;
}

export interface InspectorTool {
  label: string;
  progress: number;
  active?: boolean;
}

export interface WorkflowInspector {
  title: string;
  agentName: string;
  status: string;
  statusSubtitle: string;
  statusTone: 'todo' | 'in-progress' | 'done';
  inputs: InspectorInput[];
  outputs: InspectorInput[];
  tools: InspectorTool[];
}

export interface WorkflowPayload {
  selectedNodeId: string;
  nodes: WorkflowNodeItem[];
  edges: WorkflowEdgeItem[];
  inspectors: Record<string, WorkflowInspector>;
}

export interface WizardPayload {
  prompt: string;
  scenario: string;
  breakdown: string[];
  teamAgentIds: string[];
  teamObjectives: Array<{
    agentId: string;
    agentName: string;
    objective: string;
  }>;
  readySummary: string;
}

export interface WorkspaceView {
  plan: OperationPlan;
  tasks: DashboardTask[];
  workflow: WorkflowPayload;
  wizard: WizardPayload;
}

export interface WorkspaceHistoryItem {
  requestId: string;
  scenario: string;
  summary: string;
  merchantIntent: string;
  generatedAt: string;
  title?: string | null;
  pinned: boolean;
}

export interface WorkspaceHistoryBundle {
  currentWorkspace: WorkspaceView | null;
  history: WorkspaceHistoryItem[];
}
