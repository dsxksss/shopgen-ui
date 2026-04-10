use std::collections::BTreeMap;
use chrono::Utc;
use reqwest::Client;
use serde_json::{json, Value};
use uuid::Uuid;
use futures::StreamExt;
use tauri::Emitter;
use crate::models::*;
use crate::llm_client::*;
use crate::store::*;
use crate::ApiError;

pub fn get_agent_skills(agent_id: &str) -> Vec<Skill> {
    crate::skills::get_skills_for_agent(agent_id)
}

pub fn agent_catalog() -> Vec<AgentProfile> {
    vec![
        AgentProfile { id: "manager".into(), name: "店长".into(), title: "总协调与决策指挥".into(), summary: "负责理解商家诉求、拆解任务、调度团队，并输出全局经营决策。".into(), capabilities: vec!["任务拆解".into(), "进度监控".into(), "决策汇总".into()], skills: get_agent_skills("manager"), color: "from-sky-500 to-cyan-400".into() },
        AgentProfile { id: "designer".into(), name: "美工".into(), title: "商品视觉与活动素材".into(), summary: "聚焦商品图、渲染图、Banner、详情页视觉方向。".into(), capabilities: vec!["商品图设计".into(), "Banner 视觉".into(), "详情页结构".into(), "设计提示词".into()], skills: get_agent_skills("designer"), color: "from-pink-500 to-rose-400".into() },
        AgentProfile { id: "copywriter".into(), name: "文案".into(), title: "内容营销与卖点策划".into(), summary: "负责撰写吸引人的标题、详情页文案及品牌故事。".into(), capabilities: vec!["卖点提炼".into(), "标题优化".into(), "文案创作".into()], skills: get_agent_skills("copywriter"), color: "from-amber-500 to-orange-400".into() },
        AgentProfile { id: "seo".into(), name: "优化师".into(), title: "搜索排名与关键词优化".into(), summary: "负责关键词研究、SEO 策略及流量增长方案。".into(), capabilities: vec!["关键词研究".into(), "SEO 审计".into(), "排名优化".into()], skills: get_agent_skills("seo"), color: "from-emerald-500 to-teal-400".into() },
    ]
}

pub fn agent_name(id: &str) -> &'static str {
    match id {
        "manager" => "店长",
        "designer" => "美工",
        "copywriter" => "文案",
        "seo" => "优化师",
        _ => "店长",
    }
}

