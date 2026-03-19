use anyhow::Context;
use fern::colors::{Color, ColoredLevelConfig};
use std::sync::Mutex;

mod pdf;
use pdf::PdfState;

struct InitialFile(Mutex<Option<String>>);

fn setup_logging() -> anyhow::Result<()> {
    let colors = ColoredLevelConfig::new()
        .error(Color::Red)
        .warn(Color::Yellow)
        .info(Color::Cyan)
        .debug(Color::White)
        .trace(Color::BrightBlack);

    fern::Dispatch::new()
        .format(move |out, message, record| {
            out.finish(format_args!(
                "{}[{}][{}] {}",
                chrono::Local::now().format("[%Y-%m-%d][%H:%M:%S]"),
                record.target(),
                colors.color(record.level()),
                message
            ))
        })
        .level(log::LevelFilter::Debug)
        .chain(std::io::stdout())
        .apply()
        .context("failed to set up logging")?;

    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_initial_file(state: tauri::State<'_, InitialFile>) -> Option<String> {
    let mut file = state.0.lock().unwrap();
    file.take()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(e) = setup_logging() {
        eprintln!("Failed to initialize logging: {:?}", e);
    }

    log::info!("Starting PJPDF...");

    tauri::Builder::default()
        .manage(PdfState(Mutex::new(std::collections::HashMap::new())))
        .manage(InitialFile(Mutex::new(None)))
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let pdf_path = argv.iter().find(|arg| arg.to_lowercase().ends_with(".pdf"));
            if let Some(path) = pdf_path {
                use tauri::Emitter;
                let _ = app.emit("open-file", path.clone());
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let args: Vec<String> = std::env::args().collect();
            let pdf_path = args.iter().find(|arg| arg.to_lowercase().ends_with(".pdf"));
            if let Some(path) = pdf_path {
                use tauri::Manager;
                let state = app.state::<InitialFile>();
                *state.0.lock().unwrap() = Some(path.clone());
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_initial_file,
            pdf::open_pdf,
            pdf::get_page_image,
            pdf::delete_page,
            pdf::rotate_page,
            pdf::get_page_text,
            pdf::get_page_size,
            pdf::update_text,
            pdf::get_page_thumbnail,
            pdf::perform_ocr,
            pdf::save_pdf,
            pdf::split_page,
            pdf::split_pdf_range,
            pdf::merge_pdfs,
            pdf::protect_pdf
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
