import React from 'react';
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
import {
  BarChart2,
  Image as ImageIcon,
  MessageSquare,
  Package,
  PenTool,
  BadgeCheck,
  Hexagon,
} from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import type { WorkflowPayload, WorkflowNodeItem, WorkspaceHistoryItem } from './types';

export type AgentType = 'manager' | 'designer' | 'copywriter' | 'operator' | 'service' | 'finance' | 'warehouse';
export type MenuKey = 'overview' | 'new-product' | 'promo' | 'daily';

export const DEFAULT_PROMPTS: Record<string, string> = {
  '新品上架流程': '请帮我为春季新款女装做一套完整的新品上架方案，包含主图方向、标题卖点、上架节奏、库存建议和客服话术。',
  '促销活动策划': '请帮我策划一场“五一特惠”大促活动，包含活动主题、打折满减方案、站内外推广节奏以及预估营销预算。',
  '日常经营管理': '请帮我梳理日常店铺管理的数据监控看板，需要关注的转化率指标、客服关键响应要求，以及每周库存盘点重点。',
};

export interface AgentInfo {
  id: AgentType;
  name: string;
  color: string;
  initial: string;
  nodeColor: string;
}

export const AGENTS: Record<AgentType, AgentInfo> = {
  manager: { id: 'manager', name: '店长', color: 'bg-blue-500', initial: '店', nodeColor: 'bg-blue-500' },
  designer: { id: 'designer', name: '美工', color: 'bg-pink-500', initial: '美', nodeColor: 'bg-pink-500' },
  copywriter: { id: 'copywriter', name: '文案', color: 'bg-yellow-500', initial: '文', nodeColor: 'bg-yellow-500' },
  operator: { id: 'operator', name: '运营', color: 'bg-green-500', initial: '运', nodeColor: 'bg-green-500' },
  service: { id: 'service', name: '客服', color: 'bg-purple-500', initial: '客', nodeColor: 'bg-purple-500' },
  finance: { id: 'finance', name: '财务', color: 'bg-orange-500', initial: '财', nodeColor: 'bg-orange-500' },
  warehouse: { id: 'warehouse', name: '仓储', color: 'bg-teal-500', initial: '仓', nodeColor: 'bg-teal-500' },
};

export const MENU_TO_SCENARIO: Record<Exclude<MenuKey, 'overview'>, string> = {
  'new-product': '新品上架流程',
  promo: '促销活动策划',
  daily: '日常经营管理',
};

export function normalizeAgentId(value: string): AgentType {
  const normalized = value.trim().toLowerCase();
  if (normalized in AGENTS) return normalized as AgentType;
  const aliasMap: Record<string, AgentType> = { 店长: 'manager', 美工: 'designer', 文案: 'copywriter', 运营: 'operator', 客服: 'service', 财务: 'finance', 仓储: 'warehouse' };
  return aliasMap[value] ?? 'manager';
}

export function scenarioToMenu(scenario: string): MenuKey {
  switch (scenario) {
    case '新品上架流程': return 'new-product';
    case '促销活动策划': return 'promo';
    case '日常经营管理': return 'daily';
    default: return 'overview';
  }
}

export function menuToScenario(menu: MenuKey): string {
  if (menu === 'overview') return '新品上架流程';
  return MENU_TO_SCENARIO[menu];
}

export function sortHistoryItems(history: WorkspaceHistoryItem[]) {
  return [...history].sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.generatedAt.localeCompare(left.generatedAt));
}

export function agentIcon(agentId?: string) {
  switch (normalizeAgentId(agentId ?? 'manager')) {
    case 'designer': return <ImageIcon className="w-4 h-4" />;
    case 'copywriter': return <PenTool className="w-4 h-4" />;
    case 'operator': return <BarChart2 className="w-4 h-4" />;
    case 'warehouse': return <Package className="w-4 h-4" />;
    case 'service': return <MessageSquare className="w-4 h-4" />;
    case 'finance': return <BadgeCheck className="w-4 h-4" />;
    default: return <Hexagon className="w-4 h-4 fill-current" />;
  }
}

export function findPreferredNodeId(workflow: WorkflowPayload | null) {
  if (!workflow) return '';
  const activeNode = workflow.nodes.find((node) => node.status === 'in-progress');
  if (activeNode) return activeNode.id;
  const doneNode = [...workflow.nodes].reverse().find((node) => node.status === 'done');
  if (doneNode) return doneNode.id;
  return workflow.selectedNodeId ?? '';
}

export function buildReactFlowPayload(payload: WorkflowPayload) {
  const nodes: Node[] = payload.nodes.map((node: WorkflowNodeItem) => {
    if (node.kind === 'trigger') return { id: node.id, type: 'triggerNode', position: { x: node.x, y: node.y }, data: { title: node.title } };
    if (node.kind === 'condition') return { id: node.id, type: 'conditionNode', position: { x: node.x, y: node.y }, data: { title: node.title } };
    const agentId = normalizeAgentId(node.agentId ?? 'manager');
    return { id: node.id, type: 'agentNode', position: { x: node.x, y: node.y }, data: { title: node.title, agentName: node.subtitle ?? `${AGENTS[agentId].name} Agent`, agentColor: AGENTS[agentId].nodeColor, icon: agentIcon(agentId), description: node.description ?? '', status: node.status === 'done' ? 'done' : node.status === 'in-progress' ? 'in-progress' : 'todo' } };
  });
  const edges: Edge[] = payload.edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourceHandle, label: edge.label, animated: edge.animated, style: { stroke: edge.stroke, strokeWidth: 2 } }));
  return { nodes, edges };
}
