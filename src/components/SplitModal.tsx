import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Scissors } from 'lucide-react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: { page_count: number; title: string } | null;
  activeTabId: string | null;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const SplitModal: React.FC<SplitModalProps> = ({
  isOpen,
  onClose,
  metadata,
  activeTabId,
  setToast
}) => {
  const [splitMode, setSplitMode] = useState<'range' | 'every_n'>('range');
  const [rangeValue, setRangeValue] = useState('');
  const [nValue, setNValue] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !metadata) return null;

  const handleSplitRange = async () => {
    if (!rangeValue.trim()) {
      alert("Please enter a valid page range.");
      return;
    }

    try {
      const path = await save({
        filters: [{ name: "PDF", extensions: ["pdf"] }],
        defaultPath: "split_document.pdf"
      });

      if (path) {
        setIsLoading(true);
        await invoke("split_pdf_range", { 
          range: rangeValue, 
          path, 
          docId: activeTabId 
        });
        setToast({ message: "File split successfully!", type: 'success' });
        setIsLoading(false);
        onClose();
      }
    } catch (error) {
      console.error("Failed to split range:", error);
      setIsLoading(false);
      setToast({ message: "Split failed.", type: 'error' });
    }
  };

  const handleSplitEveryN = async () => {
    if (nValue <= 0 || nValue >= metadata.page_count) {
      alert(`Please enter a valid number between 1 and ${metadata.page_count - 1}.`);
      return;
    }

    try {
      // For batch split, ask for Directory
      const dir = await open({
        directory: true,
        multiple: false
      });

      if (dir && typeof dir === "string") {
        setIsLoading(true);
        const pagesCount = metadata.page_count;
        const separator = dir.includes('\\') ? '\\' : '/';

        for (let i = 0; i < pagesCount; i += nValue) {
          const start = i + 1;
          const end = Math.min(i + nValue, pagesCount);
          const range = `${start}-${end}`;
          const outputPath = `${dir}${separator}split_${start}-${end}.pdf`;

          await invoke("split_pdf_range", { 
            range, 
            path: outputPath, 
            docId: activeTabId 
          });
        }

        setToast({ message: "Batch split completed successfully!", type: 'success' });
        setIsLoading(false);
        onClose();
      }
    } catch (error) {
      console.error("Failed to batch split:", error);
      setIsLoading(false);
      setToast({ message: "Batch split failed.", type: 'error' });
    }
  };

  const handleConfirm = () => {
    if (splitMode === 'range') {
      handleSplitRange();
    } else {
      handleSplitEveryN();
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
              <Scissors size={14} className="text-signal-orange" />
              <h2 className="text-xs font-black tracking-widest uppercase text-white">Advanced Split Options</h2>
            </div>
            <button onClick={onClose} className="text-ghost-gray hover:text-white transition-all"><X size={16} /></button>
          </div>

          {/* Mode Selector */}
          <div className="p-4 flex items-center gap-2 border-b border-white/5 bg-noir-black/20">
            <button 
              onClick={() => setSplitMode('range')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 border text-[10px] font-bold uppercase tracking-wider transition-all ${
                splitMode === 'range' ? 'bg-signal-orange/10 border-signal-orange text-signal-orange' : 'border-white/5 text-ghost-gray hover:border-white/20'
              }`}
            >
              Custom Range
            </button>
            <button 
              onClick={() => setSplitMode('every_n')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 border text-[10px] font-bold uppercase tracking-wider transition-all ${
                splitMode === 'every_n' ? 'bg-signal-orange/10 border-signal-orange text-signal-orange' : 'border-white/5 text-ghost-gray hover:border-white/20'
              }`}
            >
              Split Every N
            </button>
          </div>

          {/* Content Area */}
          <div className="p-4 space-y-4">
            {splitMode === 'range' ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-wider text-ghost-gray uppercase">Page Range</label>
                <input 
                  type="text" 
                  value={rangeValue}
                  onChange={(e) => setRangeValue(e.target.value)}
                  placeholder="e.g. 1-3, 5, 8-10"
                  className="w-full bg-noir-black/50 border border-white/10 p-2 text-xs text-white placeholder-ghost-gray/30 focus:outline-none focus:border-signal-orange transition-all"
                />
                <span className="text-[9px] opacity-40 italic">Example: "1-3" splits pages 1 to 3 to a separate document. Total: {metadata.page_count} Pages</span>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-wider text-ghost-gray uppercase">Split every N Pages</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min={1}
                    max={metadata.page_count - 1}
                    value={nValue}
                    onChange={(e) => setNValue(parseInt(e.target.value) || 1)}
                    className="flex-1 bg-noir-black/50 border border-white/10 p-2 text-xs text-white focus:outline-none focus:border-signal-orange transition-all"
                  />
                  <span className="text-xs text-ghost-gray">Pages</span>
                </div>
                <span className="text-[9px] opacity-40 italic">Files will be saved into selected directory automatically. Total: {metadata.page_count} Pages</span>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t border-white/5 bg-noir-black/30 flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-ghost-gray hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all">Cancel</button>
            <button 
              onClick={handleConfirm} 
              disabled={isLoading}
              className="pj-action-button h-8 px-5 disabled:opacity-50"
            >
              {isLoading ? "Processing..." : "Split File"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SplitModal;
