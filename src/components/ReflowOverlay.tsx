import React, { useRef, useEffect } from 'react';
import { Type, Check, X } from 'lucide-react';

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

interface ReflowOverlayProps {
  textBlocks: TextBlock[];
  pageSize: PageSize | null;
  zoom: number;
  currentPage: number;
  onUpdateText: (index: number, newText: string) => Promise<void>;
  isUpdating: boolean;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
}

const ReflowOverlay: React.FC<ReflowOverlayProps> = ({
  textBlocks,
  pageSize,
  zoom,
  currentPage,
  onUpdateText,
  isUpdating,
  selectedIndex,
  onSelect
}) => {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [tempText, setTempText] = React.useState('');
  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingIndex !== null && editRef.current) {
      editRef.current.focus();
      // Place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editingIndex]);

  if (!pageSize) return null;

  const handleStartEdit = (index: number, text: string) => {
    setEditingIndex(index);
    setTempText(text);
    onSelect(index); // Ensure it's also selected when editing starts
  };

  const handleCommit = async () => {
    if (editingIndex !== null) {
      const newText = editRef.current?.innerText || '';
      if (newText !== textBlocks[editingIndex].text) {
        await onUpdateText(editingIndex, newText);
      }
      setEditingIndex(null);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
  };

  const handleClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (editingIndex === index) return;
    
    if (selectedIndex === index) {
      // If already selected, double click or second click enters edit mode?
      // For now, let's keep it simple: click to select, click again to edit if already selected?
      // Or just click to select. Edit is separate.
      handleStartEdit(index, textBlocks[index].text);
    } else {
      onSelect(index);
    }
  };

  return (
    <div 
      className="absolute inset-0 pointer-events-none overflow-hidden"
      onClick={() => onSelect(null)} // Clear selection when clicking empty area
      style={{ 
        width: pageSize.width * zoom, 
        height: pageSize.height * zoom 
      }}
    >
      {textBlocks.map((block, idx) => {
        // PDFium (0,0) is bottom-left. CSS (0,0) is top-left.
        const left = block.x * zoom;
        const top = (pageSize.height - block.y - block.height) * zoom;
        const width = block.width * zoom;
        const height = block.height * zoom;

        const isEditing = editingIndex === idx;
        const isSelected = selectedIndex === idx;

        return (
          <div 
            key={`${currentPage}-${idx}`}
            className={`absolute border transition-all pointer-events-auto cursor-text ${
              isEditing 
                ? 'z-50 ring-2 ring-signal-orange ring-offset-2 ring-offset-noir-black shadow-2xl border-transparent' 
                : isSelected
                  ? 'border-signal-orange bg-signal-orange/10 z-40'
                  : 'border-transparent hover:border-signal-orange/30 hover:bg-signal-orange/5 group/reflow'
            }`}
            style={{
              left,
              top,
              width: Math.max(width, 20),
              height: Math.max(height, 10),
            }}
            onClick={(e) => handleClick(e, idx)}
          >
            {isEditing ? (
              <div className="absolute inset-0 bg-white">
                <div 
                  ref={editRef}
                  contentEditable
                  className="w-full h-full p-0.5 text-noir-black outline-none whitespace-pre-wrap break-words"
                  style={{
                    fontSize: block.font_size * zoom,
                    lineHeight: 1.1,
                    fontFamily: 'sans-serif', // Fallback
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleCommit();
                    }
                    if (e.key === 'Escape') {
                      handleCancel();
                    }
                  }}
                  suppressContentEditableWarning
                >
                  {tempText}
                </div>
                
                {/* Edit Controls */}
                <div className="absolute -bottom-8 right-0 flex bg-noir-black border border-white/10 shadow-xl overflow-hidden">
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleCommit(); }}
                     className="p-1.5 hover:bg-signal-orange hover:text-noir-black text-signal-orange transition-colors"
                   >
                     <Check size={14} />
                   </button>
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                     className="p-1.5 hover:bg-white/10 text-ghost-gray transition-colors border-l border-white/5"
                   >
                     <X size={14} />
                   </button>
                </div>

                <div className="absolute -top-6 left-0 flex items-center gap-2 bg-signal-orange px-2 py-0.5">
                   <Type size={10} className="text-noir-black" />
                   <span className="text-[9px] font-black text-noir-black uppercase tracking-widest">
                     Editing: {block.font_name}
                   </span>
                </div>
              </div>
            ) : (
              <div className="opacity-0 group-hover/reflow:opacity-100 absolute -top-4 left-0 bg-noir-black text-[7px] font-black text-signal-orange px-1 uppercase whitespace-nowrap">
                {block.font_name} :: {Math.round(block.font_size)}pt
              </div>
            )}
          </div>
        );
      })}

      {isUpdating && (
        <div className="absolute inset-0 bg-noir-black/20 backdrop-blur-[1px] flex items-center justify-center z-[100]">
           <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-0.5 bg-white/10 relative overflow-hidden">
                <div className="absolute inset-0 w-full h-full bg-signal-orange animate-progress" />
              </div>
              <span className="text-[8px] font-black tracking-widest text-white uppercase opacity-50">Syncing Stream...</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default ReflowOverlay;
