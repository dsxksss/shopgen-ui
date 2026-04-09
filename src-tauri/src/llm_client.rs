use regex::Regex;
use reqwest::Client;
use serde_json::json;

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
        "model": "google/gemini-2.5-flash-image-preview",
        "messages": [{
            "role": "user",
            "content": [{ "type": "text", "text": prompt }]
        }],
        "modalities": ["image", "text"]
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
    let agent_title = agent_name(&normalize_agent_id(&stage.owner));

    let system_prompt = format!(
        "You are the {agent_title} agent in ShopGen. Execute the assigned workflow stage and return only the final deliverable in Markdown. If a visual asset is needed, insert [GEN_IMAGE: detailed English image prompt]."
    );

    crate::emit_log(app, "info", &format!("[{}] 开始思考任务「{}」...", agent_title, stage.name));

    let user_prompt = format!(
        "Scenario: {}\nMerchant request: {}\n\nStage name: {}\nStage goal: {}\nStage action: {}\n\nReturn the concrete deliverable only.",
        plan.scenario,
        plan.merchant_intent,
        stage.name,
        stage.goal,
        stage.action,
    );

    let body = json!({
        "model": model,
        "max_tokens": 2000,
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
        crate::emit_log(app, "error", &format!("[{}] 思考失败: {}", agent_title, err_msg));
        return Err(ApiError::RequestFailed(err_msg));
    }

    let response_body: serde_json::Value = response.json().await.map_err(|_| ApiError::ParseFailed)?;
    let mut text = response_body["content"][0]["text"]
        .as_str()
        .ok_or(ApiError::ParseFailed)?
        .to_string();

    crate::emit_log(app, "success", &format!("[{}] 思考完成，正在解析产物...", agent_title));

    let image_tag_re = Regex::new(r"\[GEN_IMAGE:\s*([^\]]+)\]").map_err(|e| ApiError::RequestFailed(e.to_string()))?;
    let replacements = image_tag_re
        .captures_iter(&text)
        .filter_map(|cap| {
            let tag = cap.get(0)?.as_str().to_string();
            let prompt = cap.get(1)?.as_str().trim().to_string();
            Some((tag, prompt))
        })
        .collect::<Vec<_>>();

    for (tag, prompt) in replacements {
        crate::emit_log(app, "info", &format!("[{}] 请求生成插图: {}", agent_title, prompt));
        match request_openrouter_image(app, &prompt).await {
            Ok(image_url) => {
                crate::emit_log(app, "success", &format!("[{}] 插图生成成功", agent_title));
                text = text.replace(&tag, &format!("![{}]({})", prompt, image_url));
            }
            Err(err) => {
                crate::emit_log(app, "error", &format!("[{}] 插图生成失败: {}", agent_title, err));
                text = text.replace(&tag, &format!("> Image generation failed: {err}"));
            }
        }
    }

    Ok(text)
}
