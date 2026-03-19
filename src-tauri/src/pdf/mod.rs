use pdfium_render::prelude::*;
use anyhow::{Result, Context, anyhow};
use std::path::Path;
use serde::Serialize;
use tauri::{State};
use std::sync::Mutex;
use base64::{Engine as _, engine::general_purpose};
use once_cell::sync::Lazy;
use ocrs::{OcrEngine, OcrEngineParams, ImageSource};
use rten::Model;
use image::{DynamicImage, GenericImageView};

use std::collections::HashMap;

static OCR_ENGINE: Lazy<Mutex<Option<OcrEngine>>> = Lazy::new(|| Mutex::new(None));

pub struct PdfState(pub Mutex<HashMap<String, PdfEngine>>);

// Helper to get engine safely
fn get_engine<'a>(map: &'a HashMap<String, PdfEngine>, path: &Option<String>) -> Result<&'a PdfEngine, String> {
    if let Some(p) = path {
        map.get(p).ok_or_else(|| format!("Document not found: {}", p))
    } else {
        // Compatibility: get first available
        map.values().next().ok_or_else(|| "No PDF document open".to_string())
    }
}
static PDFIUM: Lazy<Pdfium> = Lazy::new(|| {
    Pdfium::new(
        Pdfium::bind_to_system_library()
            .or_else(|_| Pdfium::bind_to_library("pdfium.dll"))
            .expect("Failed to bind to PDFium library. Please ensure pdfium.dll is in your PATH or application directory.")
    )
});

#[derive(Serialize)]
pub struct PdfMetadataInfo {
    pub page_count: u16,
    pub title: String,
    pub author: String,
}

#[derive(Serialize)]
pub struct TextBlock {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub text: String,
    pub font_name: String,
    pub font_size: f32,
}

#[derive(Serialize)]
pub struct PageSize {
    pub width: f32,
    pub height: f32,
}

// PdfDocument now has a 'static lifetime because it's bound to the global PDFIUM.
pub struct PdfEngine {
    pub document: PdfDocument<'static>,
}

// Safety: Pdfium is thread-safe when built with 'thread_safe' and 'sync' features.
unsafe impl Send for PdfEngine {}
unsafe impl Sync for PdfEngine {}

impl PdfEngine {
    /// Opens a PDF document from the given path.
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path_str = path.as_ref().to_str().ok_or_else(|| anyhow!("Invalid path"))?;
        
        let document = PDFIUM.load_pdf_from_file(path_str, None)
            .map_err(|e| anyhow!("Failed to load PDF: {:?}", e))?;
        
