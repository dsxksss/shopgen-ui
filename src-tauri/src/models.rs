use std::collections::BTreeMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentProfile {
    pub id: String,
    pub name: String,
    pub title: String,
    pub summary: String,
    pub capabilities: Vec<String>,
    pub color: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    pub configured: bool,
    pub provider: String,
    pub base_url: String,
    pub model: String,
    pub api_key: Option<String>,
    pub openrouter_key: Option<String>,
    #[serde(default)]
    pub ready_message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct ApiConfig {
    pub base_url: Option<String>,
    pub api_key: Option<String>,
    pub model: Option<String>,
    pub openrouter_key: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentAssignment {
    pub agent_id: String,
    pub agent_name: String,
    pub objective: String,
    pub deliverable: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowStage {
    pub name: String,
    pub owner: String,
    pub goal: String,
    pub action: String,
    pub status: String,
    #[serde(default)]
    pub output: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChecklistItem {
    pub title: String,
    pub owner: String,
    pub done: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OperationPlan {
    pub request_id: String,
    pub scenario: String,
    pub generated_at: String,
    pub summary: String,
    pub merchant_intent: String,
    pub manager_decision: String,
    pub agent_assignments: Vec<AgentAssignment>,
    pub workflow_stages: Vec<WorkflowStage>,
    pub execution_checklist: Vec<ChecklistItem>,
    pub risks: Vec<String>,
    pub daily_brief: String,
    #[serde(default)]
    pub raw_text: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DashboardTask {
    pub id: String,
    pub title: String,
    pub workflow: String,
    pub progress: u8,
    pub total_steps: u8,
    pub date: String,
    pub comments: usize,
    pub attachments: usize,
    pub agent_ids: Vec<String>,
    pub status: String,
    pub progress_color: String,
    pub date_color: String,
    #[serde(default)]
    pub summary: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowNodeItem {
    pub id: String,
    pub kind: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub description: Option<String>,
    pub agent_id: Option<String>,
    pub status: Option<String>,
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowEdgeItem {
    pub id: String,
    pub source: String,
    pub target: String,
    pub source_handle: Option<String>,
    pub label: Option<String>,
    pub animated: bool,
    pub stroke: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InspectorInput {
    pub label: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InspectorTool {
    pub label: String,
    pub progress: u8,
    pub active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowInspector {
    pub title: String,
    pub agent_name: String,
    pub status: String,
    pub status_subtitle: String,
    pub status_tone: String,
    pub inputs: Vec<InspectorInput>,
    pub outputs: Vec<InspectorInput>,
    pub tools: Vec<InspectorTool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowPayload {
    pub selected_node_id: String,
    pub nodes: Vec<WorkflowNodeItem>,
    pub edges: Vec<WorkflowEdgeItem>,
    pub inspectors: BTreeMap<String, WorkflowInspector>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WizardTeamObjective {
    pub agent_id: String,
    pub agent_name: String,
    pub objective: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WizardPayload {
    pub prompt: String,
    pub scenario: String,
    pub breakdown: Vec<String>,
    pub team_agent_ids: Vec<String>,
    pub team_objectives: Vec<WizardTeamObjective>,
    pub ready_summary: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceView {
    pub plan: OperationPlan,
    pub tasks: Vec<DashboardTask>,
    pub workflow: WorkflowPayload,
    pub wizard: WizardPayload,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceHistoryItem {
    pub request_id: String,
    pub scenario: String,
    pub merchant_intent: String,
    pub summary: String,
    pub generated_at: String,
    pub title: Option<String>,
    pub pinned: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceHistoryBundle {
    pub current_workspace: Option<WorkspaceView>,
    pub history: Vec<WorkspaceHistoryItem>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LogPayload {
    pub level: String,
    pub message: String,
    pub timestamp: String,
}
