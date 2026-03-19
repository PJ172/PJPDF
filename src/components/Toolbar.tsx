import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  RotateCw, 
  Scissors, 
  Layers, 
  Type, 
  CheckCircle2,
  Trash2
} from 'lucide-react';

interface ToolbarProps {
  currentPage: number;
  onRotate: (page: number, deg: number) => void;
  onSplit: (page: number) => void;
  onMerge: () => void;
  onDelete: (page: number) => void;
  isEditTextEnabled: boolean;
  onToggleEditText: () => void;
  metadata: any;
}

const Toolbar: React.FC<ToolbarProps> = ({
  currentPage,
  onRotate,
  onSplit,
  onMerge,
  onDelete,
  isEditTextEnabled,
  onToggleEditText,
  metadata
}) => {
  const { t } = useTranslation();

  if (!metadata) return null;

  return (
    <div className="h-12 bg-noir-black border-b border-white/5 flex items-center justify-between px-6 z-30">
      <div className="flex items-center gap-2">
        {/* Page Operations Group */}
        <div className="flex items-center border-r border-white/5 pr-4 mr-2 gap-1">
          <span className="text-[9px] font-black tracking-widest uppercase opacity-40 mr-2">PAGE {currentPage + 1}</span>
          
          <button 
            onClick={() => onRotate(currentPage, 90)}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 text-ghost-gray hover:text-white transition-all text-xs font-bold uppercase tracking-wider"
            title="Rotate 90° Clockwise"
          >
            <RotateCw size={14} className="text-signal-orange" />
            <span>{t('actions.rotate', 'Rotate')}</span>
          </button>

          <button 
            onClick={() => onSplit(currentPage)}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 text-ghost-gray hover:text-white transition-all text-xs font-bold uppercase tracking-wider"
            title="Extract this page to a new file"
          >
            <Scissors size={14} className="text-signal-orange" />
            <span>{t('actions.split', 'Split')}</span>
          </button>

          <button 
            onClick={() => onDelete(currentPage)}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-red-600/10 text-ghost-gray hover:text-red-500 transition-all text-xs font-bold uppercase tracking-wider"
            title="Delete this page"
          >
            <Trash2 size={14} className="text-red-500" />
            <span>{t('actions.delete', 'Delete')}</span>
          </button>
        </div>


        {/* Global Operations Group */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onMerge}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 text-ghost-gray hover:text-white transition-all text-xs font-bold uppercase tracking-wider"
            title="Merge open files"
          >
            <Layers size={14} className="text-signal-orange" />
            <span>{t('actions.merge', 'Merge')}</span>
          </button>
        </div>
      </div>

      {/* Editor Toggles */}
      <div className="flex items-center gap-2">
        <button 
          onClick={onToggleEditText}
          className={`flex items-center gap-2 px-4 py-1.5 border transition-all text-xs font-black tracking-widest uppercase ${
            isEditTextEnabled 
              ? 'bg-signal-orange/10 border-signal-orange text-signal-orange shadow-[0_0_15px_rgba(255,95,31,0.15)]' 
              : 'border-white/10 text-ghost-gray hover:border-white/30 hover:text-white'
          }`}
        >
          {isEditTextEnabled ? <CheckCircle2 size={14} /> : <Type size={14} />}
          <span>{isEditTextEnabled ? t('toolbar.editing_text', 'EDITING_TEXT') : t('toolbar.edit_text', 'EDIT_TEXT')}</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
