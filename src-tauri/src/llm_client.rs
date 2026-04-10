use regex::Regex;
use reqwest::Client;
use serde_json::{json, Value};

use crate::commands::get_runtime_status_internal;
use crate::models::{OperationPlan, WorkflowStage};
use crate::orchestrator::{agent_name, normalize_agent_id};
use crate::ApiError;

pub async fn request_openrouter_image(app: &tauri::AppHandle, prompt: &str) -> Result<String, ApiError> {
    let status = get_runtime_status_internal(app);
    let api_key = status
        .openrouter_key
        .filter(|key| !key.trim().is_empty())
        .ok_or(ApiError::MissingEnv("OPENROUTER_API_KEY"))?;

    let body = json!({
        "model": "sourceful/riverflow-v2-pro",
        "messages": [{
            "role": "user",
            "content": [{ "type": "text", "text": prompt }]
        }],
        "modalities": ["image"]
    });

    let response = Client::new()
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| ApiError::RequestFailed(format!("OpenRouter request failed: {e}")))?;

    if !response.status().is_success() {
        let err_text = response.text().await.unwrap_or_default();
        return Err(ApiError::RequestFailed(format!("OpenRouter error: {err_text}")));
    }

    let payload: serde_json::Value = response.json().await.map_err(|_| ApiError::ParseFailed)?;

    payload["choices"][0]["message"]["images"]
        .as_array()
        .and_then(|images| images.first())
        .and_then(|image| image["image_url"]["url"].as_str())
        .map(str::to_owned)
        .or_else(|| {
            // 回退方案：如果以文本/Base64形式直接返回在了 content 里
            payload["choices"][0]["message"]["content"]
                .as_str()
                .map(str::to_owned)
        })
        .ok_or_else(|| ApiError::RequestFailed("OpenRouter did not return an image URL".into()))
}