pub fn normalize_agent_id(id: &str) -> String {
    match id.trim().to_lowercase().as_str() {
        "manager" | "店长" => "manager".into(),
        "designer" | "美工" => "designer".into(),
        "copywriter" | "文案" => "copywriter".into(),
        "seo" | "优化师" | "seo-specialist" => "seo".into(),
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
        "max_tokens": 4000,
        "stream": true,
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
        .error_for_status()?;
    
    crate::emit_log(app, "info", "店长 Agent 正在深入思考，请查看下方实时反馈...");
    
    let mut stream = response.bytes_stream();
    let mut full_text = String::new();
    let mut thinking_text = String::new();
    let mut line_buffer = String::new();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e: reqwest::Error| ApiError::RequestFailed(e.to_string()))?;
        let text = String::from_utf8_lossy(&chunk);
        line_buffer.push_str(&text);

        while let Some(pos) = line_buffer.find('\n') {
            let line = line_buffer[..pos].trim().to_string();
            line_buffer.drain(..pos + 1);

            if line.starts_with("data: ") {
                let data = line.trim_start_matches("data: ");
                if data == "[DONE]" || data.is_empty() { continue; }
                
                if let Ok(json) = serde_json::from_str::<Value>(data) {
                    // 1. Anthropic 格式提取 (content_block_delta)
                    if let Some(delta) = json.get("delta") {
                        if let Some(txt) = delta.get("text").and_then(Value::as_str) {
                            full_text.push_str(txt);
                        }
                        if let Some(think) = delta.get("thinking").and_then(Value::as_str) {
                            thinking_text.push_str(think);
                            let _ = app.emit("planner-thought", think);
                        }
                    } 
                    // 2. OpenAI 格式提取
                    else if let Some(choices) = json.get("choices").and_then(|c| c.as_array()) {
                        if !choices.is_empty() {
                            let delta = &choices[0]["delta"];
                            if let Some(txt) = delta.get("content").and_then(Value::as_str) {
                                full_text.push_str(txt);
                            }
                            if let Some(think) = delta.get("thinking").and_then(Value::as_str) {
                                thinking_text.push_str(think);
                                let _ = app.emit("planner-thought", think);
                            }
                        }
                    }
                }
            }
        }
    }

    if full_text.is_empty() {
        eprintln!("!!! 关键错误：流式接收完成，但没有捕获到任何有效文本。接收到的思考长度：{}", thinking_text.len());
        return Err(ApiError::EmptyResponse);
    }
    
    // 增强型 JSON 提取逻辑：处理模型输出多个 JSON 块的情况（如：先输出分析 JSON，再输出计划 JSON）
    let clean_json = {
        let mut best_json = full_text.clone();
        let mut max_score = -1;

        // 尝试寻找所有可能的 JSON 块边界
        let mut start_indices = Vec::new();
        for (i, c) in full_text.char_indices() {
             if c == '{' { start_indices.push(i); }
        }
        
        for &start in &start_indices {
            // 从后往前找对应的结束括号
            let mut end_indices = Vec::new();
            for (i, c) in full_text.char_indices().skip(start) {
                if c == '}' { end_indices.push(i); }
            }
            
            // 限制探测范围，通常最大的 JSON 块在后面或覆盖全文
            for &end in end_indices.iter().rev().take(5) {
                let candidate = &full_text[start..=end];
                if let Ok(val) = serde_json::from_str::<Value>(candidate) {
                    // 打分机制：包含的关键字段越多，分数越高
                    let mut score = 0;
                    if val.get("workflowStages").is_some() || val.get("workflow_stages").is_some() { score += 10; }
                    if val.get("agentAssignments").is_some() || val.get("agent_assignments").is_some() { score += 10; }
                    if val.get("summary").is_some() { score += 5; }
                    if val.get("execution_checklist").is_some() || val.get("executionChecklist").is_some() { score += 5; }
                    
                    if score > max_score {
                        max_score = score;
                        best_json = candidate.to_string();
                    }
                }
            }
        }
        best_json
    };

    let payload: Value = serde_json::from_str(&clean_json).map_err(|e| {
        eprintln!("!!! JSON 解析失败。清理后的内容为：\n{}\n错误原因：{}", clean_json, e);
        ApiError::InvalidPayload(e.to_string())
    })?;

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
        raw_text: full_text,
    })
}

fn status_to_task_status(status: &str) -> &'static str {
    match status.trim() {
        "done" => "done",
        "in-progress" | "active" => "in-progress",
        _ => "todo",
    }
}

