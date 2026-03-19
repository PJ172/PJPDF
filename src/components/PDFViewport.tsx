import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, FileText } from 'lucide-react';
import ReflowOverlay from './ReflowOverlay';

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

interface PDFViewportProps {
  isLoading: boolean;
  isSyncing: boolean;
  metadata: any;
  pageImage: string | null;
  pageSize: PageSize | null;
  currentPage: number;
  zoom: number;
  onZoom: (delta: number) => void;
  onOpen: () => void;
  textBlocks: TextBlock[];
  onUpdateText: (index: number, newText: string) => Promise<void>;
  selectedBlockIndex: number | null;
  setSelectedBlockIndex: (index: number | null) => void;
  isEditTextEnabled: boolean;
}

const PDFViewport: React.FC<PDFViewportProps> = ({
  isLoading,
  isSyncing,
  metadata,
  pageImage,
  pageSize,
  currentPage,
  zoom,
  onZoom,
  onOpen,
  textBlocks,
  onUpdateText,
  selectedBlockIndex,
  setSelectedBlockIndex,
  isEditTextEnabled
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-noir-black">
      {/* Zoom Controls Overlay */}
      <div className="absolute bottom-10 right-10 z-50 flex items-center bg-noir-gray border border-white/5 p-1 shadow-2xl">
        <button onClick={() => onZoom(-0.1)} className="p-3 hover:bg-white/5 text-ghost-gray hover:text-white"><ZoomOut size={16} /></button>
        <div className="w-16 text-center text-[11px] font-black tracking-tighter text-signal-orange">
          {Math.round(zoom * 100)}%
        </div>
        <button onClick={() => onZoom(0.1)} className="p-3 hover:bg-white/5 text-ghost-gray hover:text-white"><ZoomIn size={16} /></button>
      </div>

      {/* Rulers (Quantum Noir Style) */}
      <div className="h-4 w-full bg-noir-gray border-b border-white/5 flex items-end">
        <div className="flex-1 h-full flex items-end px-4 gap-8">
           {[...Array(15)].map((_, i) => (
             <div key={i} className="w-[1px] h-1.5 bg-white/20 relative">
               <span className="absolute -bottom-1 -left-1 text-[7px] font-mono opacity-20">{i * 50}</span>
             </div>
           ))}
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="w-4 h-full bg-noir-gray border-r border-white/5 flex flex-col items-end pt-4 gap-8">
           {[...Array(15)].map((_, i) => (
             <div key={i} className="h-[1px] w-1.5 bg-white/20 relative">
               <span className="absolute -right-1 -top-1 text-[7px] font-mono opacity-20">{i * 50}</span>
             </div>
           ))}
        </div>

        {/* Main Canvas Area */}
        <main className="pj-viewport scrollbar-hide">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="flex items-center justify-center p-20"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-0.5 bg-white/10 relative overflow-hidden">
                    <motion.div 
                      animate={{ x: [-48, 48] }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="absolute inset-0 w-full h-full bg-signal-orange"
                    />
                  </div>
                  <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-40">{t('messages.rendering')}</span>
                </div>
              </motion.div>
            ) : metadata ? (
              <motion.div 
                key={currentPage}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="pj-pdf-canvas bg-white relative"
                style={{ width: 'fit-content', height: 'fit-content' }}
              >
                {pageImage && (
                  <div className="relative">
                    <img 
                      src={pageImage} 
                      alt={`Page ${currentPage + 1}`}
                      className="max-w-none shadow-2xl"
                      style={{ zoom: 1/window.devicePixelRatio }}
                    />
                    
                    {/* Reflow Editor Overlay */}
                    {isEditTextEnabled && (
                      <ReflowOverlay 
                        textBlocks={textBlocks}
                        pageSize={pageSize}
                        zoom={zoom}
                        currentPage={currentPage}
                        onUpdateText={onUpdateText}
                        isUpdating={isSyncing}
                        selectedIndex={selectedBlockIndex}
                        onSelect={setSelectedBlockIndex}
                      />
                    )}
                  </div>
                )}
              </motion.div>

            ) : (
              <div className="flex flex-col items-center justify-center opacity-40 gap-6 mt-40">
                 <div className="relative">
                    <FileText size={100} strokeWidth={0.5} className="text-white" />
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1] }} 
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -top-2 -right-2 w-4 h-4 bg-signal-orange"
                    />
                 </div>
                 <div className="flex flex-col items-center gap-1">
                    <span className="text-[11px] font-black tracking-[0.5em] uppercase text-white">{t('messages.no_doc_loaded')}</span>
                    <span className="text-[9px] font-mono opacity-50 tracking-tighter">INITIALIZE_FILE_STREAM_REQUIRED</span>
                 </div>
                 <button onClick={onOpen} className="pj-action-button mt-4 px-10 h-10 shadow-2xl">
                   {t('messages.select_pdf')}
                 </button>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default PDFViewport;