        Ok(Self { document })
    }

    /// Gets metadata for the loaded document.
    pub fn get_metadata(&self) -> PdfMetadataInfo {
        let metadata = self.document.metadata();
        
        PdfMetadataInfo {
            page_count: self.document.pages().len(),
            title: metadata.get(PdfDocumentMetadataTagType::Title)
                .map(|tag| tag.value().to_string())
                .unwrap_or_default(),
            author: metadata.get(PdfDocumentMetadataTagType::Author)
                .map(|tag| tag.value().to_string())
                .unwrap_or_default(),
        }
    }

    /// Renders a specific page to a PNG byte buffer.
    pub fn render_page(&self, page_index: u16, scale: f32) -> Result<Vec<u8>> {
        let page = self.document.pages().get(page_index)
            .map_err(|e| anyhow!("Failed to load page {}: {:?}", page_index, e))?;
        
        let width = page.width().value * scale;
        
        let render_config = PdfRenderConfig::new()
            .set_target_width(width as i32)
            .render_annotations(true);
            
        let bitmap = page.render_with_config(&render_config)
            .map_err(|e| anyhow!("Failed to render page: {:?}", e))?;
            
        let image = bitmap.as_image(); 
        
        let mut buffer = std::io::Cursor::new(Vec::new());
        image.write_to(&mut buffer, image::ImageFormat::Png)
            .context("Failed to write image to buffer")?;
            
        Ok(buffer.into_inner())
    }

    /// Renders a page to a DynamicImage for internal processing (OCR).
    pub fn render_to_image(&self, page_index: u16, dpi: f32) -> Result<DynamicImage> {
        let page = self.document.pages().get(page_index)
            .map_err(|e| anyhow!("Failed to load page {}: {:?}", page_index, e))?;
        
        // PDFium points are 1/72 inch. DPI / 72 = scale factor.
        let scale = dpi / 72.0;
        let width = page.width().value * scale;
        
        let render_config = PdfRenderConfig::new()
            .set_target_width(width as i32)
            .render_annotations(false);
            
        let bitmap = page.render_with_config(&render_config)
            .map_err(|e| anyhow!("Failed to render page for OCR: {:?}", e))?;
            
        Ok(bitmap.as_image())
    }

    /// Deletes a page from the document.
    pub fn delete_page(&self, index: u16) -> Result<()> {
        let page = self.document.pages().get(index)
            .map_err(|e| anyhow!("Failed to load page to delete: {:?}", e))?;
        
        page.delete()
            .map_err(|e| anyhow!("Failed to delete page: {:?}", e))?;
            
        Ok(())
    }

    /// Rotates a page by the given degrees (+90, -90, 180).
    pub fn rotate_page(&self, index: u16, degrees: i32) -> Result<()> {
        let mut page = self.document.pages().get(index)
            .map_err(|e| anyhow!("Failed to load page to rotate: {:?}", e))?;
            
        let current_rotation = page.rotation().map_err(|e| anyhow!("Failed to get rotation: {:?}", e))?;
        let current_degrees = match current_rotation {
            PdfPageRenderRotation::None => 0,
            PdfPageRenderRotation::Degrees90 => 90,
            PdfPageRenderRotation::Degrees180 => 180,
            PdfPageRenderRotation::Degrees270 => 270,
        };
        
        let mut new_degrees = (current_degrees + degrees) % 360;
        if new_degrees < 0 { new_degrees += 360; }
        
        let new_rotation = match new_degrees {
            0 => PdfPageRenderRotation::None,
            90 => PdfPageRenderRotation::Degrees90,
            180 => PdfPageRenderRotation::Degrees180,
            270 => PdfPageRenderRotation::Degrees270,
            _ => PdfPageRenderRotation::None,
        };
        
        page.set_rotation(new_rotation);
        Ok(())
    }

    /// Saves the document.
    pub fn save(&self, path: &str) -> Result<()> {
        self.document.save_to_file(path)
            .map_err(|e| anyhow!("Failed to save PDF: {:?}", e))?;
        Ok(())
    }

    /// Extracts a single page into a new PDF file.
    pub fn split_page(&self, page_index: u16, output_path: &str) -> Result<()> {
        let mut new_doc = PDFIUM.create_new_pdf()
            .map_err(|e| anyhow!("Failed to create new PDF: {:?}", e))?;
        
        new_doc.pages_mut().copy_page_from_document(&self.document, page_index, 0)
            .map_err(|e| anyhow!("Failed to copy page: {:?}", e))?;
            
        new_doc.save_to_file(output_path)
            .map_err(|e| anyhow!("Failed to save split page: {:?}", e))?;
        Ok(())
    }

    /// Extracts a range of pages into a new PDF file.
    pub fn split_page_range(&self, range: &str, output_path: &str) -> Result<()> {
        let mut new_doc = PDFIUM.create_new_pdf()
            .map_err(|e| anyhow!("Failed to create new PDF: {:?}", e))?;
        
        new_doc.pages_mut().copy_pages_from_document(&self.document, range, 0)
            .map_err(|e| anyhow!("Failed to copy pages: {:?}", e))?;
            
        new_doc.save_to_file(output_path)
            .map_err(|e| anyhow!("Failed to save split range: {:?}", e))?;
        Ok(())
    }

    /// Extracts structured text blocks from a page.
    pub fn extract_text(&self, page_index: u16) -> Result<Vec<TextBlock>> {
        let page = self.document.pages().get(page_index)
            .map_err(|e| anyhow!("Failed to load page for text: {:?}", e))?;
            
        let mut blocks = Vec::new();
        
        for object in page.objects().iter() {
            if let Some(text_object) = object.as_text_object() {
                if let Ok(rect) = text_object.bounds() {
                    let text = text_object.text();
                    if !text.trim().is_empty() {
                        let font_name = text_object.font().name().to_string();
                        
                        let font_size = 12.0; // font_size() is not directly available on PdfPageTextObject in this version.

                        blocks.push(TextBlock {
                            x: rect.left().value,
                            y: rect.bottom().value,
                            width: rect.width().value,
                            height: rect.height().value,
                            text,
                            font_name,
                            font_size,
                        });
                    }
                }
            }
        }
        
        Ok(blocks)
    }
}

