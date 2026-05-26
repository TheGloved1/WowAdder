use std::io::Read;
use std::collections::HashSet;
use tauri::Emitter;

fn extract_zip(zip_path: &std::path::Path, target: &std::path::Path) -> Result<Vec<String>, String> {
    let file = std::fs::File::open(zip_path).map_err(|e| format!("Failed to open zip: {}", e))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Failed to read zip: {}", e))?;

    std::fs::create_dir_all(target).map_err(|e| format!("Failed to create target dir: {}", e))?;

    let total = archive.len();
    let mut root_entries: HashSet<String> = HashSet::new();

    for i in 0..total {
        let mut entry = archive.by_index(i).map_err(|e| format!("Failed to read entry {}: {}", i, e))?;
        let entry_name = entry.name().to_string();
        let outpath = target.join(&entry_name);

        if let Some(root) = entry_name.split('/').next() {
            if !root.is_empty() {
                root_entries.insert(root.to_string());
            }
        }

        if entry_name.ends_with('/') {
            std::fs::create_dir_all(&outpath).map_err(|e| format!("Failed to create dir: {}", e))?;
        } else {
            if let Some(p) = outpath.parent() {
                std::fs::create_dir_all(p).map_err(|e| format!("Failed to create parent: {}", e))?;
            }
            let mut outfile = std::fs::File::create(&outpath).map_err(|e| format!("Failed to create file: {}", e))?;
            let mut buf = Vec::new();
            entry.read_to_end(&mut buf).map_err(|e| format!("Failed to read entry: {}", e))?;
            std::io::copy(&mut buf.as_slice(), &mut outfile).map_err(|e| format!("Failed to write file: {}", e))?;
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
    app_handle.emit("install-progress", 0).map_err(|e| e.to_string())?;

    let client = reqwest::blocking::Client::builder()
        .user_agent("WowAdder/1.0 (Tauri App)")
        .build()
        .map_err(|e| e.to_string())?;
    let response = client.get(&download_url).send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Download failed with HTTP status: {}", response.status()));
    }
    let bytes = response.bytes().map_err(|e| e.to_string())?;

    app_handle.emit("install-progress", 30).map_err(|e| e.to_string())?;

    let tmp_dir = std::env::temp_dir();
    let tmp_path = tmp_dir.join(format!("{}.zip", uuid::Uuid::new_v4()));
    std::fs::write(&tmp_path, &bytes).map_err(|e| e.to_string())?;

    app_handle.emit("install-progress", 50).map_err(|e| e.to_string())?;

    let target = std::path::Path::new(&target_dir);
    let entries = extract_zip(&tmp_path, target)?;

    let _ = std::fs::remove_file(&tmp_path);

    app_handle.emit("install-progress", 100).map_err(|e| e.to_string())?;

    let result = serde_json::json!({
        "folderName": folder_name,
        "entries": entries
    }).to_string();
    Ok(result)
}

#[tauri::command]
fn import_zip(
    zip_path: String,
    target_dir: String,
) -> Result<String, String> {
    let path = std::path::Path::new(&zip_path);
    let target = std::path::Path::new(&target_dir);

    if !path.exists() {
        return Err(format!("Zip file not found: {}", zip_path));
    }

    let entries = extract_zip(path, target)?;

    let result = serde_json::json!({
        "entries": entries
    }).to_string();
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
        .invoke_handler(tauri::generate_handler![install_addon, import_zip, open_folder, get_downloads_dir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}