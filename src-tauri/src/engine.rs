use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

// Engine process handle stored in app state
pub struct EngineState {
    pub processes: Mutex<HashMap<String, tauri_plugin_shell::process::CommandChild>>,
}

impl Default for EngineState {
    fn default() -> Self {
        Self {
            processes: Mutex::new(HashMap::new()),
        }
    }
}

#[tauri::command]
pub async fn spawn_engine(
    app: AppHandle,
    state: State<'_, EngineState>,
    engine_id: String,
    path: String,
) -> Result<(), String> {
    let shell = app.shell();
    let command = shell.command(path);
    let (mut rx, child) = command
        .spawn()
        .map_err(|e| format!("Failed to spawn engine: {}", e))?;

    {
        let mut processes = state.processes.lock().unwrap();
        // Kill existing engine with same id if any
        if let Some(old) = processes.remove(&engine_id) {
            let _ = old.kill();
        }
        processes.insert(engine_id.clone(), child);
    }

    let app_clone = app.clone();
    let engine_id_clone = engine_id.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let line = String::from_utf8_lossy(&line);
                    let _ = app_clone.emit(
                        &format!("engine:{}/stdout", engine_id_clone),
                        line.to_string(),
                    );
                }
                CommandEvent::Stderr(line) => {
                    let line = String::from_utf8_lossy(&line);
                    let _ = app_clone.emit(
                        &format!("engine:{}/stderr", engine_id_clone),
                        line.to_string(),
                    );
                }
                CommandEvent::Error(e) => {
                    let _ = app_clone.emit(
                        &format!("engine:{}/error", engine_id_clone),
                        e,
                    );
                }
                CommandEvent::Terminated(payload) => {
                    let _ = app_clone.emit(
                        &format!("engine:{}/terminated", engine_id_clone),
                        payload.code.unwrap_or(-1),
                    );
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn send_command(
    state: State<'_, EngineState>,
    engine_id: String,
    command: String,
) -> Result<(), String> {
    let mut processes = state.processes.lock().unwrap();
    let child = processes
        .get_mut(&engine_id)
        .ok_or("Engine not found")?;

    child
        .write(command.as_bytes())
        .map_err(|e| format!("Failed to write to engine: {}", e))?;
    child
        .write(b"\n")
        .map_err(|e| format!("Failed to write newline: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn kill_engine(
    state: State<'_, EngineState>,
    engine_id: String,
) -> Result<(), String> {
    let mut processes = state.processes.lock().unwrap();
    if let Some(child) = processes.remove(&engine_id) {
        child
            .kill()
            .map_err(|e| format!("Failed to kill engine: {}", e))?;
    }
    Ok(())
}