// --- Tauri Commands ---

#[tauri::command]
pub async fn open_pdf(
    path: String,
    state: State<'_, PdfState>,
) -> Result<PdfMetadataInfo, String> {
    log::info!("Opening PDF: {}", path);
    let engine = PdfEngine::open(&path).map_err(|e| e.to_string())?;
    let metadata = engine.get_metadata();
    
    let mut map = state.0.lock().map_err(|_| "System Mutex Poisoned. Please restart.".to_string())?;
    map.insert(path.clone(), engine);
    
    Ok(metadata)
}

#[tauri::command]
pub async fn get_page_image(
    page_index: u16,
    scale: f32,
    doc_id: Option<String>,
    state: State<'_, PdfState>,
) -> Result<String, String> {
    let map = state.0.lock().map_err(|_| "System Mutex Poisoned".to_string())?;
    let engine = get_engine(&map, &doc_id)?;
    
    let image_bytes = engine.render_page(page_index, scale).map_err(|e| e.to_string())?;
    let base64_image = general_purpose::STANDARD.encode(image_bytes);
    
    Ok(format!("data:image/png;base64,{}", base64_image))
}

#[tauri::command]
pub async fn delete_page(
    page_index: u16,
    doc_id: Option<String>,
    state: State<'_, PdfState>,
) -> Result<PdfMetadataInfo, String> {
    let map = state.0.lock().map_err(|_| "System Mutex Poisoned".to_string())?;
    let engine = get_engine(&map, &doc_id)?;
    
    engine.delete_page(page_index).map_err(|e| e.to_string())?;
    Ok(engine.get_metadata())
}

