use serde::Serialize;
use tauri::{Manager, Emitter};
use thiserror::Error;

pub mod commands;
pub mod llm_client;
pub mod models;
pub mod orchestrator;
pub mod store;
pub mod skills;

#[derive(Debug, Error)]
pub enum ApiError {
    #[error("Missing environment value: {0}")]
    MissingEnv(&'static str),
    #[error("AI request failed: {0}")]
    Request(#[from] reqwest::Error),
    #[error("AI returned an empty response")]
    EmptyResponse,
    #[error("AI payload did not match the expected schema: {0}")]
    InvalidPayload(String),
    #[error("Failed to persist data")]
    IoError(#[from] std::io::Error),
    #[error("Invalid JSON data")]
    JsonError(#[from] serde_json::Error),
    #[error("Application data directory is unavailable")]
    AppDirUnavailable,
    #[error("Record was not found")]
    NotFound,
    #[error("Workspace not found: {0}")]
    WorkspaceNotFound(String),
    #[error("Request failed: {0}")]
    RequestFailed(String),
    #[error("Failed to parse response")]
    ParseFailed,
}

impl Serialize for ApiError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("ShopGen Operations Center");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_agent_catalog,
            commands::get_runtime_status,
            commands::save_api_config,
            commands::generate_workspace_view,
            commands::load_workspace_history,
            commands::switch_workspace,
            commands::clear_workspace_view,
            commands::delete_workspace,
            commands::rename_workspace,
            commands::toggle_pin_workspace,
            commands::run_workspace_flow
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

pub fn emit_log(app: &tauri::AppHandle, level: &str, message: &str) {
    let payload = models::LogPayload {
        level: level.into(),
        message: message.into(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    };
    println!("[{}] {}: {}", payload.timestamp, level.to_uppercase(), message);
    app.emit("backend-log", payload).ok();
}
