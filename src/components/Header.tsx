import React from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Square, X, Search, Download, Upload, Printer } from 'lucide-react';

interface HeaderProps {
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onPrint: () => void;
}

const Header: React.FC<HeaderProps> = ({
  onMinimize,
  onMaximize,
  onClose,
  onOpen,
  onSave,
  onSaveAs,
  onPrint
}) => {
  const { t } = useTranslation();

  return (
    <header data-tauri-drag-region className="h-16 bg-noir-black border-b border-white/5 flex items-center justify-between px-6 z-40">
      <div className="flex items-center gap-8 pointer-events-none">
         {/* Title removed */}


         {/* Contextual Actions in Header */}
         <div className="flex items-center gap-4 pointer-events-auto">
            <button onClick={onOpen} className="pj-action-button h-8 px-4">
              <Upload size={14} />
              <span>{t('actions.open')}</span>
            </button>
            <div className="flex items-center gap-2">
              <button onClick={onSave} className="flex items-center gap-2 text-ghost-gray hover:text-white transition-all px-2" title="Ctrl+S">
                <Download size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{t('actions.save')}</span>
              </button>
              <button onClick={onSaveAs} className="flex items-center gap-2 text-ghost-gray/60 hover:text-white transition-all px-2 border-l border-white/5">
                <span className="text-[9px] font-bold uppercase tracking-widest">{t('actions.save_as')}</span>
              </button>
              
              <button 
                onClick={onPrint} 
                className="flex items-center gap-1.5 hover:bg-white/5 text-ghost-gray hover:text-white transition-all px-3 py-1 rounded border border-white/5 hover:border-white/20 ml-2"
                title="Print viewport content"
              >
                <Printer size={14} className="text-signal-orange" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{t('actions.print', 'PRINT')}</span>
              </button>
            </div>
            <div className="w-[1px] h-4 bg-white/10" />
            <button className="text-ghost-gray hover:text-white transition-all">
              <Search size={16} />
            </button>
         </div>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={onMinimize} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 transition-colors">
          <Minus size={14} />
        </button>
        <button onClick={onMaximize} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 transition-colors">
          <Square size={12} />
        </button>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-red-600 transition-colors group">
          <X size={14} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </header>
  );
};

export default Header;
