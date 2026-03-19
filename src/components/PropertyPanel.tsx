import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Type, AlignLeft, AlignCenter, AlignRight, Shield } from 'lucide-react';

interface PropertyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: any;
  onOCR: () => void;
  isLoading: boolean;
  selectedBlock: {
    font_name: string;
    font_size: number;
    text: string;
  } | null;
  onUpdateProperty: (key: string, value: any) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  isOpen,
  onClose,
  metadata,
  onOCR,
  isLoading,
  selectedBlock,
  onUpdateProperty
}) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && metadata && (
        <motion.aside 
          initial={{ x: 300, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }} 
          exit={{ x: 300, opacity: 0 }} 
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="w-[300px] bg-noir-gray border-l border-white/5 flex flex-col z-40 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-40">{t('properties.title')}</span>
            <button onClick={onClose} className="text-ghost-gray hover:text-signal-orange transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-6 space-y-10">
            {/* Character Section */}
            <div className={`space-y-4 transition-opacity ${!selectedBlock ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex items-center gap-2 opacity-50">
                <Type size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">{t('properties.character')}</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest opacity-30">{t('properties.font_family')}</label>
                <select 
                  value={selectedBlock?.font_name || ''}
                  onChange={(e) => onUpdateProperty('font_name', e.target.value)}
                  className="w-full bg-noir-black border border-white/10 px-4 py-3 text-[11px] font-bold appearance-none focus:border-signal-orange outline-none transition-all uppercase tracking-tighter cursor-pointer"
                >
                  <option value={selectedBlock?.font_name}>{selectedBlock?.font_name || 'Select Font'}</option>
                  <option value="Inter">Inter Display Bold</option>
                  <option value="JetBrains Mono">JetBrains Mono</option>
                  <option value="Bebas Neue">Bebas Neue</option>
                  <option value="Roboto">Roboto Brutal</option>
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest opacity-30">{t('properties.size')}</label>
                  <input 
                    type="number" 
                    value={Math.round(selectedBlock?.font_size || 12)} 
                    onChange={(e) => onUpdateProperty('font_size', parseInt(e.target.value))}
                    className="w-full bg-noir-black border border-white/10 px-4 py-3 text-[11px] font-bold focus:border-signal-orange outline-none transition-all" 
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest opacity-30">{t('properties.color')}</label>
                  <div className="flex items-center gap-3 bg-noir-black border border-white/10 px-4 py-3 cursor-pointer group">
                    <div className="w-4 h-4 bg-signal-orange group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-mono opacity-40">#FF5F1F</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-[1px] bg-white/5" />

            {/* Paragraph Section */}
            <div className={`space-y-4 transition-opacity ${!selectedBlock ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex items-center gap-2 opacity-50">
                <AlignCenter size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">{t('properties.paragraph')}</span>
              </div>
              
              <div className="flex bg-noir-black border border-white/10 p-1">
                {[AlignLeft, AlignCenter, AlignRight].map((Icon, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => onUpdateProperty('alignment', idx)}
                    className={`flex-1 flex justify-center py-3 hover:bg-white/5 transition-all ${idx === 0 ? "text-signal-orange" : "opacity-30"}`}
                  >
                    <Icon size={16} />
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[1px] bg-white/5" />

            {/* Advanced AI / OCR Section */}
            <div className="space-y-4 pt-4">
               <div className="flex items-center gap-2 opacity-20">
                  <Shield size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">SYSTEM_INTELLIGENCE</span>
               </div>
               <button 
                 onClick={onOCR}
                 disabled={isLoading}
                 className={`pj-action-button w-full h-12 relative group overflow-hidden ${isLoading ? 'cursor-wait opacity-80' : ''}`}
               >
                  <span className="relative z-10">{isLoading ? t('properties.processing') : t('actions.ocr')}</span>
                  {isLoading && (
                    <motion.div 
                      initial={{ left: '-100%' }}
                      animate={{ left: '100%' }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent z-20"
                    />
                  )}
                  <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
               </button>
            </div>
          </div>

          <div className="p-6 border-t border-white/5 bg-noir-black/40">
             <div className="flex flex-col gap-1 opacity-20">
                <span className="text-[8px] font-black tracking-widest uppercase">{t('properties.uuid')}</span>
                <span className="text-[9px] font-mono">X-QUANTUM-7A29-8B1C-OVAL</span>
             </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default PropertyPanel;
