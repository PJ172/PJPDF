import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ChevronLeft,
  Globe,
  Type,
  RotateCw,
  RotateCcw,
  Scissors,
  Layers,
  CheckCircle2
} from 'lucide-react';


interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  metadata: any;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  thumbnails: string[];
  isEditTextEnabled: boolean;
  onToggleEditText: () => void;
  onRotate: (page: number, deg: number) => void;
  onSplit: (page: number) => void;
  onMerge: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
  metadata,
  currentPage,
  setCurrentPage,
  onReorder,
  thumbnails,
  isEditTextEnabled,
  onToggleEditText,
  onRotate,
  onSplit,
  onMerge
}) => {
  const { t, i18n } = useTranslation();
  const [draggedItemIndex, setDraggedItemIndex] = React.useState<number | null>(null);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'vi' : 'en');
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedItemIndex !== null && draggedItemIndex !== targetIndex) {
      onReorder(draggedItemIndex, targetIndex);
    }
    setDraggedItemIndex(null);
  };

  return (
    <aside className={`flex flex-col bg-noir-gray border-r border-white/5 transition-all duration-500 ease-in-out ${isOpen ? 'w-64' : 'w-16'}`}>
      {/* Brand / Toggle */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-white/5">
        {isOpen && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-signal-orange animate-pulse" />
            <span className="text-xs font-black tracking-widest uppercase">{t('app.name')}</span>
          </div>
        )}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`p-1.5 hover:bg-white/5 transition-colors ${!isOpen ? 'mx-auto' : ''}`}
        >
          <ChevronLeft size={16} className={`transition-transform duration-500 ${!isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      
      {/* Sticky Tools inside Sidebar when Open */}
      {isOpen && metadata && (
        <div className="p-4 border-b border-white/5 space-y-3 bg-noir-gray/50 backdrop-blur-sm">
            {/* Edit Text Toggle */}
            <button 
              onClick={onToggleEditText}
              className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 border transition-all text-xs font-black tracking-widest uppercase ${
                isEditTextEnabled 
                  ? 'bg-signal-orange/10 border-signal-orange text-signal-orange shadow-[0_0_15px_rgba(255,95,31,0.15)]' 
                  : 'border-white/10 text-ghost-gray hover:border-white/30 hover:text-white'
              }`}
            >
              {isEditTextEnabled ? <CheckCircle2 size={16} /> : <Type size={16} />}
              <span>{isEditTextEnabled ? t('toolbar.editing_text', 'EDITING_TEXT') : t('toolbar.edit_text', 'EDIT_TEXT')}</span>
            </button>

            {/* Page Actions Grid */}
            <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => onRotate(currentPage, -90)} 
                  className="flex flex-col items-center justify-center p-2 hover:bg-white/5 text-ghost-gray hover:text-white rounded border border-white/5 transition-all gap-1"
                  title="Rotate 90° Counter-Clockwise"
                >
                  <RotateCcw size={14} className="text-signal-orange" strokeWidth={3} />
                  <span className="text-[9px] font-black uppercase tracking-wider">{t('actions.rotate_left', 'LEFT')}</span>
                </button>
                <button 
                  onClick={() => onRotate(currentPage, 90)} 
                  className="flex flex-col items-center justify-center p-2 hover:bg-white/5 text-ghost-gray hover:text-white rounded border border-white/5 transition-all gap-1"
                  title="Rotate 90° Clockwise"
                >
                  <RotateCw size={14} className="text-signal-orange" strokeWidth={3} />
                  <span className="text-[9px] font-black uppercase tracking-wider">{t('actions.rotate_right', 'RIGHT')}</span>
                </button>
                <button 
                  onClick={() => onSplit(currentPage)} 
                  className="flex flex-col items-center justify-center p-2 hover:bg-white/5 text-ghost-gray hover:text-white rounded border border-white/5 transition-all gap-1"
                  title="Split this page to a new file"
                >
                  <Scissors size={14} className="text-signal-orange" />
                  <span className="text-[9px] font-black uppercase tracking-wider">{t('actions.split', 'SPLIT')}</span>
                </button>
                <button 
                  onClick={onMerge} 
                  className="flex flex-col items-center justify-center p-2 hover:bg-white/5 text-ghost-gray hover:text-white rounded border border-white/5 transition-all gap-1"
                  title="Merge open files"
                >
                  <Layers size={14} className="text-signal-orange" />
                  <span className="text-[9px] font-black uppercase tracking-wider">{t('actions.merge', 'MERGE')}</span>
                </button>
            </div>
        </div>
      )}

      {/* Primary Navigation (Always thumbnails list) */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden pt-4">
        {isOpen && metadata && (
          <div className="px-4 py-2 flex-1 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between py-2 opacity-40">
                <span className="text-[9px] font-black tracking-[0.2em] uppercase">{t('sidebar.navigation', 'PAGES')}</span>
                <span className="text-[9px] font-mono">{metadata?.page_count || 0} PG</span>
              </div>
              
              <div className="grid gap-4 pb-8">
                {thumbnails.map((thumb, i) => (
                  <div 
                    key={i} 
                    onClick={() => setCurrentPage(i)}
                    draggable={isOpen}
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, i)}
                    onDragEnd={() => setDraggedItemIndex(null)}
                    className={`aspect-[3/4] bg-noir-black border transition-all duration-300 group relative overflow-hidden cursor-pointer ${
                      currentPage === i ? "border-signal-orange shadow-[0_0_15px_rgba(255,95,31,0.1)]" : "border-white/5 hover:border-white/20"
                    } ${draggedItemIndex === i ? "opacity-40 scale-95 border-dashed border-signal-orange" : ""}`}
                  >
                    {thumb ? (
                      <>
                        <img 
                          src={thumb} 
                          className="w-full h-full object-contain opacity-60 group-hover:opacity-100 transition-opacity" 
                          alt={`Page ${i+1}`} 
                          draggable={false}
                        />
                        
                        {/* Page Number Badge */}
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-noir-black/80 border border-white/10 rounded text-[8px] font-black tracking-widest text-signal-orange backdrop-blur-sm shadow-lg pointer-events-none">
                          PG {i + 1}
                        </div>
                        
                        <span className="absolute bottom-2 right-2 text-[9px] font-mono opacity-20 pointer-events-none">{i + 1}</span>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-4 h-4 border border-white/10 border-t-signal-orange animate-spin rounded-full" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {isOpen && !metadata && (
          <div className="text-[10px] opacity-20 text-center py-12 italic">{t('sidebar.no_doc', 'No document')}</div>
        )}
      </nav>


      {/* Footer Controls (Simplified) */}
      <div className="p-4 border-t border-white/5">
        <button 
          onClick={toggleLanguage}
          className={`flex items-center gap-3 w-full p-2 hover:bg-white/5 text-ghost-gray hover:text-white transition-all ${!isOpen ? 'justify-center' : ''}`}
          title="Switch Language"
        >
          <Globe size={16} className={isOpen ? 'text-signal-orange' : ''} />
          {isOpen && <span className="text-[10px] font-bold uppercase tracking-widest">{i18n.language.toUpperCase()}</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
