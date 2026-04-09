use std::{fs, path::PathBuf};
use serde::{Deserialize, Serialize};
use tauri::path::BaseDirectory;
use tauri::Manager;
use crate::models::*;
use crate::ApiError;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceStore {
    pub current_request_id: Option<String>,
    pub history: Vec<WorkspaceHistoryItem>,
}

pub fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, ApiError> {
    let app_dir = app.path().resolve("shopgen", BaseDirectory::AppData).map_err(|_| ApiError::AppDirUnavailable)?;
    fs::create_dir_all(&app_dir)?;
    Ok(app_dir)
}

pub fn api_config_path(app: &tauri::AppHandle) -> Result<PathBuf, ApiError> {
    Ok(app_data_dir(app)?.join("api-config.json"))
}

pub fn read_api_config(app: &tauri::AppHandle) -> ApiConfig {
    if let Ok(path) = api_config_path(app) {
        if let Ok(content) = fs::read_to_string(path) {
            if let Ok(config) = serde_json::from_str(&content) {
                return config;
            }
        }
    }
    ApiConfig::default()
}

pub fn workspace_store_path(app: &tauri::AppHandle) -> Result<PathBuf, ApiError> {
    Ok(app_data_dir(app)?.join("workspace-store.json"))
}

pub fn workspace_view_path(app: &tauri::AppHandle, request_id: &str) -> Result<PathBuf, ApiError> {
    Ok(app_data_dir(app)?.join(format!("workspace-{}.json", request_id)))
}

pub fn read_store(app: &tauri::AppHandle) -> Result<WorkspaceStore, ApiError> {
    let path = workspace_store_path(app)?;
    if !path.exists() {
        return Ok(WorkspaceStore::default());
    }
    let content = fs::read_to_string(path)?;
    Ok(serde_json::from_str(&content).unwrap_or_else(|e| {
        eprintln!("[ShopGen] read_store parse error: {}. Resetting to empty store.", e);
        WorkspaceStore::default()
    }))
}

pub fn write_store(app: &tauri::AppHandle, store: &WorkspaceStore) -> Result<(), ApiError> {
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

pub fn sort_history(history: &mut [WorkspaceHistoryItem]) {
    history.sort_by(|left, right| right.pinned.cmp(&left.pinned).then_with(|| right.generated_at.cmp(&left.generated_at)));
}

pub fn save_workspace_view(app: &tauri::AppHandle, view: &WorkspaceView) -> Result<(), ApiError> {
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

pub fn read_workspace_by_id(app: &tauri::AppHandle, request_id: &str) -> Result<WorkspaceView, ApiError> {
    let path = workspace_view_path(app, request_id)?;
    if !path.exists() {
        return Err(ApiError::WorkspaceNotFound(request_id.into()));
    }
    Ok(serde_json::from_str::<WorkspaceView>(&fs::read_to_string(path)?)?)
}

pub fn load_workspace_history_bundle(app: &tauri::AppHandle) -> Result<WorkspaceHistoryBundle, ApiError> {
    let mut store = read_store(app)?;
    sort_history(&mut store.history);
    let current_workspace = match store.current_request_id {
        Some(ref request_id) => Some(read_workspace_by_id(app, request_id)?),
        None => None,
    };
    Ok(WorkspaceHistoryBundle { current_workspace, history: store.history })
}

pub fn switch_workspace_record(app: &tauri::AppHandle, request_id: &str) -> Result<WorkspaceView, ApiError> {
    let workspace = read_workspace_by_id(app, request_id)?;
    let mut store = read_store(app)?;
    store.current_request_id = Some(request_id.into());
    write_store(app, &store)?;
    Ok(workspace)
}

pub fn delete_workspace_record(app: &tauri::AppHandle, request_id: &str) -> Result<(), ApiError> {
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

pub fn clear_workspace_records(app: &tauri::AppHandle) -> Result<(), ApiError> {
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

pub fn rename_workspace_record(app: &tauri::AppHandle, request_id: &str, title: &str) -> Result<WorkspaceHistoryBundle, ApiError> {
    let mut store = read_store(app)?;
    let item = store.history.iter_mut().find(|item| item.request_id == request_id).ok_or_else(|| ApiError::WorkspaceNotFound(request_id.into()))?;
    let trimmed = title.trim();
    item.title = if trimmed.is_empty() { None } else { Some(trimmed.to_string()) };
    sort_history(&mut store.history);
    write_store(app, &store)?;
    load_workspace_history_bundle(app)
}

pub fn toggle_pin_workspace_record(app: &tauri::AppHandle, request_id: &str) -> Result<WorkspaceHistoryBundle, ApiError> {
    let mut store = read_store(app)?;
    let item = store.history.iter_mut().find(|item| item.request_id == request_id).ok_or_else(|| ApiError::WorkspaceNotFound(request_id.into()))?;
    item.pinned = !item.pinned;
    sort_history(&mut store.history);
    write_store(app, &store)?;
    load_workspace_history_bundle(app)
}
