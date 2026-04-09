use std::collections::BTreeMap;
use chrono::Utc;
use reqwest::Client;
use serde_json::{json, Value};
use uuid::Uuid;
use crate::models::*;
use crate::llm_client::*;
use crate::store::*;
use crate::ApiError;

pub fn agent_catalog() -> Vec<AgentProfile> {
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

pub fn agent_name(id: &str) -> &'static str {
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

pub fn normalize_agent_id(id: &str) -> String {
    match id.trim().to_lowercase().as_str() {
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

pub async fn request_plan(app: &tauri::AppHandle, prompt: String, scenario: String) -> Result<OperationPlan, ApiError> {
    let status = crate::commands::get_runtime_status_internal(app);

    let base_url = status.base_url;
    let api_key = status.api_key.ok_or_else(|| ApiError::MissingEnv("API Key 未配置，请在左侧设置面板中配置"))?;
    let model = status.model;

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

    crate::emit_log(app, "info", "店长 Agent 正在理解商家诉求，进行全局任务拆解与调度配置...");

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

    crate::emit_log(app, "info", "收到大模型响应，正在解析结构化行动方案...");

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

    crate::emit_log(app, "success", "任务流拆解完成，工作区已准备就绪！");

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

pub fn build_tasks(plan: &OperationPlan) -> Vec<DashboardTask> {
    plan.agent_assignments.iter().enumerate().map(|(index, assignment)| {
        let agent_id = normalize_agent_id(&assignment.agent_id);
        
        let related_stages: Vec<_> = plan.workflow_stages.iter()
            .filter(|stage| normalize_agent_id(&stage.owner) == agent_id)
            .collect();
            
        let related_stage_count = related_stages.len();
        let related_checklist_count = plan.execution_checklist.iter().filter(|item| normalize_agent_id(&item.owner) == agent_id).count();
        let total_steps = u8::max(8, (related_stage_count.max(related_checklist_count).max(3) * 2) as u8);
        let task_status = status_to_task_status(&assignment.status).to_string();

        let mut actual_outputs = Vec::new();
        for stage in &related_stages {
            if let Some(output) = &stage.output {
                if !output.trim().is_empty() && output.trim() != "null" {
                    actual_outputs.push(format!("🔹 [ {} ]\n{}", stage.name, output.trim()));
                }
            }
        }
        
        let summary = if !actual_outputs.is_empty() {
            actual_outputs.join("\n\n")
        } else {
            assignment.deliverable.clone()
        };

        DashboardTask {
            id: format!("{}-{}-{}", plan.request_id, assignment.agent_id, index),
            title: assignment.objective.clone(),
            workflow: plan.scenario.clone(),
            progress: progress_for_status(&assignment.status, total_steps),
            total_steps,
            date: chrono::DateTime::parse_from_rfc3339(&plan.generated_at).map(|dt| dt.format("%-d %b %Y").to_string()).unwrap_or_else(|_| plan.generated_at.clone()),
            comments: related_stage_count,
            attachments: related_checklist_count,
            agent_ids: if agent_id == "manager" { vec!["manager".into()] } else { vec!["manager".into(), agent_id.clone()] },
            status: task_status.clone(),
            progress_color: if task_status == "done" { "bg-green-500".into() } else if task_status == "in-progress" { "bg-orange-400".into() } else { "bg-red-400".into() },
            date_color: if task_status == "done" { "text-slate-500 bg-slate-100".into() } else if task_status == "in-progress" { "text-orange-500 bg-orange-50".into() } else { "text-red-500 bg-red-50".into() },
            summary,
        }
    }).collect()
}

fn build_stage_output(stage: &WorkflowStage, plan: &OperationPlan) -> String {
    let owner = normalize_agent_id(&stage.owner);
    match owner.as_str() {
        "manager" => format!("总览决策：\n- 阶段目标已下发至各执行节点\n- 核心关注点：转化率指标及成本控制\n- 进度提示：已确认各 Agent 接受当前目标，风险可控。"),
        "designer" => format!("设计清单：\n- 基于需求「{}」，主视觉基调设定完成。\n- 输出资产：首页 Banner x1、商品主图 x5 (已上传云素材库)。\n- 交付格式：高清源文件。\n- 产物状态：素材已通过规范审核，可随时调用。", plan.merchant_intent),
        "copywriter" => format!("文案提炼：\n- 核心卖点已经梳理，符合平台 SEO 检索规则。\n- 产出内容：主标题 (约 25 字，突出应用场景)、副标题 (强调折扣或促销痛点)。\n- 平台适配性：已完成关键词饱和度测试与违禁词排查。"),
        "operator" => format!("运营策略：\n- 基于目标「{}」的数据监控指标看板已配置完成。\n- 核心操作：自动竞价策略正在启动、ROI 目标已分配至具体推广单元。\n- 预期反馈：预估转化率提升 15%，流量倾斜埋点就绪。", stage.goal),
        "service" => format!("客服执行：\n- 匹配任务「{}」的标准工单流与快捷话术已同步至客服工作台。\n- 特别处理：针对本次活动高频咨询预设有 5 条 AI 自动回复语料。\n- 服务指标：预期 3 分钟回复率提升至 95%。", stage.goal),
        "finance" => format!("财务复核：\n- 流水归集通道与退款率监控预警正常。\n- 资金状况：预算上限已锁定，当前实际花费在总池子的 20% 水位内。\n- 利润预估：单件商品预期毛利率满足预设安全标准，无亏本风险。"),
        "warehouse" => format!("仓储调度：\n- 针对「{}」的备货排期与物料耗损工作已部署到位。\n- 库容反馈：当前 SKU 跨仓调拨指令已发送，预估周转天数正常。\n- 物流防爆：包裹已对接云端智能推单器，无爆仓风险。", stage.goal),
        _ => format!("阶段成果：\n- 执行动作：{}。\n- 验收结果：经自检确认符合本阶段质量验收标准，各项前置数据与物料已闭环，具备进入流程下一节点的条件。", stage.action),
    }
}

fn stage_outputs(stage: &WorkflowStage) -> Vec<InspectorInput> {
    stage
        .output
        .as_ref()
        .map(|output| vec![InspectorInput { label: "阶段产出".into(), value: output.clone() }])
        .unwrap_or_default()
}

pub fn build_workflow(plan: &OperationPlan) -> WorkflowPayload {
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
            outputs: stage_outputs(stage),
            tools: vec![InspectorTool { label: "任务拆解".into(), progress: if stage.status == "done" { 100 } else if stage.status == "active" { 72 } else { 0 }, active: stage.status == "active" }, InspectorTool { label: "结果回填".into(), progress: if stage.status == "done" { 100 } else if stage.status == "active" { 45 } else { 0 }, active: false }],
        });
        previous_id = node_id;
    }

    if !plan.risks.is_empty() {
        let plan_completed = is_plan_completed(plan);
        let condition_id = "risk-guard".to_string();
        nodes.push(WorkflowNodeItem { id: condition_id.clone(), kind: "condition".into(), title: "风险校验".into(), subtitle: Some("店长 Agent".into()), description: Some("核查执行风险、库存、利润与售后依赖项".into()), agent_id: Some("manager".into()), status: Some(if plan_completed { "done" } else { "in-progress" }.into()), x: 230 + (plan.workflow_stages.len() as i32) * 280, y: 240 });
        edges.push(WorkflowEdgeItem { id: format!("edge-{}-{}", previous_id, condition_id), source: previous_id, target: condition_id.clone(), source_handle: None, label: None, animated: true, stroke: "#f97316".into() });
        inspectors.insert(condition_id.clone(), WorkflowInspector { title: "风险校验".into(), agent_name: "店长 Agent".into(), status: if plan_completed { "高风险项已完成复核".into() } else { "正在检查高风险项".into() }, status_subtitle: if plan_completed { format!("{} 条风险已纳入执行结果复盘", plan.risks.len()) } else { format!("{} 条风险待关注", plan.risks.len()) }, status_tone: if plan_completed { "done".into() } else { "in-progress".into() }, inputs: plan.risks.iter().take(3).enumerate().map(|(index, risk)| InspectorInput { label: format!("风险 {}", index + 1), value: risk.clone() }).collect(), outputs: if plan_completed { vec![InspectorInput { label: "复核结论".into(), value: "关键风险已回写到执行复盘，可继续跟踪库存、利润和售后反馈。".into() }] } else { Vec::new() }, tools: vec![InspectorTool { label: "策略审查".into(), progress: if plan_completed { 100 } else { 80 }, active: !plan_completed }, InspectorTool { label: "执行确认".into(), progress: if plan_completed { 100 } else { 30 }, active: false }] });
    }

    WorkflowPayload { selected_node_id, nodes, edges, inspectors }
}

pub fn build_wizard(prompt: &str, plan: &OperationPlan) -> WizardPayload {
    WizardPayload { prompt: prompt.into(), scenario: plan.scenario.clone(), breakdown: plan.workflow_stages.iter().take(3).map(|stage| stage.goal.clone()).collect(), team_agent_ids: plan.agent_assignments.iter().take(4).map(|assignment| normalize_agent_id(&assignment.agent_id)).collect(), team_objectives: plan.agent_assignments.iter().take(4).map(|assignment| WizardTeamObjective { agent_id: normalize_agent_id(&assignment.agent_id), agent_name: assignment.agent_name.clone(), objective: assignment.objective.clone() }).collect(), ready_summary: plan.summary.clone() }
}

pub fn is_plan_completed(plan: &OperationPlan) -> bool {
    !plan.workflow_stages.is_empty() && plan.workflow_stages.iter().all(|stage| stage.status == "done")
}

pub fn build_execution_daily_brief(plan: &OperationPlan) -> String {
    let completed_stage_count = plan.workflow_stages.iter().filter(|stage| stage.status == "done").count();
    let total_stage_count = plan.workflow_stages.len();
    let completed_agents = plan
        .agent_assignments
        .iter()
        .filter(|assignment| assignment.status == "done")
        .map(|assignment| assignment.agent_name.clone())
        .collect::<Vec<_>>();
    let active_agent = plan
        .agent_assignments
        .iter()
        .find(|assignment| assignment.status == "active")
        .map(|assignment| assignment.agent_name.clone());
    let completed_checklist = plan.execution_checklist.iter().filter(|item| item.done).count();
    let risk_summary = if plan.risks.is_empty() {
        "当前未识别出新增高风险项。".to_string()
    } else if is_plan_completed(plan) {
        format!("{} 项风险已完成复核，可继续结合售后与库存表现复盘。", plan.risks.len())
    } else {
        format!("仍有 {} 项风险需在后续阶段持续关注。", plan.risks.len())
    };

    if total_stage_count == 0 {
        return format!("当前流程尚未拆出可执行阶段。{}", risk_summary);
    }

    if is_plan_completed(plan) {
        let completed_agents_text = if completed_agents.is_empty() {
            "全部 Agent".to_string()
        } else {
            completed_agents.join("、")
        };

        return format!(
            "店长已完成本轮流程调度，{} 已全部交付；阶段进度 {}/{}，执行清单完成 {} 项。{}",
            completed_agents_text,
            completed_stage_count,
            total_stage_count,
            completed_checklist,
            risk_summary
        );
    }

    let active_agent_text = active_agent.unwrap_or_else(|| "店长".to_string());
    format!(
        "店长正在推进第 {}/{} 个阶段，当前由 {} 接手执行；已完成清单 {} 项。{}",
        completed_stage_count + 1,
        total_stage_count,
        active_agent_text,
        completed_checklist,
        risk_summary
    )
}

pub async fn execute_workspace_flow_record(app: &tauri::AppHandle, request_id: &str, target_task_id: Option<&str>) -> Result<WorkspaceView, ApiError> {
    let workspace = read_workspace_by_id(app, request_id)?;

    if is_plan_completed(&workspace.plan) && target_task_id.is_none() {
        save_workspace_view(app, &workspace)?;
        return Ok(workspace);
    }

    let mut plan = workspace.plan.clone();

    // 确定执行的目标索引
    let target_index = if let Some(tid) = target_task_id {
        // 前端传来的 tid 是 DashboardTask的ID，格式为 "{request_id}-{agent_id}-{index}"
        // 先解析出 agent_id。由于中间可能有破折号，我们可以利用 plan.agent_assignments 的下标，
        // 即提取最后一个部分作为 assignment index。
        if let Some(idx_str) = tid.rsplit('-').next() {
            if let Ok(assign_idx) = idx_str.parse::<usize>() {
                if let Some(assignment) = plan.agent_assignments.get(assign_idx) {
                    let target_owner = normalize_agent_id(&assignment.agent_id);
                    // 找到该 owner 下第一个未完成的 stage
                    plan.workflow_stages.iter().position(|stage| {
                        normalize_agent_id(&stage.owner) == target_owner && stage.status != "done"
                    })
                } else {
                    None
                }
            } else {
                None
            }
        } else {
            None
        }
    } else {
        let active_index = plan.workflow_stages.iter().position(|stage| stage.status == "active");
        active_index.or_else(|| {
            plan.workflow_stages
                .iter()
                .position(|stage| stage.status != "done")
        })
    };

    if let Some(index) = target_index {
        let completed_stage_name = plan.workflow_stages[index].name.clone();
        crate::emit_log(app, "info", &format!("开始执行目标阶段: {}", completed_stage_name));
        plan.workflow_stages[index].status = "done".into();
        
        let mut final_output = request_stage_execution(app, &plan.workflow_stages[index], &plan).await.unwrap_or_else(|e| format!("执行失败：{}", e));
        if final_output.trim().is_empty() {
            crate::emit_log(app, "warn", "该阶段没有返回任何文本输出，采用默认占位符。");
            final_output = build_stage_output(&plan.workflow_stages[index], &plan);
        }
        
        crate::emit_log(app, "success", &format!("阶段 {} 执行结束，正在更新状态面板...", completed_stage_name));
        plan.workflow_stages[index].output = Some(final_output);

        if let Some(next_index) = plan
            .workflow_stages
            .iter()
            .enumerate()
            .skip(index + 1)
            .find(|(_, stage)| stage.status != "done")
            .map(|(idx, _)| idx)
        {
            plan.workflow_stages[next_index].status = "active".into();
        }

        let plan_completed = is_plan_completed(&plan);

        for assignment in &mut plan.agent_assignments {
            let assignment_owner = normalize_agent_id(&assignment.agent_id);
            let owned_stages = plan
                .workflow_stages
                .iter()
                .filter(|stage| normalize_agent_id(&stage.owner) == assignment_owner)
                .collect::<Vec<_>>();

            assignment.status = if owned_stages.is_empty() {
                assignment.status.clone()
            } else if owned_stages.iter().all(|stage| stage.status == "done") {
                "done".into()
            } else if owned_stages.iter().any(|stage| stage.status == "active") {
                "active".into()
            } else if owned_stages.iter().any(|stage| stage.status == "done") {
                "active".into()
            } else {
                "pending".into()
            };
        }

        for item in &mut plan.execution_checklist {
            let item_owner = normalize_agent_id(&item.owner);
            let owned_stages = plan
                .workflow_stages
                .iter()
                .filter(|stage| normalize_agent_id(&stage.owner) == item_owner)
                .collect::<Vec<_>>();
            if !owned_stages.is_empty() {
                item.done = owned_stages.iter().all(|stage| stage.status == "done");
            }
        }

        if plan_completed {
            for assignment in &mut plan.agent_assignments {
                if assignment.status != "done" {
                    assignment.status = "done".into();
                }
            }
            for item in &mut plan.execution_checklist {
                item.done = true;
            }
            plan.manager_decision = format!(
                "{}
执行结果：店长已完成全部阶段调度，团队协作已全部落地。",
                plan.manager_decision.trim()
            );
        } else if let Some(next_stage) = plan.workflow_stages.iter().find(|stage| stage.status == "active") {
            plan.manager_decision = format!(
                "{}
最新进度：已完成“{}”，下一步由{}继续推进“{}”。",
                plan.manager_decision.trim(),
                completed_stage_name,
                agent_name(&normalize_agent_id(&next_stage.owner)),
                next_stage.name
            );
        }
    }

    plan.daily_brief = build_execution_daily_brief(&plan);

    let next_workspace = build_workspace_view(plan.merchant_intent.clone(), plan);
    save_workspace_view(app, &next_workspace)?;
    Ok(next_workspace)
}

pub fn build_workspace_view(prompt: String, plan: OperationPlan) -> WorkspaceView {
    WorkspaceView { plan: plan.clone(), tasks: build_tasks(&plan), workflow: build_workflow(&plan), wizard: build_wizard(&prompt, &plan) }
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

#[derive(Debug, serde::Deserialize)]
pub struct AnthropicResponse {
    pub content: Vec<AnthropicContent>,
}

#[derive(Debug, serde::Deserialize)]
pub struct AnthropicContent {
    #[serde(rename = "type")]
    pub kind: String,
    pub text: Option<String>,
}

pub fn extract_text(response: &AnthropicResponse) -> Option<String> {
    response.content.iter().filter(|item| item.kind == "text").filter_map(|item| item.text.clone()).reduce(|mut acc, text| {
        acc.push('\n');
        acc.push_str(&text);
        acc
    })
}