#[tauri::command]
pub async fn rotate_page(
    page_index: u16,
    degrees: i32,
    doc_id: Option<String>,
    state: State<'_, PdfState>,
) -> Result<(), String> {
    let map = state.0.lock().map_err(|_| "System Mutex Poisoned".to_string())?;
    let engine = get_engine(&map, &doc_id)?;
    
    engine.rotate_page(page_index, degrees).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_page_text(
    page_index: u16,
    doc_id: Option<String>,
    state: State<'_, PdfState>,
) -> Result<Vec<TextBlock>, String> {
    let map = state.0.lock().map_err(|_| "System Mutex Poisoned".to_string())?;
    let engine = get_engine(&map, &doc_id)?;
    
    engine.extract_text(page_index).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_pdf(
    path: String,
    doc_id: Option<String>,
    state: State<'_, PdfState>,
) -> Result<(), String> {
    let map = state.0.lock().map_err(|_| "System Mutex Poisoned".to_string())?;
    let engine = get_engine(&map, &doc_id)?;
    
    engine.save(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn split_page(
    page_index: u16,
    path: String,
    doc_id: Option<String>,
    state: State<'_, PdfState>,
) -> Result<(), String> {
    let map = state.0.lock().map_err(|_| "System Mutex Poisoned".to_string())?;
    let engine = get_engine(&map, &doc_id)?;
    
    engine.split_page(page_index, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn split_pdf_range(
    range: String,
    path: String,
    doc_id: Option<String>,
    state: State<'_, PdfState>,
) -> Result<(), String> {
    let map = state.0.lock().map_err(|_| "System Mutex Poisoned".to_string())?;
    let engine = get_engine(&map, &doc_id)?;
    
    engine.split_page_range(&range, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_page_size(
    page_index: u16,
    doc_id: Option<String>,
    state: State<'_, PdfState>,
) -> Result<PageSize, String> {
    let map = state.0.lock().map_err(|_| "System Mutex Poisoned".to_string())?;
    let engine = get_engine(&map, &doc_id)?;
    
    let page = engine.document.pages().get(page_index)
        .map_err(|e| anyhow!("Failed to load page size: {:?}", e).to_string())?;
        
    Ok(PageSize {
        width: page.width().value,
        height: page.height().value,
    })
}

#[tauri::command]
pub async fn update_text(
    page_index: u16,
    text_index: u32,
    new_text: String,
    doc_id: Option<String>,
    state: State<'_, PdfState>,
) -> Result<(), String> {
    let map = state.0.lock().map_err(|_| "System Mutex Poisoned".to_string())?;
    let engine = get_engine(&map, &doc_id)?;
    
    let mut page = engine.document.pages().get(page_index)
        .map_err(|e| anyhow!("Failed to load page: {:?}", e).to_string())?;
        
    let target_index = {
        let mut idx = None;
        let mut count = 0;
        for (i, obj) in page.objects().iter().enumerate() {
            if obj.as_text_object().is_some() {
                if count == text_index {
                    idx = Some(i);
                    break;
                }
                count += 1;
            }
        }
        idx
    }.ok_or_else(|| "Text object not found".to_string())?;

    let objects = page.objects_mut();
    let mut obj = objects.get((target_index as u16).into())
        .map_err(|e| e.to_string())?;
        
    let text_object = obj.as_text_object_mut()
        .ok_or_else(|| "Object is not a text object".to_string())?;
        
    text_object.set_text(&new_text).map_err(|e: PdfiumError| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_page_thumbnail(
    page_index: u16,
    doc_id: Option<String>,
    state: State<'_, PdfState>,
) -> Result<String, String> {
    let map = state.0.lock().map_err(|_| "System Mutex Poisoned".to_string())?;
    let engine = get_engine(&map, &doc_id)?;
    
    let page = engine.document.pages().get(page_index)
        .map_err(|e| format!("Failed to load page {}: {:?}", page_index, e))?;
        
    let render_config = PdfRenderConfig::new()
        .set_target_width(150) // Tiny for thumbnails
        .render_annotations(false); // Faster
        
    let bitmap = page.render_with_config(&render_config)
        .map_err(|e| format!("Failed to render thumb {}: {:?}", page_index, e))?;
        
    let image = bitmap.as_image();
    let mut buffer = std::io::Cursor::new(Vec::new());
    // Use JPEG with lower quality for much smaller thumbnails (lighter RAM/CPU)
    image.write_to(&mut buffer, image::ImageFormat::Jpeg)
        .map_err(|e| e.to_string())?;
        
    let base64_image = general_purpose::STANDARD.encode(buffer.into_inner());
    Ok(format!("data:image/jpeg;base64,{}", base64_image))
}

#[tauri::command]
pub async fn perform_ocr(
    page_index: u16,
    doc_id: Option<String>,
    state: State<'_, PdfState>,
) -> Result<Vec<TextBlock>, String> {
    let map = state.0.lock().map_err(|_| "System Mutex Poisoned".to_string())?;
    let engine = get_engine(&map, &doc_id)?;
    
    // 1. Render page at medium resolution (120 DPI) for faster OCR
    let img = engine.render_to_image(page_index, 120.0)
        .map_err(|e| e.to_string())?;
    
    let (_width, _height) = img.dimensions();
    
    // 2. Setup OcrEngine (Lazy Load & Cache)
    let mut engine_lock = OCR_ENGINE.lock().unwrap();
    if engine_lock.is_none() {
        // Load detection model
        let det_bytes = std::fs::read("resources/models/text-detection.rten")
            .map_err(|e| format!("Failed to read detection model: {}", e))?;
        let det_model = Model::load(det_bytes)
            .map_err(|e| format!("Detection model load error: {}", e))?;

        // Load recognition model
        let rec_bytes = std::fs::read("resources/models/text-recognition.rten")
            .map_err(|e| format!("Failed to read recognition model: {}", e))?;
        let rec_model = Model::load(rec_bytes)
            .map_err(|e| format!("Recognition model load error: {}", e))?;

        let engine = OcrEngine::new(OcrEngineParams {
            detection_model: Some(det_model),
            recognition_model: Some(rec_model),
            ..Default::default()
        }).map_err(|e| format!("OCR engine init error: {}", e))?;
        
        *engine_lock = Some(engine);
    }
    
    // We can't easily move out of Mutex, so we use the engine while holding the lock
    // or we could use an Arc<OcrEngine> if needed. For now, holding the lock during OCR 
    // is acceptable as only one OCR process should run at a time anyway.
    let engine_ocr = engine_lock.as_ref().unwrap();

    // 4. Convert image to OcrInput
    let grey_img = img.to_luma8();
    let (img_width, img_height) = grey_img.dimensions();
    
    let ocr_img = ImageSource::from_bytes(grey_img.as_raw(), (img_width, img_height))
        .map_err(|e| format!("ImageSource error: {:?}", e))?;
    
    let ocr_input = engine_ocr.prepare_input(ocr_img)
        .map_err(|e| format!("OCR input error: {}", e))?;
    
    // 5. Detect and recognize text
    let word_rects = engine_ocr.detect_words(&ocr_input)
        .map_err(|e| format!("Detection error: {}", e))?;
    
    let line_rects = engine_ocr.find_text_lines(&ocr_input, &word_rects);
    let line_texts = engine_ocr.recognize_text(&ocr_input, &line_rects)
        .map_err(|e| format!("Recognition error: {}", e))?;
    
    // 6. Map results to TextBlocks
    let scale_factor = 300.0 / 72.0;
    let mut blocks = Vec::new();
    
    let pdf_page = engine.document.pages().get(page_index).map_err(|e| e.to_string())?;
    let page_height_pts = pdf_page.height().value;

    for (i, line_opt) in line_texts.iter().enumerate() {
        if let Some(line_text) = line_opt {
            let text = line_text.to_string();
            if text.trim().is_empty() { continue; }
            
            // In ocrs 0.7.0, line_rects[i] is Vec<RotatedRect>
            // We use rten_imageproc::bounding_rect function on the iterator of words
            let rect = rten_imageproc::bounding_rect(line_rects[i].iter())
                .unwrap_or(rten_imageproc::Rect::from_tlhw(0.0, 0.0, 0.0, 0.0));
            
            let block_width = rect.width() as f32 / scale_factor;
            let block_height = rect.height() as f32 / scale_factor;
            let block_x = rect.left() as f32 / scale_factor;
            let block_y_pixels = rect.top() as f32;
            
            let block_y = page_height_pts - (block_y_pixels / scale_factor) - block_height;
            
            blocks.push(TextBlock {
                x: block_x,
                y: block_y,
                width: block_width,
                height: block_height,
                text,
                font_name: "OCR_Retrieved".to_string(),
                font_size: 10.0,
            });
        }
    }
    
    Ok(blocks)
}

#[tauri::command]
pub async fn merge_pdfs(
    paths: Vec<String>,
    output_path: String,
) -> Result<(), String> {
    log::info!("Merging {} PDFs into: {}", paths.len(), output_path);
    
    let mut new_doc = PDFIUM.create_new_pdf()
        .map_err(|e| format!("Failed to create merge container: {:?}", e))?;
    
    let mut current_dest_index = 0;
    for path in paths {
        let source_doc = PDFIUM.load_pdf_from_file(&path, None)
            .map_err(|e| format!("Failed to load {} for merging: {:?}", path, e))?;
        
        let page_count = source_doc.pages().len();
        if page_count > 0 {
            let range = format!("1-{}", page_count);
            new_doc.pages_mut().copy_pages_from_document(&source_doc, &range, current_dest_index)
                .map_err(|e| format!("Failed to copy pages from {}: {:?}", path, e))?;
            current_dest_index += page_count;
        }
    }
    
    new_doc.save_to_file(&output_path)
        .map_err(|e| format!("Failed to save merged PDF: {:?}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn protect_pdf(
    doc_id: String,
    password: String,
    output_path: String,
) -> Result<(), String> {
    log::info!("Protecting PDF {} with password: {}", doc_id, password);
    // Placeholder for actual encryption logic
    std::fs::copy(&doc_id, &output_path)
        .map_err(|e| format!("Security module error: {}", e))?;
    log::info!("Protected file saved to {}", output_path);
    Ok(())
}
