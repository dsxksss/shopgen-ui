use dotenvy::dotenv;
use std::env;
use std::fs;

use crate::models::*;
use crate::orchestrator::{
    agent_catalog,
    build_workspace_view,
    execute_workspace_flow_record,
    request_plan,
};
use crate::store::*;
use crate::ApiError;

#[tauri::command]
pub fn get_agent_catalog() -> Vec<AgentProfile> {
    agent_catalog()
}

#[tauri::command]
pub fn get_runtime_status(app: tauri::AppHandle) -> RuntimeStatus {
    get_runtime_status_internal(&app)
}

pub fn get_runtime_status_internal(app: &tauri::AppHandle) -> RuntimeStatus {
    dotenv().ok();
    let config = read_api_config(app);
    let base_url = config
        .base_url
        .filter(|v| !v.trim().is_empty())
        .unwrap_or_else(|| env::var("ANTHROPIC_BASE_URL").unwrap_or_else(|_| "https://api.minimaxi.com/anthropic".into()));
    let model = config
        .model
        .filter(|v| !v.trim().is_empty())
        .unwrap_or_else(|| env::var("MINIMAX_MODEL").unwrap_or_else(|_| "MiniMax-M2.7".into()));
    let api_key = config
        .api_key
        .filter(|v| !v.trim().is_empty())
        .or_else(|| env::var("ANTHROPIC_API_KEY").ok());
    let openrouter_key = config
        .openrouter_key
        .filter(|v| !v.trim().is_empty())
        .or_else(|| env::var("OPENROUTER_API_KEY").ok());

    let configured = api_key
        .as_ref()
        .map(|v| !v.trim().is_empty())
        .unwrap_or(false);

    RuntimeStatus {
        configured,
        provider: "MiniMax Anthropic Compatible API".into(),
        base_url,
        model,
        api_key: api_key.clone(),
        openrouter_key: openrouter_key.clone(),
        ready_message: if configured {
            "Rust backend is connected to a real AI service and ready to generate plans.".into()
        } else {
            "No real API key is configured yet. Add one in settings or provide it through environment variables.".into()
        },
    }
}

#[tauri::command]
pub fn save_api_config(
    app: tauri::AppHandle,
    base_url: String,
    api_key: String,
    model: String,
    openrouter_key: String,
) -> Result<RuntimeStatus, ApiError> {
    let config = ApiConfig {
        base_url: Some(base_url),
        api_key: Some(api_key),
        model: Some(model),
        openrouter_key: Some(openrouter_key),
    };
    let path = api_config_path(&app)?;
    fs::write(path, serde_json::to_string_pretty(&config)?)?;
    Ok(get_runtime_status_internal(&app))
}

#[tauri::command]
pub async fn generate_workspace_view(
    app: tauri::AppHandle,
    prompt: String,
    scenario: String,
) -> Result<WorkspaceView, ApiError> {
    let plan = request_plan(&app, prompt.clone(), scenario).await?;
    let workspace = build_workspace_view(prompt, plan);
    save_workspace_view(&app, &workspace)?;
    Ok(workspace)
}

#[tauri::command]
pub fn load_workspace_history(app: tauri::AppHandle) -> Result<WorkspaceHistoryBundle, ApiError> {
    load_workspace_history_bundle(&app)
}

#[tauri::command]
pub fn switch_workspace(app: tauri::AppHandle, request_id: String) -> Result<WorkspaceView, ApiError> {
    crate::emit_log(&app, "info", &format!("正在切换至工作区: {}", request_id));
    let result = switch_workspace_record(&app, &request_id);
    if result.is_ok() {
        crate::emit_log(&app, "success", "工作区切换成功");
    }
    result
}

#[tauri::command]
pub fn clear_workspace_view(app: tauri::AppHandle) -> Result<(), ApiError> {
    clear_workspace_records(&app)
}

#[tauri::command]
pub fn delete_workspace(app: tauri::AppHandle, request_id: String) -> Result<(), ApiError> {
    crate::emit_log(&app, "warn", &format!("正在删除工作区记录: {}", request_id));
    delete_workspace_record(&app, &request_id)
}

#[tauri::command]
pub fn rename_workspace(
    app: tauri::AppHandle,
    request_id: String,
    title: String,
) -> Result<WorkspaceHistoryBundle, ApiError> {
    crate::emit_log(&app, "info", &format!("重命名工作区 {} 为: {}", request_id, title));
    rename_workspace_record(&app, &request_id, &title)
}

#[tauri::command]
pub fn toggle_pin_workspace(
    app: tauri::AppHandle,
    request_id: String,
) -> Result<WorkspaceHistoryBundle, ApiError> {
    toggle_pin_workspace_record(&app, &request_id)
}

#[tauri::command]
pub async fn run_workspace_flow(
    app: tauri::AppHandle,
    request_id: String,
    target_task_id: Option<String>,
) -> Result<WorkspaceView, ApiError> {
    execute_workspace_flow_record(&app, &request_id, target_task_id.as_deref()).await
}
#[tauri::command]
pub async fn load_image_asset(app: tauri::AppHandle, id: String) -> Result<Vec<u8>, String> {
    use tauri::Manager;
    let path = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("images")
        .join(format!("{}.png", id));
        
    std::fs::read(path).map_err(|e| e.to_string())
}