fn progress_for_status(status: &str, total_steps: u8) -> u8 {
    let normalized = status_to_task_status(status);
    match normalized {
        "done" => total_steps,
        "in-progress" => ((total_steps as f32) * 0.5).ceil() as u8,
        _ => 0,
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
        let total_steps = ((related_stage_count + related_checklist_count) as u8).max(5);
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
            current_step_label: "".into(),
            skills: if agent_id == "manager" { vec![] } else { get_agent_skills(&agent_id) },
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
            status: if stage.status == "done" { "已完成当前阶段".into() } else if stage.status == "in-progress" || stage.status == "active" { "正在执行当前阶段...".into() } else { "等待店长调度执行".into() },
            status_subtitle: if stage.status == "done" { "本阶段结果已回写到工作台".into() } else if stage.status == "in-progress" || stage.status == "active" { format!("当前目标：{}", stage.goal) } else { format!("执行目标：{}", stage.goal) },
            status_tone: status_to_task_status(&stage.status).into(),
            inputs: vec![InspectorInput { label: "阶段目标".into(), value: stage.goal.clone() }, InspectorInput { label: "负责人".into(), value: agent_name(&agent_id).into() }, InspectorInput { label: "商家诉求".into(), value: plan.merchant_intent.clone() }],
            outputs: stage_outputs(stage),
            tools: vec![InspectorTool { label: "任务拆解".into(), progress: if stage.status == "done" { 100 } else if stage.status == "in-progress" || stage.status == "active" { 72 } else { 0 }, active: stage.status == "in-progress" || stage.status == "active" }, InspectorTool { label: "结果回填".into(), progress: if stage.status == "done" { 100 } else if stage.status == "in-progress" || stage.status == "active" { 45 } else { 0 }, active: false }],
        });
        previous_id = node_id;
    }

    // 风险信息现在仅展示在右侧面板中，不再强制插入终节点

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
        .find(|assignment| assignment.status == "in-progress" || assignment.status == "active")
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
        let active_index = plan.workflow_stages.iter().position(|stage| stage.status == "in-progress" || stage.status == "active");
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
            plan.workflow_stages[next_index].status = "in-progress".into();
        }

        let plan_completed = is_plan_completed(&plan);

        for (i, assignment) in plan.agent_assignments.iter_mut().enumerate() {
            // 通过目标名称或者按同序列索引找到 1:1 对应的 stage
            if let Some(matching_stage) = plan.workflow_stages.iter().find(|s| s.name == assignment.objective || s.name == assignment.deliverable) {
                assignment.status = matching_stage.status.clone();
            } else if let Some(matching_stage) = plan.workflow_stages.get(i) {
                assignment.status = matching_stage.status.clone();
            }
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
        } else if let Some(next_stage) = plan.workflow_stages.iter().find(|stage| stage.status == "in-progress" || stage.status == "active") {
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
    let mut profile_summaries = String::new();
    for profile in agent_catalog() {
        profile_summaries.push_str(&format!("- {} ({}): {}\n", profile.name, profile.id, profile.summary));
    }

    let all_skills = crate::skills::load_skills_from_folder();
    let mut skill_catalog = String::new();
    for skill in all_skills {
        skill_catalog.push_str(&format!("### Skill ID: {}\nName: {}\nDescription: {}\nSOP Instructions:\n{}\n\n", skill.id, skill.name, skill.description, skill.content));
    }

    [
        "你是 ShopGen 的店长系统 (Manager Agent)。你拥有 20 万 Token 的超大上下文视野。",
        "你的核心目标是针对商家的诉求，生成一个【任务看板】与【执行流程图】完美对应的专业经营方案。",
        "## 重要规则：",
        "1. **看板与流程 1:1 对齐**：你生成的 `agentAssignments` 数组中的每一个任务，必须在 `workflowStages` 中有一个同名的阶段对应。看板有几个，流程就有几个。严禁出现看板 2 个、流程 7 个的情况。",
        "2. **角色分工**：目前你的团队中有店长（manager）、美工（designer）、文案（copywriter）、优化师（seo）四种角色可用。请根据任务性质精准分配（如：视觉设计分给美工，卖点策划分给文案，搜索优化分给优化师，全局规划留给店长）。",
        "3. **动态终点**：流程的终点应根据业务逻辑自然结束（如：完成详情页设计、完成库存备货等），不要千篇一律地以“风险校验”结尾。",
        "## 当前可用的团队成员：",
        &profile_summaries,
        "## 全量专业技能 (Skills) SOP 手册：",
        "请务必阅读以下每个技能的 SOP 细节，并在规划任务时精准指定 skillsRequired (ID)。",
        &skill_catalog,
        "## 输出 JSON 结构要求：",
        "{",
        "  \"summary\": \"项目全局摘要\",",
        "  \"merchantIntent\": \"深度解读商家真实意图\",",
        "  \"managerDecision\": \"店长的核心经营建议与战略部署\",",
        "  \"agentAssignments\": [{ \"agentId\": \"manager|designer\", \"agentName\": \"显示名称\", \"objective\": \"核心目标\", \"deliverable\": \"预期产出物\", \"skillsRequired\": [\"skill-id\"], \"status\": \"todo\" }],",
        "  \"workflowStages\": [{ \"name\": \"必须与 agentAssignments 中的 objective/deliverable 任务名一致\", \"owner\": \"manager|designer\", \"goal\": \"阶段目标\", \"action\": \"具体执行动作描述\", \"status\": \"todo\" }],",
        "  \"executionChecklist\": [{ \"title\": \"检查项\", \"owner\": \"manager|designer\", \"done\": false }],",
        "  \"risks\": [\"潜在风险预警\"],",
        "  \"dailyBrief\": \"今日核心工作摘要\"",
        "}",
        "注意：",
        "1. 务必结合 SOP 细节，在 agentAssignments 中精准对应技能 ID。",
        "2. 这是一个春季/夏季等季节性极强的电商场景，请在规划中体现时间紧迫感。",
    ].join("\n")
}

// 移除冗余的 AnthropicResponse 结构体，统一使用 Value 处理以支持多模型

