use std::collections::HashSet;
use std::io::Read;
use tauri::Emitter;

#[derive(Clone, serde::Serialize)]
struct InstallProgress {
    progress: u32,
    stage: String,
    label: String,
}

fn emit_progress(app_handle: &tauri::AppHandle, progress: u32, stage: &str, label: &str) {
    let _ = app_handle.emit(
        "install-progress",
        InstallProgress { progress, stage: stage.to_string(), label: label.to_string() },
    );
}

fn format_size(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB"];
    let mut size = bytes as f64;
    let mut unit_idx = 0;
    while size >= 1024.0 && unit_idx < UNITS.len() - 1 {
        size /= 1024.0;
        unit_idx += 1;
    }
    if unit_idx == 0 {
        format!("{} {}", bytes, UNITS[unit_idx])
    } else {
        format!("{:.1} {}", size, UNITS[unit_idx])
    }
}

fn extract_zip_with_progress(
    app_handle: &tauri::AppHandle,
    zip_path: &std::path::Path,
    target: &std::path::Path,
    base_progress: u32,
    progress_span: u32,
) -> Result<Vec<String>, String> {
    let file = std::fs::File::open(zip_path).map_err(|e| format!("Failed to open zip: {}", e))?;
    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("Failed to read zip: {}", e))?;

    std::fs::create_dir_all(target).map_err(|e| format!("Failed to create target dir: {}", e))?;

    let total = archive.len();
    let mut root_entries: HashSet<String> = HashSet::new();

    for i in 0..total {
        let entry_progress =
            base_progress + ((i as f64 / total as f64) * progress_span as f64) as u32;
        emit_progress(
            app_handle,
            entry_progress.min(base_progress + progress_span - 1),
            "extracting",
            &format!("Extracting file {}/{}...", i + 1, total),
        );

        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read entry {}: {}", i, e))?;
        let entry_name = entry.name().to_string();
        let outpath = target.join(&entry_name);

        if let Some(root) = entry_name.split('/').next() {
            if !root.is_empty() {
                root_entries.insert(root.to_string());
            }
        }

        if entry_name.ends_with('/') {
            std::fs::create_dir_all(&outpath)
                .map_err(|e| format!("Failed to create dir: {}", e))?;
        } else {
            if let Some(p) = outpath.parent() {
                std::fs::create_dir_all(p)
                    .map_err(|e| format!("Failed to create parent: {}", e))?;
            }
            let mut outfile = std::fs::File::create(&outpath)
                .map_err(|e| format!("Failed to create file: {}", e))?;
            let mut buf = Vec::new();
            entry
                .read_to_end(&mut buf)
                .map_err(|e| format!("Failed to read entry: {}", e))?;
            std::io::copy(&mut buf.as_slice(), &mut outfile)
                .map_err(|e| format!("Failed to write file: {}", e))?;
        }
    }

    Ok(root_entries.into_iter().collect())
}

#[tauri::command]
fn install_addon(
    app_handle: tauri::AppHandle,
    download_url: String,
    target_dir: String,
    folder_name: String,
) -> Result<String, String> {
    emit_progress(&app_handle, 0, "downloading", "Starting download...");

    let client = reqwest::blocking::Client::builder()
        .user_agent("WowAdder/1.0 (Tauri App)")
        .build()
        .map_err(|e| e.to_string())?;
    let response = client
        .get(&download_url)
        .send()
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Download failed with HTTP status: {}", response.status()));
    }

    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut bytes = Vec::new();
    let mut buffer = [0u8; 16384];

    let mut reader = response;
    loop {
        let n = reader.read(&mut buffer).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        downloaded += n as u64;
        bytes.extend_from_slice(&buffer[..n]);
        if total_size > 0 {
            let pct = (downloaded as f64 / total_size as f64 * 70.0) as u32;
            emit_progress(
                &app_handle,
                pct.min(69),
                "downloading",
                &format!("Downloading... {} / {}", format_size(downloaded), format_size(total_size)),
            );
        } else {
            emit_progress(
                &app_handle,
                0,
                "downloading",
                &format!("Downloading... {}", format_size(downloaded)),
            );
        }
    }

    emit_progress(&app_handle, 70, "extracting", "Extracting files...");

    let tmp_dir = std::env::temp_dir();
    let tmp_path = tmp_dir.join(format!("{}.zip", uuid::Uuid::new_v4()));
    std::fs::write(&tmp_path, &bytes).map_err(|e| e.to_string())?;

    let target = std::path::Path::new(&target_dir);
    let entries = extract_zip_with_progress(&app_handle, &tmp_path, target, 70, 25)?;

    emit_progress(&app_handle, 95, "finishing", "Finalizing installation...");

    let _ = std::fs::remove_file(&tmp_path);

    emit_progress(&app_handle, 100, "finishing", "Installation complete!");

    let result = serde_json::json!({
        "folderName": folder_name,
        "entries": entries
    })
    .to_string();
    Ok(result)
}

#[tauri::command]
fn import_zip(
    app_handle: tauri::AppHandle,
    zip_path: String,
    target_dir: String,
) -> Result<String, String> {
    let path = std::path::Path::new(&zip_path);

    if !path.exists() {
        return Err(format!("Zip file not found: {}", zip_path));
    }

    emit_progress(&app_handle, 0, "extracting", "Starting extraction...");

    let target = std::path::Path::new(&target_dir);
    let entries = extract_zip_with_progress(&app_handle, path, target, 0, 95)?;

    emit_progress(&app_handle, 95, "finishing", "Finalizing import...");
    emit_progress(&app_handle, 100, "finishing", "Import complete!");

    let result = serde_json::json!({
        "entries": entries
    })
    .to_string();
    Ok(result)
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    tauri_plugin_opener::open_path(&path, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_downloads_dir() -> Result<String, String> {
    dirs::download_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not determine downloads directory".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            for url in args.iter().filter(|a| a.starts_with("curseforge://")) {
                let _ = app.emit("deep-link-url", url.to_string());
            }
        }))
        .invoke_handler(tauri::generate_handler![
            install_addon,
            import_zip,
            open_folder,
            get_downloads_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
