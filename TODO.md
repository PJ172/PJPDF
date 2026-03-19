# PJPDF Project TODO

## Phase 1: Foundation & Setup
- [ ] Initialize Tauri project with React + TypeScript template.
- [ ] Setup Rust workspace and add `mupdf-rs` and `tesseract-rs` dependencies.
- [ ] Implement basic Window management and Title bar customization (Foxit style).
- [ ] Create logging and error handling infrastructure in Rust.

## Phase 2: Core PDF Engine (Rust)
- [ ] Implement `PdfEngine` trait/struct for MuPDF abstraction.
- [ ] Create command to open PDF and return document metadata (page count, title, etc.).
- [ ] Implement high-performance page rendering (Pixmap to Base64/Bytes).
- [ ] Implement Page Operations:
    - [ ] `delete_page(index)`
    - [ ] `rotate_page(index, angle)`
    - [ ] `split_pdf(ranges)`
    - [ ] `merge_pdfs(files)`
- [ ] Implement Incremental Save strategy to preserve signatures/metadata.

## Phase 3: UI & Interaction
- [ ] Build virtualized PDF viewer (render only visible pages).
- [ ] Implement Zoom logic:
    - [ ] `Ctrl + Wheel` listener.
    - [ ] Smooth CSS scaling + debounced High-Res re-render.
- [ ] Implement Fixed Ribbon Toolbar and Sidebar.
- [ ] Implement **View Modes**:
    - [ ] Standard Mode vs **Compact Mode** (20% padding reduction).
    - [ ] Dynamic Layout resizing logic.
- [ ] Implement **Precision Rulers System**:
    - [ ] Top & Left Rulers with pixel/mm units.
    - [ ] Interactive measurement markers.
- [ ] Implement **Advanced Sidebar Thumbnails**:
    - [ ] Corner Quick Actions (Rotate, Delete, Split) on hover.
    - [ ] Keyboard listener for `Delete` key.
    - [ ] Page deletion animation (Fade-out + Scale-down).
- [ ] Implement **Contextual Property Panel** (Right Sidebar):
    - [ ] Typography group (Font, Size).
    - [ ] Color Picker (Grid + Slider).
    - [ ] Alignment tools.
- [ ] Design and implement the "Ribbon" toolbar groups.

## Phase 4: Reflow Text Editing (The "Hard" Part)
- [ ] Implement "Text Layer" extraction: get all spans with bounding boxes and font info.
- [ ] Create an invisible overlay that maps PDF text to an editable HTML `div` (Reflow Editor).
- [ ] Implement bidirectional sync (The Event Bridge):
    - [ ] **Command:** `update_text_style(id, style)` in Rust.
    - [ ] **Event Bus:** `page-updated` listener in React to trigger re-renders.
    - [ ] **Latency Optimization:** Immediate UI update (Optimistic UI) + Async PDF update.
    - [ ] UI Change -> Rust update content stream.
    - [ ] Rust re-render page snapshot.
- [ ] Setup Font matching logic (ensure system fonts match PDF fonts).

## Phase 5: Specialized Features
- [ ] **Annotations:** Highlight, Underline, and Sticky Notes (SVG Overlay).
- [ ] **OCR:** Integrate Tesseract to convert image-based pages to searchable/editable text.
- [ ] **Signatures:** Basic digital signature visualization.

## Phase 6: Optimization & Polish
- [ ] Implement Disk/Memory caching for rendered pages.
- [ ] Optimize IPC communication overhead between Rust and JS.
- [ ] Final UI Polish (Animations, Glassmorphism, Dark Mode).
- [ ] **Phase X:** Run all verification scripts (`verify_all.py`).
