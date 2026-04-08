use std::{collections::BTreeMap, env, fs, path::PathBuf};

use chrono::Utc;
use dotenvy::dotenv;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{path::BaseDirectory, Manager};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentProfile {
    id: String,
    name: String,
    title: String,
    summary: String,
    capabilities: Vec<String>,
    color: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    configured: bool,
    provider: String,
    base_url: String,
    model: String,
    ready_message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentAssignment {
    agent_id: String,
    agent_name: String,
    objective: String,
    deliverable: String,
    status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowStage {
    name: String,
    owner: String,
    goal: String,
    action: String,
    status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChecklistItem {
    title: String,
    owner: String,
    done: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OperationPlan {
    request_id: String,
    scenario: String,
    generated_at: String,
    summary: String,
    merchant_intent: String,
    manager_decision: String,
    agent_assignments: Vec<AgentAssignment>,
    workflow_stages: Vec<WorkflowStage>,
    execution_checklist: Vec<ChecklistItem>,
    risks: Vec<String>,
    daily_brief: String,
    raw_text: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DashboardTask {
    id: String,
    title: String,
    workflow: String,
    progress: u8,
    total_steps: u8,
    date: String,
    comments: usize,
    attachments: usize,
    agent_ids: Vec<String>,
    status: String,
    progress_color: String,
    date_color: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowNodeItem {
    id: String,
    kind: String,
    title: String,
    subtitle: Option<String>,
    description: Option<String>,
    agent_id: Option<String>,
    status: Option<String>,
    x: i32,
    y: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowEdgeItem {
    id: String,
    source: String,
    target: String,
    source_handle: Option<String>,
    label: Option<String>,
    animated: bool,
    stroke: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InspectorInput {
    label: String,
    value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InspectorTool {
    label: String,
    progress: u8,
    active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowInspector {
    title: String,
    agent_name: String,
    status: String,
    status_subtitle: String,
    status_tone: String,
    inputs: Vec<InspectorInput>,
    tools: Vec<InspectorTool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowPayload {
    selected_node_id: String,
    nodes: Vec<WorkflowNodeItem>,
    edges: Vec<WorkflowEdgeItem>,
    inspectors: BTreeMap<String, WorkflowInspector>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WizardTeamObjective {
    agent_id: String,
    agent_name: String,
    objective: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WizardPayload {
    prompt: String,
    scenario: String,
    breakdown: Vec<String>,
    team_agent_ids: Vec<String>,
    team_objectives: Vec<WizardTeamObjective>,
    ready_summary: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceView {
    plan: OperationPlan,
    tasks: Vec<DashboardTask>,
    workflow: WorkflowPayload,
    wizard: WizardPayload,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceHistoryItem {
    request_id: String,
    scenario: String,
    summary: String,
    merchant_intent: String,
    generated_at: String,
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    pinned: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceHistoryBundle {
    current_workspace: Option<WorkspaceView>,
    history: Vec<WorkspaceHistoryItem>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct WorkspaceStore {
    current_request_id: Option<String>,
    history: Vec<WorkspaceHistoryItem>,
}

#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    content: Vec<AnthropicContent>,
}

#[derive(Debug, Deserialize)]
struct AnthropicContent {
    #[serde(rename = "type")]
    kind: String,
    text: Option<String>,
}

#[derive(Debug, Error)]
enum ApiError {
    #[error("缺少环境变量 {0}")]
    MissingEnv(&'static str),
    #[error("请求 AI 服务失败: {0}")]
    Request(#[from] reqwest::Error),
    #[error("解析 AI 返回失败: {0}")]
    Parse(#[from] serde_json::Error),
    #[error("AI 未返回有效文本")]
    EmptyResponse,
    #[error("AI 返回内容不符合 JSON 结构: {0}")]
    InvalidPayload(String),
    #[error("读取工作区失败: {0}")]
    Io(#[from] std::io::Error),
    #[error("无法定位应用数据目录")]
    AppDirUnavailable,
    #[error("找不到指定工作区 {0}")]
    WorkspaceNotFound(String),
}

impl Serialize for ApiError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

fn agent_catalog() -> Vec<AgentProfile> {
    vec![
        AgentProfile { id: "manager".into(), name: "店长".into(), title: "总协调与决策指挥".into(), summary: "负责理解商家诉求、拆解任务、调度其余 6 个 Agent，并输出最终执行决策。".into(), capabilities: vec!["任务拆解".into(), "Agent 调度".into(), "进度监控".into(), "决策汇总".into()], color: "from-sky-500 to-cyan-400".into() },
        AgentProfile { id: "designer".into(), name: "美工".into(), title: "商品视觉与活动素材".into(), summary: "聚焦商品图、Banner、详情页视觉方向，输出适合电商转化的设计指令与素材建议。".into(), capabilities: vec!["商品图设计".into(), "Banner 视觉".into(), "详情页结构".into(), "设计提示词".into()], color: "from-pink-500 to-rose-400".into() },
        AgentProfile { id: "copywriter".into(), name: "文案".into(), title: "标题卖点与营销表达".into(), summary: "负责商品标题、卖点提炼、详情文案、活动话术与关键词优化。".into(), capabilities: vec!["标题优化".into(), "卖点提炼".into(), "详情文案".into(), "活动话术".into()], color: "from-amber-500 to-yellow-400".into() },
        AgentProfile { id: "operator".into(), name: "运营".into(), title: "数据分析与推广策略".into(), summary: "根据经营目标给出数据洞察、上架节奏、促销策略与竞品分析建议。".into(), capabilities: vec!["数据分析".into(), "推广规划".into(), "竞品分析".into(), "活动策划".into()], color: "from-emerald-500 to-lime-400".into() },
        AgentProfile { id: "service".into(), name: "客服".into(), title: "咨询回复与售后跟进".into(), summary: "处理售前问答、售后安抚、订单跟进与情绪识别。".into(), capabilities: vec!["自动回复".into(), "问题解答".into(), "售后安抚".into(), "情感分析".into()], color: "from-violet-500 to-fuchsia-400".into() },
        AgentProfile { id: "finance".into(), name: "财务".into(), title: "利润核算与经营报表".into(), summary: "负责订单记账、毛利测算、预算提醒与财务视角日报。".into(), capabilities: vec!["收支记录".into(), "利润计算".into(), "预算监控".into(), "报表摘要".into()], color: "from-orange-500 to-amber-400".into() },
        AgentProfile { id: "warehouse".into(), name: "仓储".into(), title: "库存监控与发货协同".into(), summary: "负责安全库存预警、补货建议、发货节奏与仓储风险提示。".into(), capabilities: vec!["库存预警".into(), "补货建议".into(), "发货安排".into(), "异常提示".into()], color: "from-teal-500 to-cyan-400".into() },
    ]
}

fn agent_name(id: &str) -> &'static str {
    match id {
        "manager" => "店长",
        "designer" => "美工",
        "copywriter" => "文案",
        "operator" => "运营",
        "service" => "客服",
        "finance" => "财务",
        "warehouse" => "仓储",
        _ => "店长",
    }
}

fn normalize_agent_id(value: &str) -> String {
    match value.trim().to_lowercase().as_str() {
        "manager" | "店长" => "manager".into(),
        "designer" | "美工" => "designer".into(),
        "copywriter" | "文案" => "copywriter".into(),
        "operator" | "运营" => "operator".into(),
        "service" | "客服" => "service".into(),
        "finance" | "财务" => "finance".into(),
        "warehouse" | "仓储" => "warehouse".into(),
        _ => "manager".into(),
    }
}

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, ApiError> {
    let app_dir = app.path().resolve("shopgen", BaseDirectory::AppData).map_err(|_| ApiError::AppDirUnavailable)?;
    fs::create_dir_all(&app_dir)?;
    Ok(app_dir)
}

fn workspace_store_path(app: &tauri::AppHandle) -> Result<PathBuf, ApiError> {
    Ok(app_data_dir(app)?.join("workspace-store.json"))
}

fn workspace_view_path(app: &tauri::AppHandle, request_id: &str) -> Result<PathBuf, ApiError> {
    Ok(app_data_dir(app)?.join(format!("workspace-{}.json", request_id)))
}

fn read_store(app: &tauri::AppHandle) -> Result<WorkspaceStore, ApiError> {
    let path = workspace_store_path(app)?;
    if !path.exists() {
        return Ok(WorkspaceStore::default());
    }
    let content = fs::read_to_string(path)?;
    Ok(serde_json::from_str(&content)?)
}

fn write_store(app: &tauri::AppHandle, store: &WorkspaceStore) -> Result<(), ApiError> {
    let path = workspace_store_path(app)?;
    fs::write(path, serde_json::to_string_pretty(store)?)?;
    Ok(())
}

fn history_item_from_view(view: &WorkspaceView) -> WorkspaceHistoryItem {
    WorkspaceHistoryItem {
        request_id: view.plan.request_id.clone(),
        scenario: view.plan.scenario.clone(),
        summary: view.plan.summary.clone(),
        merchant_intent: view.plan.merchant_intent.clone(),
        generated_at: view.plan.generated_at.clone(),
        title: None,
        pinned: false,
    }
}

fn sort_history(history: &mut [WorkspaceHistoryItem]) {
    history.sort_by(|left, right| right.pinned.cmp(&left.pinned).then_with(|| right.generated_at.cmp(&left.generated_at)));
}

fn save_workspace_view(app: &tauri::AppHandle, view: &WorkspaceView) -> Result<(), ApiError> {
    let view_path = workspace_view_path(app, &view.plan.request_id)?;
    fs::write(view_path, serde_json::to_string_pretty(view)?)?;

    let mut store = read_store(app)?;
    let existing_item = store.history.iter().find(|item| item.request_id == view.plan.request_id).cloned();
    store.history.retain(|item| item.request_id != view.plan.request_id);

    let mut history_item = history_item_from_view(view);
    if let Some(existing_item) = existing_item {
        history_item.title = existing_item.title;
        history_item.pinned = existing_item.pinned;
    }

    store.history.push(history_item);
    sort_history(&mut store.history);
    store.current_request_id = Some(view.plan.request_id.clone());
    write_store(app, &store)?;
    Ok(())
}

fn read_workspace_by_id(app: &tauri::AppHandle, request_id: &str) -> Result<WorkspaceView, ApiError> {
    let path = workspace_view_path(app, request_id)?;
    if !path.exists() {
        return Err(ApiError::WorkspaceNotFound(request_id.into()));
    }
    Ok(serde_json::from_str::<WorkspaceView>(&fs::read_to_string(path)?)?)
}

fn load_workspace_history_bundle(app: &tauri::AppHandle) -> Result<WorkspaceHistoryBundle, ApiError> {
    let mut store = read_store(app)?;
    sort_history(&mut store.history);
    let current_workspace = match store.current_request_id {
        Some(ref request_id) => Some(read_workspace_by_id(app, request_id)?),
        None => None,
    };
    Ok(WorkspaceHistoryBundle { current_workspace, history: store.history })
}

fn switch_workspace_record(app: &tauri::AppHandle, request_id: &str) -> Result<WorkspaceView, ApiError> {
    let workspace = read_workspace_by_id(app, request_id)?;
    let mut store = read_store(app)?;
    store.current_request_id = Some(request_id.into());
    write_store(app, &store)?;
    Ok(workspace)
}

fn delete_workspace_record(app: &tauri::AppHandle, request_id: &str) -> Result<(), ApiError> {
    let path = workspace_view_path(app, request_id)?;
    if path.exists() {
        fs::remove_file(path)?;
    }
    let mut store = read_store(app)?;
    store.history.retain(|item| item.request_id != request_id);
    sort_history(&mut store.history);
    if store.current_request_id.as_deref() == Some(request_id) {
        store.current_request_id = store.history.first().map(|item| item.request_id.clone());
    }
    write_store(app, &store)?;
    Ok(())
}

fn clear_workspace_records(app: &tauri::AppHandle) -> Result<(), ApiError> {
    let store = read_store(app)?;
    for item in store.history {
        let path = workspace_view_path(app, &item.request_id)?;
        if path.exists() {
            fs::remove_file(path)?;
        }
    }
    write_store(app, &WorkspaceStore::default())?;
    Ok(())
}

fn rename_workspace_record(app: &tauri::AppHandle, request_id: &str, title: &str) -> Result<WorkspaceHistoryBundle, ApiError> {
    let mut store = read_store(app)?;
    let item = store.history.iter_mut().find(|item| item.request_id == request_id).ok_or_else(|| ApiError::WorkspaceNotFound(request_id.into()))?;
    let trimmed = title.trim();
    item.title = if trimmed.is_empty() { None } else { Some(trimmed.to_string()) };
    sort_history(&mut store.history);
    write_store(app, &store)?;
    load_workspace_history_bundle(app)
}

fn toggle_pin_workspace_record(app: &tauri::AppHandle, request_id: &str) -> Result<WorkspaceHistoryBundle, ApiError> {
    let mut store = read_store(app)?;
    let item = store.history.iter_mut().find(|item| item.request_id == request_id).ok_or_else(|| ApiError::WorkspaceNotFound(request_id.into()))?;
    item.pinned = !item.pinned;
    sort_history(&mut store.history);
    write_store(app, &store)?;
    load_workspace_history_bundle(app)
}

fn read_env(name: &'static str) -> Result<String, ApiError> {
    env::var(name).map_err(|_| ApiError::MissingEnv(name))
}

fn extract_text(response: &AnthropicResponse) -> Option<String> {
    response.content.iter().filter(|item| item.kind == "text").filter_map(|item| item.text.clone()).reduce(|mut acc, text| {
        acc.push('\n');
        acc.push_str(&text);
        acc
    })
}

fn build_system_prompt() -> String {
    [
        "你是 ShopGen 的店长 Agent，总负责协调 7 个电商运营 Agent。",
        "你需要根据商家的输入，输出一个可执行的电商运营 JSON 方案。",
        "请只返回 JSON，不要返回 Markdown，不要加代码块，不要输出额外说明。",
        "JSON 字段必须完整，结构如下：",
        "{",
        "  \"summary\": \"string\",",
        "  \"merchantIntent\": \"string\",",
        "  \"managerDecision\": \"string\",",
        "  \"agentAssignments\": [",
        "    { \"agentId\": \"manager|designer|copywriter|operator|service|finance|warehouse\", \"agentName\": \"string\", \"objective\": \"string\", \"deliverable\": \"string\", \"status\": \"pending|active|blocked|done\" }",
        "  ],",
        "  \"workflowStages\": [",
        "    { \"name\": \"string\", \"owner\": \"string\", \"goal\": \"string\", \"action\": \"string\", \"status\": \"pending|active|blocked|done\" }",
        "  ],",
        "  \"executionChecklist\": [",
        "    { \"title\": \"string\", \"owner\": \"string\", \"done\": false }",
        "  ],",
        "  \"risks\": [\"string\"],",
        "  \"dailyBrief\": \"string\"",
        "}",
        "要求：",
        "1. 结合场景识别使用新品上架、促销活动策划、日常经营管理中的哪一种。",
        "2. 至少分配 4 个 Agent，最多 7 个 Agent。",
        "3. 输出内容必须贴合个人电商商家的实际执行。",
        "4. 所有内容使用简体中文。",
    ].join("\n")
}

async fn request_plan(prompt: String, scenario: String) -> Result<OperationPlan, ApiError> {
    dotenv().ok();

    let base_url = read_env("ANTHROPIC_BASE_URL")?;
    let api_key = read_env("ANTHROPIC_API_KEY")?;
    let model = env::var("MINIMAX_MODEL").unwrap_or_else(|_| "MiniMax-M2.7".to_string());

    let endpoint = format!("{}/v1/messages", base_url.trim_end_matches('/'));
    let body = json!({
        "model": model,
        "max_tokens": 1800,
        "system": build_system_prompt(),
        "messages": [{
            "role": "user",
            "content": [{ "type": "text", "text": format!("场景：{}\n商家需求：{}", scenario, prompt) }]
        }]
    });

    let response = Client::new()
        .post(endpoint)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .json(&body)
        .send()
        .await?
        .error_for_status()?
        .json::<AnthropicResponse>()
        .await?;

    let raw_text = extract_text(&response).ok_or(ApiError::EmptyResponse)?;
    let payload: Value = serde_json::from_str(&raw_text)?;

    let summary = payload.get("summary").and_then(Value::as_str).ok_or_else(|| ApiError::InvalidPayload("缺少 summary".into()))?.to_string();
    let merchant_intent = payload.get("merchantIntent").and_then(Value::as_str).ok_or_else(|| ApiError::InvalidPayload("缺少 merchantIntent".into()))?.to_string();
    let manager_decision = payload.get("managerDecision").and_then(Value::as_str).ok_or_else(|| ApiError::InvalidPayload("缺少 managerDecision".into()))?.to_string();
    let daily_brief = payload.get("dailyBrief").and_then(Value::as_str).ok_or_else(|| ApiError::InvalidPayload("缺少 dailyBrief".into()))?.to_string();
    let agent_assignments: Vec<AgentAssignment> = serde_json::from_value(payload.get("agentAssignments").cloned().ok_or_else(|| ApiError::InvalidPayload("缺少 agentAssignments".into()))?)?;
    let workflow_stages: Vec<WorkflowStage> = serde_json::from_value(payload.get("workflowStages").cloned().ok_or_else(|| ApiError::InvalidPayload("缺少 workflowStages".into()))?)?;
    let execution_checklist: Vec<ChecklistItem> = serde_json::from_value(payload.get("executionChecklist").cloned().ok_or_else(|| ApiError::InvalidPayload("缺少 executionChecklist".into()))?)?;
    let risks: Vec<String> = serde_json::from_value(payload.get("risks").cloned().ok_or_else(|| ApiError::InvalidPayload("缺少 risks".into()))?)?;

    Ok(OperationPlan {
        request_id: Uuid::new_v4().to_string(),
        scenario,
        generated_at: Utc::now().to_rfc3339(),
        summary,
        merchant_intent,
        manager_decision,
        agent_assignments,
        workflow_stages,
        execution_checklist,
        risks,
        daily_brief,
        raw_text,
    })
}

fn status_to_task_status(status: &str) -> &'static str {
    match status {
        "done" => "done",
        "active" => "in-progress",
        _ => "todo",
    }
}

fn progress_for_status(status: &str, total_steps: u8) -> u8 {
    match status {
        "done" => total_steps,
        "active" => ((total_steps as f32) * 0.6).ceil() as u8,
        _ => ((total_steps as f32) * 0.2).ceil().max(1.0) as u8,
    }
}

fn build_tasks(plan: &OperationPlan) -> Vec<DashboardTask> {
    plan.agent_assignments.iter().enumerate().map(|(index, assignment)| {
        let agent_id = normalize_agent_id(&assignment.agent_id);
        let related_stage_count = plan.workflow_stages.iter().filter(|stage| normalize_agent_id(&stage.owner) == agent_id).count();
        let related_checklist_count = plan.execution_checklist.iter().filter(|item| normalize_agent_id(&item.owner) == agent_id).count();
        let total_steps = u8::max(8, (related_stage_count.max(related_checklist_count).max(3) * 2) as u8);
        let task_status = status_to_task_status(&assignment.status).to_string();

        DashboardTask {
            id: format!("{}-{}-{}", plan.request_id, assignment.agent_id, index),
            title: assignment.objective.clone(),
            workflow: plan.scenario.clone(),
            progress: progress_for_status(&assignment.status, total_steps),
            total_steps,
            date: chrono::DateTime::parse_from_rfc3339(&plan.generated_at).map(|dt| dt.format("%-d %b %Y").to_string()).unwrap_or_else(|_| plan.generated_at.clone()),
            comments: related_stage_count,
            attachments: related_checklist_count,
            agent_ids: vec!["manager".into(), agent_id.clone()],
            status: task_status.clone(),
            progress_color: if task_status == "done" { "bg-green-500".into() } else if task_status == "in-progress" { "bg-orange-400".into() } else { "bg-red-400".into() },
            date_color: if task_status == "done" { "text-slate-500 bg-slate-100".into() } else if task_status == "in-progress" { "text-orange-500 bg-orange-50".into() } else { "text-red-500 bg-red-50".into() },
        }
    }).collect()
}

fn build_workflow(plan: &OperationPlan) -> WorkflowPayload {
    let mut nodes = vec![WorkflowNodeItem { id: "trigger".into(), kind: "trigger".into(), title: plan.scenario.clone(), subtitle: None, description: Some(plan.summary.clone()), agent_id: None, status: None, x: 20, y: 220 }];
    let mut edges = Vec::new();
    let mut inspectors = BTreeMap::new();
    let mut previous_id = "trigger".to_string();
    let mut selected_node_id = String::new();

    for (index, stage) in plan.workflow_stages.iter().enumerate() {
        let agent_id = normalize_agent_id(&stage.owner);
        let node_id = format!("stage-{}", index);
        if selected_node_id.is_empty() {
            selected_node_id = node_id.clone();
        }

        nodes.push(WorkflowNodeItem { id: node_id.clone(), kind: "agent".into(), title: stage.name.clone(), subtitle: Some(format!("{} Agent", agent_name(&agent_id))), description: Some(stage.action.clone()), agent_id: Some(agent_id.clone()), status: Some(status_to_task_status(&stage.status).into()), x: 270 + (index as i32) * 280, y: 110 + ((index % 2) as i32) * 150 });
        edges.push(WorkflowEdgeItem { id: format!("edge-{}-{}", previous_id, node_id), source: previous_id.clone(), target: node_id.clone(), source_handle: None, label: None, animated: true, stroke: "#94a3b8".into() });
        inspectors.insert(node_id.clone(), WorkflowInspector {
            title: stage.name.clone(),
            agent_name: format!("{} Agent", agent_name(&agent_id)),
            status: if stage.status == "done" { "已完成当前阶段".into() } else if stage.status == "active" { "正在执行当前阶段...".into() } else { "等待店长调度执行".into() },
            status_subtitle: if stage.status == "done" { "本阶段结果已回写到工作台".into() } else if stage.status == "active" { format!("当前目标：{}", stage.goal) } else { format!("执行目标：{}", stage.goal) },
            status_tone: status_to_task_status(&stage.status).into(),
            inputs: vec![InspectorInput { label: "阶段目标".into(), value: stage.goal.clone() }, InspectorInput { label: "负责人".into(), value: agent_name(&agent_id).into() }, InspectorInput { label: "商家诉求".into(), value: plan.merchant_intent.clone() }],
            tools: vec![InspectorTool { label: "任务拆解".into(), progress: if stage.status == "done" { 100 } else if stage.status == "active" { 72 } else { 0 }, active: stage.status == "active" }, InspectorTool { label: "结果回填".into(), progress: if stage.status == "done" { 100 } else if stage.status == "active" { 45 } else { 0 }, active: false }],
        });
        previous_id = node_id;
    }

    if !plan.risks.is_empty() {
        let condition_id = "risk-guard".to_string();
        nodes.push(WorkflowNodeItem { id: condition_id.clone(), kind: "condition".into(), title: "风险校验".into(), subtitle: Some("店长 Agent".into()), description: Some("核查执行风险、库存、利润与售后依赖项".into()), agent_id: Some("manager".into()), status: Some("in-progress".into()), x: 230 + (plan.workflow_stages.len() as i32) * 280, y: 240 });
        edges.push(WorkflowEdgeItem { id: format!("edge-{}-{}", previous_id, condition_id), source: previous_id, target: condition_id.clone(), source_handle: None, label: None, animated: true, stroke: "#f97316".into() });
        inspectors.insert(condition_id.clone(), WorkflowInspector { title: "风险校验".into(), agent_name: "店长 Agent".into(), status: "正在检查高风险项".into(), status_subtitle: format!("{} 条风险待关注", plan.risks.len()), status_tone: "in-progress".into(), inputs: plan.risks.iter().take(3).enumerate().map(|(index, risk)| InspectorInput { label: format!("风险 {}", index + 1), value: risk.clone() }).collect(), tools: vec![InspectorTool { label: "策略审查".into(), progress: 80, active: true }, InspectorTool { label: "执行确认".into(), progress: 30, active: false }] });
    }

    WorkflowPayload { selected_node_id, nodes, edges, inspectors }
}

fn build_wizard(prompt: &str, plan: &OperationPlan) -> WizardPayload {
    WizardPayload { prompt: prompt.into(), scenario: plan.scenario.clone(), breakdown: plan.workflow_stages.iter().take(3).map(|stage| stage.goal.clone()).collect(), team_agent_ids: plan.agent_assignments.iter().take(4).map(|assignment| normalize_agent_id(&assignment.agent_id)).collect(), team_objectives: plan.agent_assignments.iter().take(4).map(|assignment| WizardTeamObjective { agent_id: normalize_agent_id(&assignment.agent_id), agent_name: assignment.agent_name.clone(), objective: assignment.objective.clone() }).collect(), ready_summary: plan.summary.clone() }
}

fn build_workspace_view(prompt: String, plan: OperationPlan) -> WorkspaceView {
    WorkspaceView { plan: plan.clone(), tasks: build_tasks(&plan), workflow: build_workflow(&plan), wizard: build_wizard(&prompt, &plan) }
}

#[tauri::command]
fn get_agent_catalog() -> Vec<AgentProfile> {
    agent_catalog()
}

#[tauri::command]
fn get_runtime_status() -> RuntimeStatus {
    dotenv().ok();
    let base_url = env::var("ANTHROPIC_BASE_URL").unwrap_or_else(|_| "https://api.minimaxi.com/anthropic".into());
    let model = env::var("MINIMAX_MODEL").unwrap_or_else(|_| "MiniMax-M2.7".into());
    let configured = env::var("ANTHROPIC_API_KEY").map(|v| !v.trim().is_empty()).unwrap_or(false);
    RuntimeStatus { configured, provider: "MiniMax Anthropic Compatible API".into(), base_url, model, ready_message: if configured { "Rust 后端已接入真实 AI 服务，可以直接生成运营方案。".into() } else { "尚未检测到 API Key，请先配置 ANTHROPIC_API_KEY。".into() } }
}

#[tauri::command]
async fn generate_workspace_view(app: tauri::AppHandle, prompt: String, scenario: String) -> Result<WorkspaceView, ApiError> {
    let plan = request_plan(prompt.clone(), scenario).await?;
    let workspace = build_workspace_view(prompt, plan);
    save_workspace_view(&app, &workspace)?;
    Ok(workspace)
}

#[tauri::command]
fn load_workspace_history(app: tauri::AppHandle) -> Result<WorkspaceHistoryBundle, ApiError> {
    load_workspace_history_bundle(&app)
}

#[tauri::command]
fn switch_workspace(app: tauri::AppHandle, request_id: String) -> Result<WorkspaceView, ApiError> {
    switch_workspace_record(&app, &request_id)
}

#[tauri::command]
fn clear_workspace_view(app: tauri::AppHandle) -> Result<(), ApiError> {
    clear_workspace_records(&app)
}

#[tauri::command]
fn delete_workspace(app: tauri::AppHandle, request_id: String) -> Result<(), ApiError> {
    delete_workspace_record(&app, &request_id)
}

#[tauri::command]
fn rename_workspace(app: tauri::AppHandle, request_id: String, title: String) -> Result<WorkspaceHistoryBundle, ApiError> {
    rename_workspace_record(&app, &request_id, &title)
}

#[tauri::command]
fn toggle_pin_workspace(app: tauri::AppHandle, request_id: String) -> Result<WorkspaceHistoryBundle, ApiError> {
    toggle_pin_workspace_record(&app, &request_id)
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("ShopGen 智能电商运营中心");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_agent_catalog, get_runtime_status, generate_workspace_view, load_workspace_history, switch_workspace, clear_workspace_view, delete_workspace, rename_workspace, toggle_pin_workspace])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
