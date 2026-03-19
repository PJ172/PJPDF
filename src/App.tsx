import { useState, useEffect, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { open, save, confirm } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { useTranslation } from "react-i18next";

// Import Modular Components
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import TabBar from "./components/TabBar";
import PDFViewport from "./components/PDFViewport";
import PropertyPanel from "./components/PropertyPanel";
import Toast from "./components/Toast";
import MergeModal from "./components/MergeModal";
import SplitModal from "./components/SplitModal";
import PrintModal from "./components/PrintModal";

interface PdfMetadata {
  page_count: number;
  title: string;
  author: string;
}

interface TextBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  font_name: string;
  font_size: number;
}

interface PageSize {
  width: number;
  height: number;
}

interface PdfTab {
  id: string; // File path unique ID
  metadata: PdfMetadata;
  thumbnails: string[];
  currentPage: number;
}

function App() {
  const { t } = useTranslation();
  
  // Tab Management State
  const [tabs, setTabs] = useState<PdfTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPropertyPanelOpen, setIsPropertyPanelOpen] = useState(true);
  const [isEditTextEnabled, setIsEditTextEnabled] = useState(false);

  
  // Current PDF State (for active doc)
  const [metadata, setMetadata] = useState<PdfMetadata | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageImages, setPageImages] = useState<Record<number, string>>({});
  const [pageSize, setPageSize] = useState<PageSize | null>(null);
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1.5);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const appWindow = getCurrentWindow();

  // --- PDF Handlers ---
  const handleOpenFile = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });

      if (selected && Array.isArray(selected)) {
        setIsLoading(true);
        
        let lastSelectedMeta: PdfMetadata | null = null;
        let lastSelectedPath: string | null = null;

        for (const path of selected) {
          const meta = await invoke<PdfMetadata>("open_pdf", { path });
          
          setTabs(prev => {
            if (prev.find(t => t.id === path)) return prev;
            return [...prev, {
              id: path,
              metadata: meta,
              thumbnails: new Array(meta.page_count).fill(""),
              currentPage: 0
            }];
          });
          
          lastSelectedMeta = meta;
          lastSelectedPath = path;
        }

        // Switch to the last opened tab
        if (lastSelectedPath && lastSelectedMeta) {
          await switchTab(lastSelectedPath, lastSelectedMeta);
        }
        
        setIsLoading(false);

      } else if (selected && typeof selected === "string") {
        // Fallback for single select if it happens
        setIsLoading(true);
        const meta = await invoke<PdfMetadata>("open_pdf", { path: selected });
        setTabs(prev => {
          if (prev.find(t => t.id === selected)) return prev;
          return [...prev, {
            id: selected,
            metadata: meta,
            thumbnails: new Array(meta.page_count).fill(""),
            currentPage: 0
          }];
        });
        await switchTab(selected, meta);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to open PDF:", error);
      setIsLoading(false);
    }
  };

  const switchTab = async (tabId: string, meta?: PdfMetadata) => {
    const targetTab = tabs.find(t => t.id === tabId);
    const activeMeta = meta || targetTab?.metadata;
    if (!activeMeta) return;

    setActiveTabId(tabId);
    setMetadata(activeMeta);
    setCurrentPage(targetTab?.currentPage || 0);
    setPageImages({});

    
    // Clear and start loading thumbnails for this specific tab if empty
    const existingThumbs = targetTab?.thumbnails || new Array(activeMeta.page_count).fill("");
    setThumbnails(existingThumbs);

    await Promise.all([
      loadPageImage(targetTab?.currentPage || 0, zoom, tabId),
      loadPageSize(targetTab?.currentPage || 0, tabId)
    ]);

    if (existingThumbs.every(t => t === "")) {
      loadThumbnails(activeMeta.page_count, tabId);
    }
  };

  const loadPageImage = useCallback(async (index: number, scale: number, docId?: string) => {
    const id = docId || activeTabId;
    if (!id) return;
    try {
      const dataUrl = await invoke<string>("get_page_image", { pageIndex: index, scale, docId: id });
      setPageImages(prev => ({ ...prev, [index]: dataUrl }));
    } catch (error) {
      console.error("Failed to load page image:", error);
    }
  }, [activeTabId]);

  const loadPageSize = useCallback(async (index: number, docId?: string) => {
    const id = docId || activeTabId;
    if (!id) return;
    try {
      const size = await invoke<PageSize>("get_page_size", { pageIndex: index, docId: id });
      setPageSize(size);
    } catch (error) {
      console.error("Failed to load page size:", error);
    }
  }, [activeTabId]);

  const loadTextBlocks = useCallback(async (index: number, docId?: string) => {
    const id = docId || activeTabId;
    if (!id) return;
    try {
      const blocks = await invoke<TextBlock[]>("get_page_text", { pageIndex: index, docId: id });
      setTextBlocks(blocks);
    } catch (error) {
      console.error("Failed to load text blocks:", error);
    }
  }, [activeTabId]);

  const loadSingleThumbnail = useCallback(async (index: number, docId?: string) => {
    const id = docId || activeTabId;
    if (!id) return;
    try {
      const thumb = await invoke<string>("get_page_thumbnail", { pageIndex: index, docId: id });
      
      setThumbnails(prev => {
        const newThumbs = [...prev];
        newThumbs[index] = thumb;
        return newThumbs;
      });

      setTabs(prev => prev.map(t => 
        t.id === id ? { ...t, thumbnails: t.thumbnails.map((v, idx) => idx === index ? thumb : v) } : t
      ));
    } catch (error) {
      console.error(`Failed to load single thumbnail for page ${index}:`, error);
    }
  }, [activeTabId]);

  const loadThumbnails = useCallback(async (count: number, docId?: string) => {
    const id = docId || activeTabId;
    if (!id) return;
    for (let i = 0; i < count; i++) {
      try {
        const thumb = await invoke<string>("get_page_thumbnail", { pageIndex: i, docId: id });
        
        // Update both local state and tabs state
        setThumbnails(prev => {
          const newThumbs = [...prev];
          newThumbs[i] = thumb;
          return newThumbs;
        });

        setTabs(prev => prev.map(t => 
          t.id === id ? { ...t, thumbnails: t.thumbnails.map((v, idx) => idx === i ? thumb : v) } : t
        ));

        await new Promise(r => setTimeout(r, 10));
      } catch (error) {
        console.error(`Failed to load thumbnail for page ${i}:`, error);
      }
    }
  }, [activeTabId]);

  const handleCloseTab = (id: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== id);
      if (id === activeTabId) {
        if (newTabs.length > 0) {
          switchTab(newTabs[0].id);
        } else {
          setActiveTabId(null);
          setMetadata(null);
          setThumbnails([]);
          setPageImages({});
        }
      }
      return newTabs;
    });
  };

  const handleUpdateText = async (index: number, newText: string) => {
    if (metadata === null || !activeTabId) return;
    try {
      setIsSyncing(true);
      await invoke("update_text", { 
        pageIndex: currentPage, 
        textIndex: index, 
        newText,
        docId: activeTabId 
      });
      
      // Re-fetch everything to ensure UI is in sync
      await Promise.all([
        loadPageImage(currentPage, zoom),
        loadTextBlocks(currentPage)
      ]);
      setIsSyncing(false);
    } catch (error) {
      console.error("Failed to update text:", error);
      setIsSyncing(false);
    }
  };

  const handleDeletePage = async (index: number) => {
    if (!activeTabId) return;
    try {
      const confirmed = await confirm(
        t('messages.delete_page_confirm'),
        { title: 'PJPDF', kind: 'warning' }
      );
      
      if (!confirmed) return;

      const newMeta = await invoke<PdfMetadata>("delete_page", { pageIndex: index, docId: activeTabId });
      setMetadata(newMeta);
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, metadata: newMeta } : t));
      setPageImages({});
      if (currentPage >= newMeta.page_count) {
        setCurrentPage(Math.max(0, newMeta.page_count - 1));
      } else {
        await Promise.all([
          loadPageImage(currentPage, zoom),
          loadPageSize(currentPage)
        ]);
      }
    } catch (error) {
      console.error("Failed to delete page:", error);
    }
  };

  const handleRotatePage = async (index: number, degrees: number) => {
    if (!activeTabId) return;
    try {
      await invoke("rotate_page", { pageIndex: index, degrees, docId: activeTabId });
      await Promise.all([
        loadPageImage(index, zoom),
        loadPageSize(index),
        loadTextBlocks(index),
        loadSingleThumbnail(index)
      ]);
    } catch (error) {
      console.error("Failed to rotate page:", error);
    }
  };

  const handleSave = async () => {
    if (!metadata || !activeTabId) return;
    try {
      setIsLoading(true);
      // activeTabId is the full path to the original file
      await invoke("save_pdf", { path: activeTabId, docId: activeTabId });
      setToast({ message: t('messages.saved_success', 'Changes saved to original file!'), type: 'success' });
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to quick save PDF:", error);
      setIsLoading(false);
      setToast({ message: t('messages.save_failed', 'Failed to save to original file.'), type: 'error' });
    }
  };

  const handleSaveAs = async () => {
    if (!metadata || !activeTabId) return;
    try {
      const path = await save({
        filters: [{ name: "PDF", extensions: ["pdf"] }],
        defaultPath: "modified.pdf"
      });
      if (path) {
        setIsLoading(true);
        await invoke("save_pdf", { path, docId: activeTabId });
        setToast({ message: t('messages.saved_success', 'Document saved successfully!'), type: 'success' });
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to save as PDF:", error);
      setIsLoading(false);
      setToast({ message: t('messages.save_failed', 'Failed to save document.'), type: 'error' });
    }
  };

  const handleSplit = () => {
    setIsSplitModalOpen(true);
  };

  const handleMerge = () => {
    setIsMergeModalOpen(true);
  };

  const executeMerge = async (paths: string[]) => {
    try {
      const path = await save({
        filters: [{ name: "PDF", extensions: ["pdf"] }],
        defaultPath: "merged_document.pdf"
      });

      if (path) {
        setIsLoading(true);
        await invoke("merge_pdfs", { paths, outputPath: path });
        setToast({ message: t('messages.merge_success', 'Files merged successfully!'), type: 'success' });
        
        const meta = await invoke<PdfMetadata>("open_pdf", { path });
        setTabs(prev => [...prev, {
          id: path,
          metadata: meta,
          thumbnails: new Array(meta.page_count).fill(""),
          currentPage: 0
        }]);
        await switchTab(path, meta);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to merge PDFs:", error);
      setIsLoading(false);
      setToast({ message: t('messages.merge_failed', 'Failed to merge files.'), type: 'error' });
    }
  };

  const handleOCR = async () => {
    if (!activeTabId) return;
    try {
      setIsSyncing(true);
      const blocks = await invoke<TextBlock[]>("perform_ocr", { 
        pageIndex: currentPage, 
        docId: activeTabId 
      });
      setTextBlocks(blocks);
      setIsSyncing(false);
    } catch (error) {
      console.error("OCR Error:", error);
      setIsSyncing(false);
    }
  };

  const handleSetCurrentPage = (page: number) => {
    setCurrentPage(page);
    if (activeTabId) {
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, currentPage: page } : t));
    }
  };

  const handleReorderPages = (fromIndex: number, toIndex: number) => {
    if (!activeTabId) return;

    setTabs(prev => prev.map(t => {
      if (t.id !== activeTabId) return t;
      
      const newThumbs = [...t.thumbnails];
      const [removed] = newThumbs.splice(fromIndex, 1);
      newThumbs.splice(toIndex, 0, removed);
      
      return { ...t, thumbnails: newThumbs };
    }));

    // Cần có logic đồng bộ index hoặc lưu trạng thái thứ tự mới nếu muốn lưu file.
    // Tạm thời Frontend sẽ hiển thị thứ tự đã kéo thả.
    setCurrentPage(toIndex);
  };

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(5.0, Math.max(0.1, prev + delta)));
  };

  // --- Effects ---
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        handleZoom(e.deltaY > 0 ? -0.1 : 0.1);
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Delete') {
        e.preventDefault();
        handleDeletePage(currentPage);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSave]);

  useEffect(() => {
    if (metadata !== null && activeTabId) {
      // Tải cố định thông số kích thước và khối text lập tức
      loadPageSize(currentPage);
      loadTextBlocks(currentPage);

      // Debounce cho việc tải khối lượng nặng (Page Render) khi zoom
      const delayImageLoad = setTimeout(() => {
         loadPageImage(currentPage, zoom);
      }, 50); // Delay 50ms chờ người dùng dừng xoay con lăn liên tục

      return () => clearTimeout(delayImageLoad);
    }
  }, [currentPage, zoom, metadata, activeTabId, loadPageImage, loadPageSize, loadTextBlocks]);

  useEffect(() => {
    let isMounted = true;

    const loadFileByPath = async (path: string) => {
      try {
        setIsLoading(true);
        const meta = await invoke<PdfMetadata>("open_pdf", { path });
        setTabs(prev => {
          if (prev.find(t => t.id === path)) return prev;
          return [...prev, {
            id: path,
            metadata: meta,
            thumbnails: new Array(meta.page_count).fill(""),
            currentPage: 0
          }];
        });
        await switchTab(path, meta);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load PDF path:", error);
        setIsLoading(false);
      }
    };

    const unlistenPromise = listen<string>("open-file", (event) => {
      console.log("Received open-file event:", event.payload);
      if (isMounted) {
        loadFileByPath(event.payload);
      }
    });

    invoke<string | null>("get_initial_file").then((path) => {
      if (path && isMounted) {
        console.log("Found initial file:", path);
        loadFileByPath(path);
      }
    });

    return () => {
      isMounted = false;
      unlistenPromise.then(unlisten => unlisten());
    };
  }, []);

  return (
    <div className="flex h-screen bg-noir-black text-ghost-white select-none overflow-hidden">
      {/* 1. Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        metadata={metadata}
        currentPage={currentPage}
        setCurrentPage={handleSetCurrentPage}
        onReorder={handleReorderPages}
        thumbnails={thumbnails}
        isEditTextEnabled={isEditTextEnabled}
        onToggleEditText={() => setIsEditTextEnabled(!isEditTextEnabled)}
        onRotate={handleRotatePage}
        onSplit={handleSplit}
        onMerge={handleMerge}
      />


      <div className="flex-1 flex flex-col min-w-0">
        {/* 2. Header */}
        <Header 
          onMinimize={async () => await appWindow.minimize()}
          onMaximize={async () => await appWindow.toggleMaximize()}
          onClose={async () => await appWindow.close()}
          onOpen={handleOpenFile}
          onSave={handleSave}
          onSaveAs={handleSaveAs}
          onPrint={() => setIsPrintModalOpen(true)}
        />

        <TabBar 
          tabs={tabs} 
          activeTabId={activeTabId} 
          onSwitch={switchTab} 
          onClose={handleCloseTab} 
        />

        {/* Toolbar removed, actions moved to Sidebar */}

        {/* 3. Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
          <PDFViewport 
            isLoading={isLoading}
            isSyncing={isSyncing}
            metadata={metadata}
            pageImage={pageImages[currentPage] || null}
            pageSize={pageSize}
            currentPage={currentPage}
            zoom={zoom}
            onZoom={handleZoom}
            onOpen={handleOpenFile}
            textBlocks={textBlocks}
            onUpdateText={handleUpdateText}
            selectedBlockIndex={selectedBlockIndex}
            setSelectedBlockIndex={setSelectedBlockIndex}
            isEditTextEnabled={isEditTextEnabled}
          />


          {/* 4. Property Panel */}
          <PropertyPanel 
            isOpen={isPropertyPanelOpen}
            onClose={() => setIsPropertyPanelOpen(false)}
            metadata={metadata}
            onOCR={handleOCR}
            isLoading={isLoading || isSyncing}
            selectedBlock={selectedBlockIndex !== null ? textBlocks[selectedBlockIndex] : null}
            onUpdateProperty={(key: string, value: any) => {
              if (selectedBlockIndex === null) return;
              
              setTextBlocks(prev => {
                const newBlocks = [...prev];
                const block = { ...newBlocks[selectedBlockIndex] };
                
                if (key === 'font_size') block.font_size = value;
                if (key === 'font_name') block.font_name = value;
                
                newBlocks[selectedBlockIndex] = block;
                return newBlocks;
              });

              console.log(`Property ${key} updated to ${value} for block ${selectedBlockIndex}`);
              // Note: Backend persistence for font/size will be implemented in a future phase
            }}
          />
        </div>
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <MergeModal 
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        initialTabs={tabs}
        onConfirmMerge={executeMerge}
      />

      <SplitModal 
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        metadata={metadata}
        activeTabId={activeTabId}
        setToast={setToast}
      />

      <PrintModal 
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        metadata={metadata}
        pageImages={pageImages}
        activeTabId={activeTabId}
      />
      </div>
    </div>
  );
}

export default App;
