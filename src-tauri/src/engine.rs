use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

#[derive(serde::Serialize)]
pub struct EngineOptionConfig {
    pub name: String,
    pub kind: String,
    pub default: Option<serde_json::Value>,
    pub min: Option<f64>,
    pub max: Option<f64>,
    pub vars: Vec<String>,
}

#[derive(serde::Serialize)]
pub struct EngineHandshake {
    pub name: String,
    pub author: Option<String>,
    pub protocol: String,
    pub options: Vec<EngineOptionConfig>,
    pub raw: String,
}

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
pub async fn get_engine_config(path: String) -> Result<EngineHandshake, String> {
    let mut child = Command::new(&path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn engine: {}", e))?;

    if let Some(stdin) = child.stdin.as_mut() {
        stdin
            .write_all(b"uci\n")
            .map_err(|e| format!("Failed to write uci command: {}", e))?;
        stdin
            .flush()
            .map_err(|e| format!("Failed to flush uci command: {}", e))?;
    }

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to read engine stdout".to_string())?;
    let (tx, rx) = mpsc::channel::<String>();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            if tx.send(line).is_err() {
                break;
            }
        }
    });

    let deadline = Instant::now() + Duration::from_secs(5);
    let mut lines = Vec::new();
    while Instant::now() < deadline {
        match rx.recv_timeout(Duration::from_millis(100)) {
            Ok(line) => {
                let done = line.trim() == "uciok";
                lines.push(line);
                if done {
                    break;
                }
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {}
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        }
    }

    let _ = child.kill();
    let _ = child.wait();

    if !lines.iter().any(|line| line.trim() == "uciok") {
        return Err("Engine did not respond with uciok within 5 seconds".to_string());
    }

    Ok(parse_uci_handshake(&lines))
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

fn parse_uci_handshake(lines: &[String]) -> EngineHandshake {
    let name = lines
        .iter()
        .find_map(|line| line.strip_prefix("id name ").map(str::trim))
        .filter(|value| !value.is_empty())
        .unwrap_or("Unknown Engine")
        .to_string();
    let author = lines
        .iter()
        .find_map(|line| line.strip_prefix("id author ").map(str::trim))
        .filter(|value| !value.is_empty())
        .map(str::to_string);
    let options = lines
        .iter()
        .filter_map(|line| parse_uci_option(line))
        .collect();

    EngineHandshake {
        name,
        author,
        protocol: "uci".to_string(),
        options,
        raw: lines.join("\n"),
    }
}

fn parse_uci_option(line: &str) -> Option<EngineOptionConfig> {
    let body = line.strip_prefix("option ")?;
    let type_index = body.find(" type ")?;
    let name = body[..type_index].strip_prefix("name ")?.trim().to_string();
    let rest = &body[type_index + " type ".len()..];
    let mut pieces = rest.split_whitespace();
    let kind = pieces.next()?.to_string();
    let tail = pieces.collect::<Vec<_>>().join(" ");

    Some(EngineOptionConfig {
        name,
        kind,
        default: parse_option_value(extract_option_field(&tail, "default").as_deref()),
        min: extract_option_field(&tail, "min").and_then(|value| value.parse().ok()),
        max: extract_option_field(&tail, "max").and_then(|value| value.parse().ok()),
        vars: extract_option_vars(&tail),
    })
}

fn extract_option_field(tail: &str, key: &str) -> Option<String> {
    let marker = format!("{} ", key);
    let start = tail.find(&marker)? + marker.len();
    let rest = &tail[start..];
    let end = [" default ", " min ", " max ", " var "]
        .iter()
        .filter_map(|next| rest.find(next))
        .min()
        .unwrap_or(rest.len());
    Some(rest[..end].trim().to_string())
}

fn extract_option_vars(tail: &str) -> Vec<String> {
    tail.split(" var ")
        .skip(1)
        .map(|part| {
            let end = [" default ", " min ", " max "]
                .iter()
                .filter_map(|next| part.find(next))
                .min()
                .unwrap_or(part.len());
            part[..end].trim().to_string()
        })
        .filter(|value| !value.is_empty())
        .collect()
}

fn parse_option_value(value: Option<&str>) -> Option<serde_json::Value> {
    let value = value?.trim();
    if value.is_empty() || value == "<empty>" {
        return Some(serde_json::Value::String(String::new()));
    }
    if value.eq_ignore_ascii_case("true") {
        return Some(serde_json::Value::Bool(true));
    }
    if value.eq_ignore_ascii_case("false") {
        return Some(serde_json::Value::Bool(false));
    }
    if let Ok(number) = value.parse::<i64>() {
        return Some(serde_json::Value::Number(number.into()));
    }
    Some(serde_json::Value::String(value.to_string()))
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