pub async fn request_stage_execution(
    app: &tauri::AppHandle,
    stage: &WorkflowStage,
    plan: &OperationPlan,
) -> Result<String, ApiError> {
    let status = get_runtime_status_internal(app);
    let api_key = status.api_key.ok_or(ApiError::MissingEnv("ANTHROPIC_API_KEY"))?;
    let endpoint = format!("{}/v1/messages", status.base_url.trim_end_matches('/'));
    let model = status.model;
    let agent_id = normalize_agent_id(&stage.owner);
    let agent_title = agent_name(&agent_id);
    let skills = crate::skills::get_skills_for_agent(&agent_id);
    let mut skill_instructions = String::new();
    
    if !skills.is_empty() {
        skill_instructions.push_str("\n\n## Available Skills & SOPs:\n");
        for skill in &skills {
            skill_instructions.push_str(&format!("### {}\n{}\n\n", skill.name, skill.content));
        }
    }
    println!(">>> [{}] 正在组装 Prompt，已加载 {} 个技能 SOP...", agent_title, skills.len());

    let system_prompt = format!(
        "You are the {agent_title} agent in ShopGen. Execute the assigned workflow stage based on the merchant intent and following the SOPs provided in your skills. Return only the final deliverable in Markdown. If a visual asset is needed, insert [IMAGE_PROMPT: detailed English image prompt].{skill_instructions}"
    );

    crate::emit_log(app, "info", &format!("[{}] 开始思考任务「{}」...", agent_title, stage.name));

    let mut context_history = String::new();
    let completed_stages: Vec<_> = plan.workflow_stages.iter().filter(|s| s.status == "done").collect();
    if !completed_stages.is_empty() {
        context_history.push_str("\n\n## 上游环节已产出的背景信息 (Context History):\n");
        for prev in completed_stages {
            context_history.push_str(&format!("### 阶段: {}\n负责人: {}\n产出产物:\n{}\n---\n", prev.name, prev.owner, prev.output.as_deref().unwrap_or("无内容")));
        }
    }

    let user_prompt = format!(
        "Scenario: {}\nMerchant request: {}\n{}\n\nStage name: {}\nStage goal: {}\nStage action: {}\n\nReturn the concrete deliverable only.",
        plan.scenario,
        plan.merchant_intent,
        context_history,
        stage.name,
        stage.goal,
        stage.action,
    );

    let body = json!({
        "model": model,
        "max_tokens": 2000,
        "stream": true,
        "system": system_prompt,
        "messages": [{
            "role": "user",
            "content": [{ "type": "text", "text": user_prompt }]
        }]
    });

    let response = Client::new()
        .post(endpoint)
        .header("x-api-key", api_key)
        .header("content-type", "application/json")
        .header("anthropic-version", "2023-06-01")
        .json(&body)
        .send()
        .await
        .map_err(|e| ApiError::RequestFailed(e.to_string()))?;

    if !response.status().is_success() {
        let err_msg = response.text().await.unwrap_or_default();
        eprintln!("!!! [{}] API 请求失败: {}", agent_title, err_msg);
        crate::emit_log(app, "error", &format!("[{}] 思考失败: {}", agent_title, err_msg));
        return Err(ApiError::RequestFailed(err_msg));
    }
    println!("<<< [{}] 收到流式响应，正在逐块解析...", agent_title);

    use futures::StreamExt;

    let mut stream = response.bytes_stream();
    let mut text = String::new();
    let mut line_buffer = String::new();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e: reqwest::Error| ApiError::RequestFailed(e.to_string()))?;
        let raw = String::from_utf8_lossy(&chunk);
        line_buffer.push_str(&raw);

        while let Some(pos) = line_buffer.find('\n') {
            let line = line_buffer[..pos].trim().to_string();
            line_buffer.drain(..pos + 1);

            if line.starts_with("data: ") {
                let data = line.trim_start_matches("data: ");
                if data == "[DONE]" || data.is_empty() { continue; }

                if let Ok(json) = serde_json::from_str::<Value>(data) {
                    if let Some(delta) = json.get("delta") {
                        if let Some(txt) = delta.get("text").and_then(Value::as_str) {
                            text.push_str(txt);
                        }
                    } else if let Some(choices) = json.get("choices").and_then(|c| c.as_array()) {
                        if !choices.is_empty() {
                            if let Some(txt) = choices[0]["delta"].get("content").and_then(Value::as_str) {
                                text.push_str(txt);
                            }
                        }
                    }
                }
            }
        }
    }

    if text.is_empty() {
        eprintln!("!!! [{}] 流式接收完成但内容为空", agent_title);
        return Err(ApiError::EmptyResponse);
    }

    crate::emit_log(app, "success", &format!("[{}] 思考完成，正在解析产物...", agent_title));

    let image_tag_re = Regex::new(r"\[(?:IMAGE_PROMPT|GEN_IMAGE):\s*([^\]]+)\]").map_err(|e| ApiError::RequestFailed(e.to_string()))?;
    let replacements = image_tag_re
        .captures_iter(&text)
        .filter_map(|cap| {
            let tag = cap.get(0)?.as_str().to_string();
            let prompt = cap.get(1)?.as_str().trim().to_string();
            Some((tag, prompt))
        })
        .collect::<Vec<_>>();

    for (tag, prompt) in &replacements {
        crate::emit_log(app, "info", &format!("[{}] 请求生成插图: {}", agent_title, prompt));
        match request_openrouter_image(app, prompt).await {
            Ok(image_url) => {
                crate::emit_log(app, "success", &format!("[{}] 插图生成成功", agent_title));
                let replacement = if image_url.contains("![") {
                    image_url.clone() // 如果模型已经自己包了 Markdown
                } else {
                    format!("![{}]({})", prompt, image_url)
                };
                text = text.replace(tag, &replacement);
            }
            Err(err) => {
                crate::emit_log(app, "error", &format!("[{}] 插图生成失败: {}", agent_title, err));
                let replacement = format!("> Image generation failed: {err}");
                text = text.replace(tag, &replacement);
            }
        }
    }

    Ok(text)
}
