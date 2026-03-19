import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

interface MergeItem {
  id: string; // File path
  name: string;
  page_count: number;
}

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTabs: { id: string; metadata: { page_count: number; title: string } }[];
  onConfirmMerge: (paths: string[]) => void;
}

const MergeModal: React.FC<MergeModalProps> = ({
  isOpen,
  onClose,
  initialTabs,
  onConfirmMerge
}) => {
  const [items, setItems] = useState<MergeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Map initial tabs to MergeItems
      setItems(initialTabs.map(t => ({
        id: t.id,
        name: t.id.split('\\').pop() || t.id.split('/').pop() || 'Untitled',
        page_count: t.metadata.page_count
      })));
    }
  }, [isOpen, initialTabs]);

  const handleAddFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });

      if (selected && Array.isArray(selected)) {
        setIsLoading(true);
        const newItems: MergeItem[] = [];
        
        for (const path of selected) {
          if (items.find(i => i.id === path)) continue; // Skip duplicates
          
          const meta = await invoke<{ page_count: number }>("open_pdf", { path });
          newItems.push({
            id: path,
            name: path.split('\\').pop() || path.split('/').pop() || 'Untitled',
            page_count: meta.page_count
          });
        }
        
        setItems(prev => [...prev, ...newItems]);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to add files for merge:", error);
      setIsLoading(false);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const newItems = [...items];
    const [movedItem] = newItems.splice(index, 1);
    newItems.splice(newIndex, 0, movedItem);
    setItems(newItems);
  };

  const handleRemove = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleMerge = () => {
    if (items.length < 2) {
      alert("You need at least 2 files to merge.");
      return;
    }
    onConfirmMerge(items.map(i => i.id));
    onClose();
  };

  if (!isOpen) return null;

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
          className="relative w-full max-w-2xl bg-noir-gray border border-white/10 rounded overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-signal-orange" />
              <h2 className="text-xs font-black tracking-widest uppercase text-white">Advanced Merge Wizard</h2>
            </div>
            <button onClick={onClose} className="text-ghost-gray hover:text-white transition-all"><X size={16} /></button>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 opacity-30 gap-2">
                <FileText size={40} strokeWidth={1} />
                <span className="text-[10px] font-bold uppercase tracking-widest">No files listed</span>
              </div>
            ) : (
              items.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-noir-black/50 border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-1.5 bg-signal-orange/10 rounded">
                      <FileText size={16} className="text-signal-orange" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold text-white truncate max-w-[340px]">{item.name}</span>
                      <span className="text-[9px] font-mono opacity-50">{item.page_count} Pages</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleMove(index, 'up')} 
                      disabled={index === 0}
                      className="p-1.5 text-ghost-gray hover:text-white disabled:opacity-20 transition-all hover:bg-white/5"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button 
                      onClick={() => handleMove(index, 'down')} 
                      disabled={index === items.length - 1}
                      className="p-1.5 text-ghost-gray hover:text-white disabled:opacity-20 transition-all hover:bg-white/5"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <div className="w-[1px] h-4 bg-white/10 mx-1" />
                    <button 
                      onClick={() => handleRemove(item.id)} 
                      className="p-1.5 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t border-white/5 bg-noir-black/30 flex items-center justify-between">
            <button 
              onClick={handleAddFiles} 
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-white/10 hover:border-white/30 text-ghost-gray hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
            >
              <Plus size={14} />
              <span>{isLoading ? "Loading..." : "Add File from PC"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-4 py-1.5 text-ghost-gray hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all">Cancel</button>
              <button 
                onClick={handleMerge} 
                disabled={items.length < 2 || isLoading}
                className="pj-action-button h-8 px-5 disabled:opacity-50 disabled:pointer-events-none"
              >
                Merge Files
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MergeModal;
