import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, LayoutGrid, FileText } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: { page_count: number; title: string } | null;
  pageImages: Record<number, string>;
  activeTabId: string | null;
}

const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  metadata,
  pageImages,
  activeTabId
}) => {
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'custom' | 'even' | 'odd'>('all');
  const [customRange, setCustomRange] = useState('');
  const [nUp, setNUp] = useState<1 | 2 | 4>(1);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !metadata) return null;

  const parseRange = (rangeStr: string, total: number): number[] => {
    const pages = new Set<number>();
    const components = rangeStr.split(',').map(c => c.trim());
    for (const entry of components) {
      if (entry.includes('-')) {
        const [startStr, endStr] = entry.split('-');
        const start = parseInt(startStr) - 1;
        const end = parseInt(endStr) - 1;
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(0, start); i <= Math.min(total - 1, end); i++) {
            pages.add(i);
          }
        }
      } else {
        const num = parseInt(entry) - 1;
        if (!isNaN(num) && num >= 0 && num < total) {
          pages.add(num);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const handlesTriggerPrint = async () => {
    setIsLoading(true);
    try {
      // 1. Determine which pages to print
      let targetPages: number[] = [];
      const total = metadata.page_count;

      if (pageRangeMode === 'all') {
        targetPages = Array.from({ length: total }, (_, i) => i);
      } else if (pageRangeMode === 'even') {
        targetPages = Array.from({ length: total }, (_, i) => i).filter(p => (p + 1) % 2 === 0);
      } else if (pageRangeMode === 'odd') {
        targetPages = Array.from({ length: total }, (_, i) => i).filter(p => (p + 1) % 2 !== 0);
      } else if (pageRangeMode === 'custom') {
        targetPages = parseRange(customRange, total);
      }

      if (targetPages.length === 0) {
        alert("No pages matched the selected range config.");
        setIsLoading(false);
        return;
      }

      // 2. Fetch images setup
      // Note: pageImages contains existing cache. If some aren't cached, we fetch them on backend.
      const imagesToPrint: string[] = [];
      for (const p of targetPages) {
        let src = pageImages[p];
        if (!src) {
          try {
            src = await invoke<string>("get_page_image", { pageIndex: p, scale: 1.5, docId: activeTabId });
          } catch (e) {
            console.error(`Failed to fetch and cache image for page ${p}:`, e);
            continue;
          }
        }
        imagesToPrint.push(src);
      }

      // 3. Create hidden iframe and print
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) throw new Error("Could not access iframe window");

      // Build HTML structure based on N-up configuration
      let htmlContent = `
        <html>
          <head>
            <title>Print Document</title>
            <style>
              body { margin: 0; padding: 0; }
              @media print {
                html, body { height: 100%; width: 100%; }
                .sheet {
                  page-break-after: always;
                  width: 210mm; /* A4 size for approximate preview */
                  height: 297mm;
                  display: grid;
                  gap: 1mm;
                  padding: 1mm;
                  box-sizing: border-box;
                }
                .sheet.grid-1 { grid-template-columns: 1fr; }
                .sheet.grid-2 { grid-template-columns: repeat(2, 1fr); align-content: center; }
                .sheet.grid-4 { grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); align-content: center; }
                img {
                  width: 100%;
                  height: auto;
                  max-height: 100%;
                  object-fit: contain;
                  border: 1px solid #eee;
                }
              }
            </style>
          </head>
          <body>
      `;

      // Group images into sheets
      for (let i = 0; i < imagesToPrint.length; i += nUp) {
        const sheetImages = imagesToPrint.slice(i, i + nUp);
        htmlContent += `<div class="sheet grid-${nUp}">`;
        for (const src of sheetImages) {
          htmlContent += `<img src="${src}" />`;
        }
        htmlContent += `</div>`;
      }

      htmlContent += `
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.parent.document.body.removeChild(window.frameElement);
              }, 100);
            }
          </script>
          </body>
        </html>
      `;

      doc.open();
      doc.write(htmlContent);
      doc.close();

      setIsLoading(false);
      onClose();
    } catch (error) {
      console.error("Advanced printing failed:", error);
      setIsLoading(false);
      alert("Print preparation failed.");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-noir-gray border border-white/10 rounded overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer size={14} className="text-signal-orange" />
              <h2 className="text-xs font-black tracking-widest uppercase text-white">Advanced Print Options</h2>
            </div>
            <button onClick={onClose} className="text-ghost-gray hover:text-white transition-all"><X size={16} /></button>
          </div>

          {/* Configuration Area */}
          <div className="p-4 space-y-4">
            {/* Range selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black tracking-wider text-ghost-gray uppercase flex items-center gap-1">
                <FileText size={12} /> Page Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['all', 'even', 'odd', 'custom'].map((mode) => (
                  <button 
                    key={mode} 
                    onClick={() => setPageRangeMode(mode as any)}
                    className={`p-2 border text-[10px] font-bold uppercase tracking-wider transition-all ${
                      pageRangeMode === mode ? 'bg-signal-orange/10 border-signal-orange text-signal-orange' : 'border-white/5 text-ghost-gray hover:border-white/20'
                    }`}
                  >
                    {mode === 'all' ? 'All Pages' : mode === 'even' ? 'Even Pages' : mode === 'odd' ? 'Odd Pages' : 'Custom'}
                  </button>
                ))}
              </div>

              {pageRangeMode === 'custom' && (
                <input 
                  type="text" 
                  value={customRange}
                  onChange={(e) => setCustomRange(e.target.value)}
                  placeholder="e.g. 1-3, 5, 8-10"
                  className="w-full bg-noir-black/50 border border-white/10 p-2 mt-2 text-xs text-white focus:outline-none focus:border-signal-orange transition-all"
                />
              )}
            </div>

            {/* N-up Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-black tracking-wider text-ghost-gray uppercase flex items-center gap-1">
                <LayoutGrid size={12} /> Pages Per Sheet (N-Up)
              </label>
              <div className="flex gap-2">
                {[1, 2, 4].map((n) => (
                  <button 
                    key={n} 
                    onClick={() => setNUp(n as any)}
                    className={`flex-1 p-2 border text-[10px] font-bold uppercase tracking-wider transition-all ${
                      nUp === n ? 'bg-signal-orange/10 border-signal-orange text-signal-orange' : 'border-white/5 text-ghost-gray hover:border-white/20'
                    }`}
                  >
                    {n === 1 ? '1 Page' : `${n} Pages`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer controls */}
          <div className="p-4 border-t border-white/5 bg-noir-black/30 flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-ghost-gray hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all">Cancel</button>
            <button 
              onClick={handlesTriggerPrint} 
              disabled={isLoading}
              className="pj-action-button h-8 px-6 disabled:opacity-50"
            >
              {isLoading ? "Preparing..." : "Print"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PrintModal;
